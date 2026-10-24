/**
 * Client Playbook routes — admin-only operator playbook generator.
 * NEVER exposed to clients. Every route requires admin role.
 *
 * POST /api/admin/clients/:id/playbook          — generate (or regenerate) playbook
 * GET  /api/admin/clients/:id/playbook          — latest version
 * GET  /api/admin/clients/:id/playbook/all      — all versions (newest first)
 * PATCH /api/admin/clients/:id/playbook/:pbId   — edit content / admin notes
 * POST  /api/admin/clients/:id/playbook/:pbId/final — mark final
 *
 * Also accessible from the intake detail:
 * POST /api/admin/intakes/:id/playbook          — generate from intake context
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, type AuthedRequest } from "../lib/auth";
import { generateClientPlaybook, type PlaybookInput } from "../lib/llm";
import { sanitiseText, sanitiseShortText } from "../lib/sanitize";

const router = Router();
router.use(withUser, requireAdmin);

// ── Build the LLM input from a client + optional intake ─────────────────────

async function buildPlaybookInput(clientId: string, intakeId?: string): Promise<PlaybookInput | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: true },
  });
  if (!client) return null;

  const intake = intakeId
    ? await prisma.intake.findUnique({ where: { id: intakeId } })
    : await prisma.intake.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" } });

  const answers: Record<string, unknown> = intake?.answers
    ? (() => { try { return JSON.parse(intake.answers) as Record<string, unknown>; } catch { return {}; } })()
    : {};

  return {
    clientName: client.user.name ?? intake?.name ?? "Client",
    role:       sanitiseShortText(String(answers.role ?? client.roleTitle ?? "business owner")),
    industry:   sanitiseShortText(String(answers.industry ?? client.industry ?? "unknown")),
    bizSize:    String(answers.bizSize ?? client.size ?? "solo"),
    areas:      (() => { try { return JSON.parse(client.areas) as string[]; } catch { return []; } })(),
    aiComfort:  intake?.aiComfort ?? client.aiLevel ?? 1,
    hoursLost:  intake?.hoursLost ?? 10,
    helpStyle:  intake?.helpStyle ?? client.helpStyle ?? "not_sure",
    toolBudget: intake?.toolBudget ?? undefined,
    currentSoftware: intake?.currentSoftware ? sanitiseText(intake.currentSoftware, 300) : undefined,
    weeklyVolumes: intake?.weeklyVolumes ?? undefined,
    timeSinks:  (() => { try { return JSON.parse(String(answers.timeSinks ?? "[]")) as string[]; } catch { return []; } })(),
    automateFirst: answers.automateFirst ? sanitiseShortText(String(answers.automateFirst)) : undefined,
    freeText:   answers.freeText ? sanitiseText(String(answers.freeText)) : undefined,
    tier:       client.tier,
    vertical:   client.industry ?? "unknown",
    adminNotes: client.notes ? sanitiseText(client.notes) : undefined,
  };
}

// ── Generate playbook ─────────────────────────────────────────────────────────

router.post("/admin/clients/:id/playbook", async (req, res) => {
  const clientId = req.params.id as string;
  const { intakeId } = req.body as { intakeId?: string };

  const input = await buildPlaybookInput(clientId, intakeId);
  if (!input) { res.status(404).json({ error: "Client not found." }); return; }

  const content = await generateClientPlaybook(input);

  // Increment version
  const latestVersion = await prisma.clientPlaybook.findFirst({
    where: { clientId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latestVersion?.version ?? 0) + 1;

  const playbook = await prisma.clientPlaybook.create({
    data: {
      clientId,
      intakeId: intakeId ?? null,
      version,
      status: "draft",
      content: JSON.stringify(content),
      source: content.source,
    },
  });
  res.status(201).json(playbook);
});

// Generate from intake context
router.post("/admin/intakes/:id/playbook", async (req, res) => {
  const intake = await prisma.intake.findUnique({ where: { id: req.params.id as string } });
  if (!intake) { res.status(404).json({ error: "Intake not found." }); return; }
  if (!intake.clientId) { res.status(422).json({ error: "Intake has not been claimed to a client yet." }); return; }

  const input = await buildPlaybookInput(intake.clientId, intake.id);
  if (!input) { res.status(404).json({ error: "Client not found." }); return; }

  const content = await generateClientPlaybook(input);
  const latestVersion = await prisma.clientPlaybook.findFirst({
    where: { clientId: intake.clientId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const playbook = await prisma.clientPlaybook.create({
    data: {
      clientId: intake.clientId,
      intakeId: intake.id,
      version: (latestVersion?.version ?? 0) + 1,
      status: "draft",
      content: JSON.stringify(content),
      source: content.source,
    },
  });
  res.status(201).json(playbook);
});

// ── Get latest playbook ───────────────────────────────────────────────────────

router.get("/admin/clients/:id/playbook", async (req, res) => {
  const playbook = await prisma.clientPlaybook.findFirst({
    where: { clientId: req.params.id as string },
    orderBy: [{ status: "asc" }, { version: "desc" }], // finals first, then newest draft
  });
  if (!playbook) { res.status(404).json({ error: "No playbook yet." }); return; }
  res.json(playbook);
});

// Get all versions
router.get("/admin/clients/:id/playbook/all", async (req, res) => {
  const playbooks = await prisma.clientPlaybook.findMany({
    where: { clientId: req.params.id as string },
    orderBy: { version: "desc" },
  });
  res.json(playbooks);
});

// ── Edit playbook ─────────────────────────────────────────────────────────────

const PlaybookPatchSchema = z.object({
  content:    z.string().optional(),  // full JSON replacement
  adminNotes: z.string().max(10_000).optional(),
});

router.patch("/admin/clients/:id/playbook/:pbId", async (req, res) => {
  const pb = await prisma.clientPlaybook.findFirst({
    where: { id: req.params.pbId as string, clientId: req.params.id as string },
  });
  if (!pb) { res.status(404).json({ error: "Playbook not found." }); return; }
  if (pb.status === "final") { res.status(422).json({ error: "Cannot edit a finalised playbook. Regenerate to create a new version." }); return; }

  const parsed = PlaybookPatchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid patch.", issues: parsed.error.flatten() }); return; }

  // Validate JSON content if provided
  if (parsed.data.content) {
    try { JSON.parse(parsed.data.content); } catch { res.status(422).json({ error: "content must be valid JSON." }); return; }
  }

  const updated = await prisma.clientPlaybook.update({
    where: { id: pb.id },
    data: {
      ...(parsed.data.content    ? { content: parsed.data.content }    : {}),
      ...(parsed.data.adminNotes !== undefined ? { adminNotes: parsed.data.adminNotes } : {}),
    },
  });
  res.json(updated);
});

// ── Mark final ────────────────────────────────────────────────────────────────

router.post("/admin/clients/:id/playbook/:pbId/final", async (req, res) => {
  const pb = await prisma.clientPlaybook.findFirst({
    where: { id: req.params.pbId as string, clientId: req.params.id as string },
  });
  if (!pb) { res.status(404).json({ error: "Playbook not found." }); return; }
  const updated = await prisma.clientPlaybook.update({ where: { id: pb.id }, data: { status: "final" } });
  res.json(updated);
});

export default router;
