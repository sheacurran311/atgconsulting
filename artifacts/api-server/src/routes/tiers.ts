/**
 * Tier-related routes — tool plan, support tickets, DFY applications,
 * and guided session management.
 *
 * Client routes (auth required):
 *   GET  /api/tool-plan           — approved ToolPlan for the client
 *   POST /api/tool-plan/generate  — generate / refresh (idempotent)
 *   POST /api/support             — submit a support ticket
 *   POST /api/dfy/apply           — apply for Done-for-you
 *   GET  /api/guided/sessions     — session package status
 *
 * Admin routes:
 *   GET   /api/admin/tool-plans                  — list all draft plans
 *   GET   /api/admin/clients/:id/tool-plan        — get client's plan
 *   PATCH /api/admin/clients/:id/tool-plan        — edit
 *   POST  /api/admin/clients/:id/tool-plan/approve — approve
 *   GET   /api/admin/dfy-applications             — list applications
 *   PATCH /api/admin/dfy-applications/:id          — update status
 *   PATCH /api/admin/clients/:id/guided-sessions   — set package
 *   GET   /api/admin/support                      — support ticket inbox
 *   PATCH /api/admin/support/:id                  — update ticket status
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";
import { generateToolPlan, type ToolPlanInput } from "../lib/llm";
import { sanitiseText } from "../lib/sanitize";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function cid(req: AuthedRequest, res: Parameters<typeof requireAuth>[1]): string | null {
  const id = req.atgUser?.clientId;
  if (!id) { res.status(404).json({ error: "No client profile. Complete the intake first." }); return null; }
  return id;
}

// ── Tool plan — client ────────────────────────────────────────────────────────

router.get("/tool-plan", withUser, requireAuth, async (req, res) => {
  const clientId = cid(req as AuthedRequest, res);
  if (!clientId) return;

  // Return the best available plan: approved first, then draft (for clients who
  // generated a plan before their tier was confirmed). Self-serve plans are
  // approved immediately on generation — no Shea review required.
  const plan = await prisma.toolPlan.findFirst({
    where: { clientId, status: { in: ["approved", "draft"] } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }], // "approved" sorts before "draft"
  });
  if (!plan) { res.status(404).json({ error: "Your tool plan has not been generated yet. Generate it from your dashboard." }); return; }
  res.json(plan);
});

const GeneratePlanSchema = z.object({
  intakeId: z.string().min(1).optional(),
});

router.post("/tool-plan/generate", withUser, requireAuth, async (req, res) => {
  const clientId = cid(req as AuthedRequest, res);
  if (!clientId) return;

  const parsed = GeneratePlanSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid request." }); return; }

  // Load latest intake for this client to build context
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  const intake = await prisma.intake.findFirst({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });

  const input: ToolPlanInput = {
    industry:        intake?.answers ? (() => { try { return (JSON.parse(intake.answers) as Record<string, string>).industry ?? client?.industry ?? "unknown"; } catch { return client?.industry ?? "unknown"; } })() : (client?.industry ?? "unknown"),
    areas:           (() => { try { return JSON.parse(client?.areas ?? "[]") as string[]; } catch { return []; } })(),
    aiComfort:       client?.aiLevel ?? 1,
    toolBudget:      intake?.toolBudget ?? undefined,
    currentSoftware: intake?.currentSoftware ? sanitiseText(intake.currentSoftware, 200) : undefined,
    weeklyVolumes:   intake?.weeklyVolumes ?? undefined,
    timeSinks:       intake?.answers ? (() => { try { return (JSON.parse(intake.answers) as Record<string, unknown>).timeSinks as string[] ?? []; } catch { return []; } })() : [],
  };

  const output = await generateToolPlan(input);

  // Self-serve: plan is delivered immediately — no Shea approval gate.
  // Guided / DFY: plan stays as "draft" so Shea can review and personalise before release.
  const tier = client?.tier ?? "NONE";
  const autoApprove = tier === "SELF_SERVE" || tier === "NONE"; // NONE = new user or test mode
  const now = new Date();

  const existing = await prisma.toolPlan.findFirst({ where: { clientId, status: "draft" }, orderBy: { createdAt: "desc" } });
  const planData = {
    toolsJson: JSON.stringify(output.tools),
    stepsJson: JSON.stringify(output.steps),
    source: output.source,
    intakeId: intake?.id ?? null,
    ...(autoApprove ? { status: "approved", approvedAt: now } : {}),
  };
  const plan = existing
    ? await prisma.toolPlan.update({ where: { id: existing.id }, data: planData })
    : await prisma.toolPlan.create({ data: { clientId, ...planData } });

  res.status(201).json({ ...plan, _autoApproved: autoApprove });
});

// ── Support tickets — client (SELF_SERVE) ────────────────────────────────────

const SupportTicketSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
});

router.post("/support", withUser, requireAuth, async (req, res) => {
  const clientId = cid(req as AuthedRequest, res);
  if (!clientId) return;
  const parsed = SupportTicketSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "subject and message are required.", issues: parsed.error.flatten() }); return; }
  const ticket = await prisma.supportTicket.create({
    data: { clientId, subject: parsed.data.subject, message: sanitiseText(parsed.data.message) },
  });
  res.status(201).json(ticket);
});

// ── DFY application ───────────────────────────────────────────────────────────

router.post("/dfy/apply", withUser, requireAuth, async (req, res) => {
  const clientId = cid(req as AuthedRequest, res);
  if (!clientId) return;
  const existing = await prisma.dfyApplication.findUnique({ where: { clientId } });
  if (existing) { res.json({ ...existing, alreadyApplied: true }); return; }
  const intake = await prisma.intake.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" } });
  const app = await prisma.dfyApplication.create({ data: { clientId, intakeId: intake?.id ?? null } });
  res.status(201).json(app);
});

router.get("/dfy/status", withUser, requireAuth, async (req, res) => {
  const clientId = cid(req as AuthedRequest, res);
  if (!clientId) return;
  const app = await prisma.dfyApplication.findUnique({ where: { clientId } });
  res.json(app ?? null);
});

// ── Guided sessions — client ──────────────────────────────────────────────────

router.get("/guided/sessions", withUser, requireAuth, async (req, res) => {
  const clientId = cid(req as AuthedRequest, res);
  if (!clientId) return;
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { guidedSessionsTotal: true, guidedSessionsUsed: true } });
  res.json(client ?? { guidedSessionsTotal: null, guidedSessionsUsed: 0 });
});

// ── Admin: tool plans ─────────────────────────────────────────────────────────

router.get("/admin/tool-plans", withUser, requireAdmin, async (_req, res) => {
  const plans = await prisma.toolPlan.findMany({
    where: { status: "draft" },
    include: { client: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(plans);
});

router.get("/admin/clients/:id/tool-plan", withUser, requireAdmin, async (req, res) => {
  const plan = await prisma.toolPlan.findFirst({ where: { clientId: req.params.id as string }, orderBy: { createdAt: "desc" } });
  res.json(plan ?? null);
});

const ToolPlanAdminPatch = z.object({
  toolsJson:   z.string().optional(),
  stepsJson:   z.string().optional(),
  adminNotes:  z.string().max(5000).optional(),
});

router.patch("/admin/clients/:id/tool-plan", withUser, requireAdmin, async (req, res) => {
  const parsed = ToolPlanAdminPatch.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid patch." }); return; }
  const plan = await prisma.toolPlan.findFirst({ where: { clientId: req.params.id as string }, orderBy: { createdAt: "desc" } });
  if (!plan) { res.status(404).json({ error: "No plan found." }); return; }
  const updated = await prisma.toolPlan.update({ where: { id: plan.id }, data: parsed.data });
  res.json(updated);
});

router.post("/admin/clients/:id/tool-plan/approve", withUser, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const plan = await prisma.toolPlan.findFirst({ where: { clientId: req.params.id as string, status: "draft" }, orderBy: { createdAt: "desc" } });
  if (!plan) { res.status(404).json({ error: "No draft plan to approve." }); return; }
  const updated = await prisma.toolPlan.update({
    where: { id: plan.id },
    data: { status: "approved", approvedAt: new Date(), approvedById: actor.id },
  });
  res.json(updated);
});

// ── Admin: DFY applications ───────────────────────────────────────────────────

router.get("/admin/dfy-applications", withUser, requireAdmin, async (_req, res) => {
  const apps = await prisma.dfyApplication.findMany({
    include: { client: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const cap = parseInt(process.env.DFY_MONTHLY_CAP ?? "1", 10);
  const acceptedThisMonth = await prisma.dfyApplication.count({
    where: { status: "accepted", updatedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
  });
  res.json({ applications: apps, cap, acceptedThisMonth, spotsLeft: Math.max(0, cap - acceptedThisMonth) });
});

const DfyStatusSchema = z.object({
  status: z.enum(["applied", "waitlisted", "accepted", "declined"]),
  notes:  z.string().max(2000).optional(),
});

router.patch("/admin/dfy-applications/:id", withUser, requireAdmin, async (req, res) => {
  const parsed = DfyStatusSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid status." }); return; }
  const updated = await prisma.dfyApplication.update({ where: { id: req.params.id as string }, data: parsed.data });
  // When accepted, set client tier to WHITE_GLOVE
  if (parsed.data.status === "accepted") {
    await prisma.client.update({ where: { id: updated.clientId }, data: { tier: "WHITE_GLOVE", status: "ACTIVE" } });
  }
  res.json(updated);
});

// ── Admin: guided session package ─────────────────────────────────────────────

const GuidedSessionSchema = z.object({
  guidedSessionsTotal: z.number().int().min(1).max(20),
  guidedSessionsUsed:  z.number().int().min(0).max(20).optional(),
});

router.patch("/admin/clients/:id/guided-sessions", withUser, requireAdmin, async (req, res) => {
  const parsed = GuidedSessionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "guidedSessionsTotal is required." }); return; }
  const updated = await prisma.client.update({
    where: { id: req.params.id as string },
    data: {
      guidedSessionsTotal: parsed.data.guidedSessionsTotal,
      ...(parsed.data.guidedSessionsUsed !== undefined ? { guidedSessionsUsed: parsed.data.guidedSessionsUsed } : {}),
      tier: "GUIDED",
      status: "ACTIVE",
    },
  });
  res.json(updated);
});

// ── Admin: support tickets ────────────────────────────────────────────────────

router.get("/admin/support", withUser, requireAdmin, async (req, res) => {
  const { status } = req.query as { status?: string };
  const tickets = await prisma.supportTicket.findMany({
    where: status ? { status } : {},
    include: { client: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(tickets);
});

const SupportStatusSchema = z.object({ status: z.enum(["open", "replied", "closed"]) });

router.patch("/admin/support/:id", withUser, requireAdmin, async (req, res) => {
  const parsed = SupportStatusSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "status must be open, replied, or closed." }); return; }
  const updated = await prisma.supportTicket.update({ where: { id: req.params.id as string }, data: parsed.data });
  res.json(updated);
});

export default router;
