/**
 * Client portal routes — authenticated client accessing their own data.
 * All routes require auth. Clients can only see their own data.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, type AuthedRequest } from "../lib/auth";

const router = Router();
router.use(withUser, requireAuth);

function getClient(req: AuthedRequest, res: Parameters<typeof requireAuth>[1]): string | null {
  const user = req.atgUser!;
  if (!user.clientId) {
    res.status(404).json({ error: "No client profile found. Complete the intake form first." });
    return null;
  }
  return user.clientId;
}

// ── Dashboard / profile ───────────────────────────────────────────────────────

router.get("/client/me", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const client = user.clientId
    ? await prisma.client.findUnique({
        where: { id: user.clientId },
        include: { plans: { orderBy: { createdAt: "desc" }, take: 1 } },
      })
    : null;

  const isAdmin = user.role === "ADMIN";
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
    role: user.role,
    isAdmin,
    clientId: user.clientId,
    tier: client?.tier ?? "NONE",
    status: client?.status ?? null,
    digestEmailOptIn: client?.digestEmailOptIn ?? true,
  });
});

router.get("/client/dashboard", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;

  const [client, workflowItems, recentConsultation, recentReport, activeDocCount] =
    await Promise.all([
      prisma.client.findUnique({ where: { id: clientId }, include: { user: true } }),
      prisma.workflowItem.findMany({
        where: { clientId },
        orderBy: [{ done: "asc" }, { order: "asc" }],
        take: 10,
      }),
      prisma.consultation.findFirst({
        where: { clientId, scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.report.findFirst({
        where: { clientId, status: "PUBLISHED" },
        orderBy: { date: "desc" },
      }),
      prisma.document.count({ where: { clientId, visibleToClient: true } }),
    ]);

  res.json({ client, workflowItems, recentConsultation, recentReport, activeDocCount });
});

router.patch("/client/workflow/:id", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  const item = await prisma.workflowItem.findFirst({ where: { id: req.params.id, clientId } });
  if (!item) { res.status(404).json({ error: "Item not found." }); return; }
  const updated = await prisma.workflowItem.update({ where: { id: item.id }, data: { done: !item.done } });
  res.json(updated);
});

// ── Consultations ─────────────────────────────────────────────────────────────

router.get("/client/consultations", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  const consultations = await prisma.consultation.findMany({
    where: { clientId },
    include: { actionItems: { orderBy: { createdAt: "asc" } } },
    orderBy: { scheduledAt: "desc" },
  });
  res.json(consultations);
});

router.get("/client/consultations/:id", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  const c = await prisma.consultation.findFirst({
    where: { id: req.params.id, clientId },
    include: { actionItems: { orderBy: { createdAt: "asc" } } },
  });
  if (!c) { res.status(404).json({ error: "Not found." }); return; }
  res.json(c);
});

router.patch("/client/action-items/:id", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  // Clients can only toggle their own action items
  const ai = await prisma.actionItem.findFirst({
    where: { id: req.params.id, owner: "CLIENT", consultation: { clientId } },
  });
  if (!ai) { res.status(404).json({ error: "Not found." }); return; }
  const updated = await prisma.actionItem.update({ where: { id: ai.id }, data: { done: !ai.done } });
  res.json(updated);
});

// ── Documents ─────────────────────────────────────────────────────────────────

router.get("/client/documents", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  const user = (req as AuthedRequest).atgUser!;
  const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  const clientTierIdx = TIER_ORDER.indexOf(client?.tier ?? "NONE");
  const docs = await prisma.document.findMany({
    where: {
      visibleToClient: true,
      OR: [{ clientId }, { clientId: null }],
    },
    orderBy: { createdAt: "desc" },
  });
  // Filter by minTier
  const filtered = docs.filter((d) => {
    if (!d.minTier) return true;
    return TIER_ORDER.indexOf(d.minTier) <= clientTierIdx;
  });
  res.json(filtered);
});

// ── Reports ───────────────────────────────────────────────────────────────────

router.get("/client/reports", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  const reports = await prisma.report.findMany({
    where: { clientId, status: "PUBLISHED" },
    orderBy: { date: "desc" },
    take: 30,
  });
  res.json(reports);
});

router.get("/client/reports/:date", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  const report = await prisma.report.findUnique({
    where: { clientId_date_kind: { clientId, date: req.params.date, kind: "DAILY" } },
  });
  if (!report || report.status !== "PUBLISHED") { res.status(404).json({ error: "Not found." }); return; }
  res.json(report);
});

// ── Learn modules ─────────────────────────────────────────────────────────────

router.get("/modules", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const clientId = user.clientId;
  const client = clientId ? await prisma.client.findUnique({ where: { id: clientId } }) : null;
  const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];
  const clientTierIdx = TIER_ORDER.indexOf(client?.tier ?? "NONE");

  const [modules, progress] = await Promise.all([
    prisma.module.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
    prisma.moduleProgress.findMany({ where: { userId: user.id }, select: { moduleId: true } }),
  ]);

  const completedIds = new Set(progress.map((p) => p.moduleId));
  const result = modules.map((m) => ({
    ...m,
    locked: TIER_ORDER.indexOf(m.minTier) > clientTierIdx,
    completed: completedIds.has(m.id),
  }));
  res.json(result);
});

router.get("/modules/:slug", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const client = user.clientId ? await prisma.client.findUnique({ where: { id: user.clientId } }) : null;
  const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];
  const clientTierIdx = TIER_ORDER.indexOf(client?.tier ?? "NONE");

  const m = await prisma.module.findUnique({ where: { slug: req.params.slug } });
  if (!m || m.status !== "PUBLISHED") { res.status(404).json({ error: "Not found." }); return; }
  if (TIER_ORDER.indexOf(m.minTier) > clientTierIdx) {
    res.status(403).json({ error: "Upgrade your plan to access this module.", minTier: m.minTier });
    return;
  }
  res.json(m);
});

router.post("/modules/:slug/complete", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const m = await prisma.module.findUnique({ where: { slug: req.params.slug } });
  if (!m) { res.status(404).json({ error: "Not found." }); return; }
  await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId: user.id, moduleId: m.id } },
    create: { userId: user.id, moduleId: m.id },
    update: {},
  });
  res.json({ ok: true });
});

// ── Account settings ──────────────────────────────────────────────────────────

const AccountPatchSchema = z.object({
  digestEmailOptIn: z.boolean().optional(),
});

router.patch("/client/account", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const parsed = AccountPatchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid account update." }); return; }
  const { digestEmailOptIn } = parsed.data;
  if (user.clientId && digestEmailOptIn !== undefined) {
    await prisma.client.update({ where: { id: user.clientId }, data: { digestEmailOptIn } });
  }
  res.json({ ok: true });
});

// ── Intake summary for account page ──────────────────────────────────────────

router.get("/client/intake/latest", requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.json(null); return; }
  const intake = await prisma.intake.findFirst({
    where: { clientId: user.clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, aiComfort: true, hoursLost: true, helpStyle: true, areas: true, answers: true },
  });
  res.json(intake ?? null);
});

router.get("/client/intake/history", requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.json([]); return; }
  const intakes = await prisma.intake.findMany({
    where: { clientId: user.clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, helpStyle: true },
    take: 20,
  });
  res.json(intakes);
});

// ── Intake prefill for adaptive edit flow ─────────────────────────────────────

router.get("/client/intake/prefill", requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.json({ answers: [], sessionId: null }); return; }

  // First: try DiscoveryIntake (the adaptive intake)
  const discovery = await prisma.discoveryIntake.findFirst({
    where: { clientId: user.clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, answers: true, contactEmail: true, contactName: true },
  });

  if (discovery) {
    const answers: unknown[] = (() => { try { return JSON.parse(discovery.answers) as unknown[]; } catch { return []; } })();
    res.json({ answers, sessionId: discovery.id, source: "discovery" });
    return;
  }

  // Fallback: legacy Intake answers → convert to Q&A format
  const legacy = await prisma.intake.findFirst({
    where: { clientId: user.clientId },
    orderBy: { createdAt: "desc" },
  });
  if (!legacy) { res.json({ answers: [], sessionId: null }); return; }

  const legacyAnswers: Array<{ id: string; category: string; question: string; answer: string }> = [];
  if (legacy.name)      legacyAnswers.push({ id: "contact_name", category: "contact", question: "What's your name?", answer: legacy.name });
  if (legacy.email)     legacyAnswers.push({ id: "contact_email", category: "contact", question: "What's your email?", answer: legacy.email });
  if (legacy.helpStyle) legacyAnswers.push({ id: "preferredHelp", category: "goals", question: "How do you prefer to get help?", answer: legacy.helpStyle });

  const legacyAnswersJSON: Record<string, unknown> = (() => { try { return JSON.parse(legacy.answers ?? "{}") as Record<string, unknown>; } catch { return {}; } })();
  if (legacyAnswersJSON.industry) legacyAnswers.push({ id: "business_type", category: "company", question: "What type of business?", answer: legacyAnswersJSON.industry as string });
  if (legacyAnswersJSON.role)     legacyAnswers.push({ id: "role", category: "company", question: "What's your role?", answer: legacyAnswersJSON.role as string });
  if (legacy.areas) {
    const areas: string[] = (() => { try { return JSON.parse(legacy.areas) as string[]; } catch { return []; } })();
    if (areas.length > 0) legacyAnswers.push({ id: "top_problems", category: "company", question: "Describe what eats your time.", answer: `Focus areas: ${areas.join(", ")}` });
  }

  res.json({ answers: legacyAnswers, sessionId: null, source: "legacy" });
});

export default router;
