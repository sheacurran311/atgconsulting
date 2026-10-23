/**
 * Workbench routes — the client-facing ATG Workbench product.
 * All require auth. Clients access only their own data.
 *
 * GET  /api/workbench/today          — OutputItems pending review
 * PATCH /api/workbench/output/:id    — approve / edit / dismiss
 * GET  /api/workbench/workflows      — My workflows list
 * GET  /api/workbench/hours-saved    — Hours ledger from completed runs
 * GET  /api/workbench/messages       — Thread with Shea
 * POST /api/workbench/messages       — Send a message to Shea
 * POST /api/workbench/requests       — Request a new workflow
 *
 * Admin sub-routes (via admin.ts):
 * POST /api/admin/clients/:id/workflows        — Create workflow
 * POST /api/admin/clients/:id/outputs          — Post output to Today inbox
 * GET  /api/admin/messages                     — All client message threads
 * POST /api/admin/messages/:clientId/reply     — Reply to client
 * GET  /api/admin/workflow-requests            — Request inbox
 * PATCH /api/admin/workflow-requests/:id       — Acknowledge/update status
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, type AuthedRequest } from "../lib/auth";
import { generateFollowUpDraft } from "../lib/llm";

const router = Router();
router.use(withUser, requireAuth);

function clientId(req: AuthedRequest, res: Parameters<typeof requireAuth>[1]): string | null {
  const id = req.atgUser?.clientId;
  if (!id) { res.status(404).json({ error: "No client profile. Complete the intake first." }); return null; }
  return id;
}

// ── Today inbox ───────────────────────────────────────────────────────────────

router.get("/workbench/today", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const items = await prisma.outputItem.findMany({
    where: { clientId: cid, status: "pending" },
    include: { workflow: { select: { name: true, area: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(items.map((item) => ({
    id: item.id,
    workflowId: item.workflowId,
    workflowName: item.workflow.name,
    type: item.type,
    subject: item.subject,
    content: item.content,
    status: item.status,
    editedContent: item.editedContent,
    sheaBadge: item.sheaBadge,
    createdAt: item.createdAt,
  })));
});

const ReviewSchema = z.object({
  action: z.enum(["approve", "edit", "dismiss"]),
  editedContent: z.string().max(10000).optional(),
});

router.patch("/workbench/output/:id", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const item = await prisma.outputItem.findFirst({ where: { id: req.params.id as string, clientId: cid } });
  if (!item) { res.status(404).json({ error: "Not found." }); return; }

  const p = ReviewSchema.safeParse(req.body);
  if (!p.success) { res.status(422).json({ error: "Invalid action." }); return; }

  const status = p.data.action === "approve" ? "approved" : p.data.action === "edit" ? "edited" : "dismissed";
  const updated = await prisma.outputItem.update({
    where: { id: item.id },
    data: { status, reviewedAt: new Date(), editedContent: p.data.editedContent },
  });
  res.json(updated);
});

// ── My workflows ──────────────────────────────────────────────────────────────

router.get("/workbench/workflows", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const workflows = await prisma.workflow.findMany({
    where: { clientId: cid },
    include: {
      runs: { orderBy: { runAt: "desc" }, take: 1 },
      _count: { select: { outputs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(workflows);
});

// ── Hours saved ───────────────────────────────────────────────────────────────

router.get("/workbench/hours-saved", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const runs = await prisma.workflowRun.findMany({
    where: { workflow: { clientId: cid }, status: "completed" },
    select: { runAt: true, summary: true, outputCount: true },
    orderBy: { runAt: "desc" },
    take: 90,
  });
  const approved = await prisma.outputItem.count({ where: { clientId: cid, status: { in: ["approved", "edited"] } } });
  res.json({ runs, approved, totalRuns: runs.length });
});

// ── Messages ──────────────────────────────────────────────────────────────────

router.get("/workbench/messages", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const messages = await prisma.clientMessage.findMany({
    where: { clientId: cid },
    orderBy: { createdAt: "asc" },
  });
  // Mark unread admin messages as read
  await prisma.clientMessage.updateMany({
    where: { clientId: cid, fromAdmin: true, readAt: null },
    data: { readAt: new Date() },
  });
  res.json(messages);
});

const MessageBodySchema = z.object({ body: z.string().trim().min(1).max(2000) });

router.post("/workbench/messages", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const parsed = MessageBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "body is required (max 2000 chars)." }); return; }
  const msg = await prisma.clientMessage.create({ data: { clientId: cid, body: parsed.data.body, fromAdmin: false } });
  res.status(201).json(msg);
});

// ── Workflow requests ─────────────────────────────────────────────────────────

const FollowUpBody = z.object({
  who: z.string().trim().min(1).max(120),
  lastTouch: z.string().trim().min(1).max(500),
  wantToSay: z.string().trim().min(1).max(1000),
});

const FOLLOW_UP_NAME = "Follow-up drafts";

router.post("/workbench/follow-up", async (req, res) => {
  const user = (req as AuthedRequest).atgUser;
  if (!user?.clientId) {
    res.status(404).json({ error: "Finish the intake and save the plan to your account before drafting a follow-up." });
    return;
  }
  const parsed = FollowUpBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Who, last touch, and what you want to say are required." }); return; }

  const draft = await generateFollowUpDraft({
    who: parsed.data.who,
    lastTouch: parsed.data.lastTouch,
    wantToSay: parsed.data.wantToSay,
    senderName: user.name,
  });

  let workflow = await prisma.workflow.findFirst({
    where: { clientId: user.clientId, name: FOLLOW_UP_NAME },
  });
  if (!workflow) {
    workflow = await prisma.workflow.create({
      data: {
        clientId: user.clientId,
        name: FOLLOW_UP_NAME,
        description: "A follow-up email, ready for you to review and copy.",
        area: "sales",
        status: "live",
      },
    });
  }

  const now = new Date();
  const output = await prisma.outputItem.create({
    data: {
      workflowId: workflow.id,
      clientId: user.clientId,
      type: "email_draft",
      subject: draft.subject,
      content: draft.body,
      status: "pending",
    },
  });
  await prisma.workflowRun.create({
    data: {
      workflowId: workflow.id,
      status: "completed",
      summary: "Follow-up draft ready",
      outputCount: 1,
      runAt: now,
    },
  });
  await prisma.workflow.update({ where: { id: workflow.id }, data: { lastRunAt: now } });

  res.status(201).json({
    id: output.id,
    workflowId: output.workflowId,
    workflowName: workflow.name,
    type: output.type,
    subject: output.subject,
    content: output.content,
    status: output.status,
    editedContent: output.editedContent,
    sheaBadge: output.sheaBadge,
    createdAt: output.createdAt,
  });
});

const WorkflowRequestSchema = z.object({ description: z.string().trim().min(1).max(1000) });

router.post("/workbench/requests", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const parsed = WorkflowRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "description is required (max 1000 chars)." }); return; }
  const req2 = await prisma.workflowRequest.create({ data: { clientId: cid, description: parsed.data.description } });
  res.status(201).json(req2);
});

export default router;
