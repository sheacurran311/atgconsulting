/**
 * Admin routes — Shea's console. Requires ADMIN role.
 * Includes consultation prep view: intake answers, AI-drafted plan, talking points.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, type AuthedRequest } from "../lib/auth";
import { generateDailyReport } from "../lib/reports";
import { audit } from "../lib/audit";

const router = Router();
router.use(withUser, requireAdmin);

// ── Clients ───────────────────────────────────────────────────────────────────

router.get("/admin/clients", async (req, res) => {
  const { tier, status, q, area } = req.query as Record<string, string | undefined>;
  const clients = await prisma.client.findMany({
    where: {
      ...(tier ? { tier } : {}),
      ...(status ? { status } : {}),
      ...(area ? { areas: { contains: area } } : {}),
      ...(q
        ? {
            OR: [
              { user: { name: { contains: q } } },
              { user: { email: { contains: q } } },
              { company: { contains: q } },
              { industry: { contains: q } },
            ],
          }
        : {}),
    },
    include: { user: true, _count: { select: { consultations: true, documents: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(clients);
});

router.get("/admin/clients/:id", async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: {
      user: true,
      intakes: { orderBy: { createdAt: "desc" }, take: 5 },
      plans: { orderBy: { createdAt: "desc" }, take: 3 },
      workflowItems: { orderBy: [{ done: "asc" }, { order: "asc" }] },
      consultations: {
        include: { actionItems: true },
        orderBy: { scheduledAt: "desc" },
      },
      documents: { orderBy: { createdAt: "desc" } },
      reports: { orderBy: { date: "desc" }, take: 10 },
      workflows: { orderBy: { createdAt: "desc" }, select: { id: true, name: true, area: true, description: true } },
    },
  });
  if (!client) { res.status(404).json({ error: "Not found." }); return; }
  res.json(client);
});

// Consultation prep view: intake answers + AI plan + suggested talking points
router.get("/admin/clients/:id/prep", async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: {
      user: true,
      intakes: { orderBy: { createdAt: "desc" }, take: 1 },
      plans: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!client) { res.status(404).json({ error: "Not found." }); return; }

  const intake = client.intakes[0];
  const plan = client.plans[0];
  const answers = intake ? (() => { try { return JSON.parse(intake.answers); } catch { return null; } })() : null;

  // Generate talking points from plan + intake
  const talkingPoints: string[] = [];
  if (answers) {
    talkingPoints.push(`Ask about their ${answers.role ?? "role"} in ${answers.industry ?? "their industry"}.`);
    if (answers.automateFirst) talkingPoints.push(`They said they'd automate: "${answers.automateFirst}" — explore why.`);
    talkingPoints.push(`They lose ~${intake?.hoursLost ?? "?"} hrs/week to repetitive work — quantify the cost.`);
  }
  if (plan) {
    const focusAreas: { area: string; name: string }[] = (() => { try { return JSON.parse(plan.focusAreas) as { area: string; name: string }[]; } catch { return []; } })();
    talkingPoints.push(`AI plan recommends ${plan.recommendedTier} tier — be ready to explain why.`);
    focusAreas.forEach((w) => talkingPoints.push(`Explore "${w.name}" as a priority area.`));
  }
  talkingPoints.push("Ask what their biggest blocker is right now.");
  talkingPoints.push("Confirm next steps and who owns each action item.");

  res.json({ client, intake, answers, plan, talkingPoints });
});

const UpdateClientSchema = z.object({
  tier: z.enum(["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"]).optional(),
  status: z.enum(["PROSPECT", "ACTIVE", "PAUSED", "CHURNED"]).optional(),
  notes: z.string().max(5000).optional(),
  company: z.string().max(200).optional(),
});

router.patch("/admin/clients/:id", async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const parsed = UpdateClientSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed." }); return; }

  const before = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!before) { res.status(404).json({ error: "Not found." }); return; }

  const updated = await prisma.client.update({ where: { id: req.params.id }, data: parsed.data });

  if (parsed.data.tier && parsed.data.tier !== before.tier) {
    await audit({ actorUserId: actor.id, action: "TIER_CHANGE", entity: "Client", entityId: req.params.id, meta: { from: before.tier, to: parsed.data.tier }, ip: req.ip });
  }
  res.json(updated);
});

// ── Consultations (admin creates/edits) ───────────────────────────────────────

const ConsultationSchema = z.object({
  title: z.string().min(1).max(200),
  scheduledAt: z.string().optional(),
  durationMin: z.number().int().min(15).max(480).default(60),
  notes: z.string().max(50000).optional(),
  recordingUrl: z.string().url().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  actionItems: z.array(z.object({ owner: z.enum(["CLIENT", "ADMIN"]), text: z.string().max(500), dueAt: z.string().optional() })).optional(),
});

router.post("/admin/clients/:id/consultations", async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const client = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!client) { res.status(404).json({ error: "Client not found." }); return; }

  const parsed = ConsultationSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }
  const { actionItems, ...data } = parsed.data;

  const c = await prisma.consultation.create({
    data: {
      clientId: client.id,
      ...data,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    },
  });

  if (actionItems?.length) {
    await prisma.actionItem.createMany({
      data: actionItems.map((ai) => ({ consultationId: c.id, owner: ai.owner, text: ai.text, dueAt: ai.dueAt ? new Date(ai.dueAt) : null })),
    });
  }

  await audit({ actorUserId: actor.id, action: "CONSULTATION_CREATE", entity: "Consultation", entityId: c.id, meta: { clientId: client.id }, ip: req.ip });
  res.status(201).json(c);
});

router.patch("/admin/consultations/:id", async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const existing = await prisma.consultation.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Not found." }); return; }

  const parsed = ConsultationSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed." }); return; }
  const { actionItems, ...data } = parsed.data;

  const updated = await prisma.consultation.update({
    where: { id: req.params.id },
    data: { ...data, scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined },
  });

  if (actionItems) {
    await prisma.actionItem.deleteMany({ where: { consultationId: req.params.id, owner: "ADMIN" } });
    await prisma.actionItem.createMany({
      data: actionItems.map((ai) => ({ consultationId: req.params.id, owner: ai.owner, text: ai.text, dueAt: ai.dueAt ? new Date(ai.dueAt) : null })),
    });
  }

  await audit({ actorUserId: actor.id, action: "CONSULTATION_UPDATE", entity: "Consultation", entityId: req.params.id, ip: req.ip });
  res.json(updated);
});

// ── Intakes inbox ─────────────────────────────────────────────────────────────

router.get("/admin/intakes", async (req, res) => {
  const { status } = req.query as { status?: string };
  const intakes = await prisma.intake.findMany({
    where: status ? { status } : {},
    include: { plans: { take: 1, orderBy: { createdAt: "desc" } }, client: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(intakes);
});

router.patch("/admin/intakes/:id/status", async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const { status } = req.body as { status: string };
  const allowed = ["NEW", "REVIEWED", "CONVERTED", "SPAM"];
  if (!allowed.includes(status)) { res.status(422).json({ error: "Invalid status." }); return; }
  const intake = await prisma.intake.update({ where: { id: req.params.id }, data: { status } });
  await audit({ actorUserId: actor.id, action: "INTAKE_STATUS_CHANGE", entity: "Intake", entityId: req.params.id, meta: { status }, ip: req.ip });
  res.json(intake);
});

// ── Reports queue ─────────────────────────────────────────────────────────────

router.get("/admin/reports", async (req, res) => {
  const { status } = req.query as { status?: string };
  const reports = await prisma.report.findMany({
    where: status ? { status } : {},
    include: { client: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(reports);
});

router.post("/admin/reports/:id/publish", async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) { res.status(404).json({ error: "Not found." }); return; }
  const updated = await prisma.report.update({
    where: { id: req.params.id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await audit({ actorUserId: actor.id, action: "REPORT_PUBLISH", entity: "Report", entityId: req.params.id, ip: req.ip });
  res.json(updated);
});

router.patch("/admin/reports/:id", async (req, res) => {
  const { contentMarkdown } = req.body as { contentMarkdown: string };
  const updated = await prisma.report.update({
    where: { id: req.params.id },
    data: { contentMarkdown },
  });
  res.json(updated);
});

// ── Content manager: modules ───────────────────────────────────────────────────

router.get("/admin/content/modules", async (_req, res) => {
  const modules = await prisma.module.findMany({ orderBy: { order: "asc" } });
  res.json(modules);
});

const ModuleSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  description: z.string().max(500),
  minTier: z.enum(["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"]).default("NONE"),
  order: z.number().int().default(0),
  videoUrl: z.string().url().optional().nullable(),
  body: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

router.post("/admin/content/modules", async (req, res) => {
  const parsed = ModuleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }
  const m = await prisma.module.create({ data: parsed.data });
  res.status(201).json(m);
});

router.put("/admin/content/modules/:id", async (req, res) => {
  const parsed = ModuleSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed." }); return; }
  const m = await prisma.module.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(m);
});

router.delete("/admin/content/modules/:id", async (req, res) => {
  await prisma.module.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Content manager: prompt templates ─────────────────────────────────────────

router.get("/admin/content/prompts", async (_req, res) => {
  const templates = await prisma.promptTemplate.findMany({ orderBy: [{ key: "asc" }, { version: "desc" }] });
  res.json(templates);
});

router.post("/admin/content/prompts", async (req, res) => {
  const { key, body } = req.body as { key: string; body: string };
  if (!key || !body) { res.status(422).json({ error: "key and body are required." }); return; }
  const latest = await prisma.promptTemplate.findFirst({ where: { key }, orderBy: { version: "desc" } });
  const version = (latest?.version ?? 0) + 1;
  await prisma.promptTemplate.updateMany({ where: { key, active: true }, data: { active: false } });
  const template = await prisma.promptTemplate.create({ data: { key, version, body, active: true } });
  res.status(201).json(template);
});

// ── Audit log ─────────────────────────────────────────────────────────────────

router.get("/admin/audit", async (req, res) => {
  const { entity, actorUserId, skip = "0", take = "50" } = req.query as Record<string, string | undefined>;
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(entity ? { entity } : {}),
      ...(actorUserId ? { actorUserId } : {}),
    },
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    skip: parseInt(skip, 10) || 0,
    take: Math.min(parseInt(take, 10) || 50, 200),
  });
  res.json(logs);
});

export default router;

// ── Workbench admin: workflows + outputs + messages + requests ─────────────────

router.post("/admin/clients/:id/workflows", async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const client = await prisma.client.findUnique({ where: { id: req.params.id as string } });
  if (!client) { res.status(404).json({ error: "Client not found." }); return; }
  const { name, description, area, schedule, status } = req.body as Record<string, string>;
  if (!name || !description || !area) { res.status(422).json({ error: "name, description, and area are required." }); return; }
  const wf = await prisma.workflow.create({ data: { clientId: client.id, name, description, area, schedule, status: status ?? "designing", setupNote: `Set up by ${actor.name ?? "Shea"}` } });
  res.status(201).json(wf);
});

const WorkflowPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  area: z.enum(["ea", "marketing", "sales", "cs"]).optional(),
  status: z.enum(["designing", "building", "live", "paused"]).optional(),
  schedule: z.string().max(200).nullable().optional(),
  setupNote: z.string().max(500).nullable().optional(),
});

router.patch("/admin/workflows/:id", async (req, res) => {
  const parsed = WorkflowPatchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed." }); return; }
  const data = Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value !== undefined));
  if (Object.keys(data).length === 0) { res.status(422).json({ error: "No editable fields." }); return; }
  const existing = await prisma.workflow.findUnique({ where: { id: req.params.id as string } });
  if (!existing) { res.status(404).json({ error: "Workflow not found." }); return; }
  const wf = await prisma.workflow.update({ where: { id: existing.id }, data });
  res.json(wf);
});

const OutputCreateSchema = z.object({
  workflowId: z.string().min(1),
  type: z.enum(["briefing", "email_draft", "lead_list", "social_post", "quote_followup", "review_request"]),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(20000),
});

router.post("/admin/clients/:id/outputs", async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const client = await prisma.client.findUnique({ where: { id: req.params.id as string } });
  if (!client) { res.status(404).json({ error: "Client not found." }); return; }
  const parsed = OutputCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "workflowId, type, subject, and content are required." }); return; }
  const workflow = await prisma.workflow.findFirst({ where: { id: parsed.data.workflowId, clientId: client.id } });
  if (!workflow) { res.status(404).json({ error: "Workflow not found for this client." }); return; }
  const item = await prisma.outputItem.create({
    data: {
      workflowId: workflow.id,
      clientId: client.id,
      type: parsed.data.type,
      subject: parsed.data.subject,
      content: parsed.data.content,
      sheaBadge: `Reviewed by ${actor.name ?? "Shea"}`,
    },
  });
  res.status(201).json(item);
});

router.get("/admin/messages", async (_req, res) => {
  const threads = await prisma.clientMessage.groupBy({
    by: ["clientId"],
    _count: { id: true },
    _max: { createdAt: true },
  });
  const withClient = await Promise.all(threads.map(async (t) => {
    const latest = await prisma.clientMessage.findFirst({ where: { clientId: t.clientId }, orderBy: { createdAt: "desc" } });
    const client = await prisma.client.findUnique({ where: { id: t.clientId }, include: { user: { select: { name: true, email: true } } } });
    return { clientId: t.clientId, client, messageCount: t._count.id, latestAt: t._max.createdAt, latest };
  }));
  res.json(withClient);
});

router.get("/admin/messages/:clientId", async (req, res) => {
  const msgs = await prisma.clientMessage.findMany({ where: { clientId: req.params.clientId as string }, orderBy: { createdAt: "asc" } });
  await prisma.clientMessage.updateMany({ where: { clientId: req.params.clientId as string, fromAdmin: false, readAt: null }, data: { readAt: new Date() } });
  res.json(msgs);
});

router.post("/admin/messages/:clientId/reply", async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const { body } = req.body as { body?: string };
  if (!body?.trim()) { res.status(422).json({ error: "Body required." }); return; }
  const msg = await prisma.clientMessage.create({ data: { clientId: req.params.clientId as string, body: body.trim(), fromAdmin: true } });
  res.status(201).json(msg);
});

router.get("/admin/workflow-requests", async (_req, res) => {
  const requests = await prisma.workflowRequest.findMany({ include: { client: { include: { user: { select: { name: true, email: true } } } } }, orderBy: { createdAt: "desc" } });
  res.json(requests);
});

router.patch("/admin/workflow-requests/:id", async (req, res) => {
  const { status, adminNote } = req.body as { status?: string; adminNote?: string };
  const updated = await prisma.workflowRequest.update({ where: { id: req.params.id as string }, data: { ...(status ? { status } : {}), ...(adminNote ? { adminNote } : {}) } });
  res.json(updated);
});
