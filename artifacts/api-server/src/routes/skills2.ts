/**
 * Phase 2 Workbench skills — Guided-tier workflows.
 * All require minTier GUIDED (enforced via WorkflowTemplate.minTier + ClientWorkflowSettings).
 *
 * POST /api/workbench/money-snapshot      — weekly financial summary + flags
 * POST /api/workbench/booking-flow        — booking page copy + message sequences
 * POST /api/workbench/quote-proposal      — proposal/quote draft + HTML export
 * GET  /api/workbench/quote-proposal/:id/html — printable HTML for an existing proposal
 * POST /api/workbench/prospect-research   — prospect fetch + outreach drafts
 *
 * Admin per-client workflow settings:
 * GET   /api/admin/clients/:id/workflow-settings         — list enabled/disabled slugs
 * PATCH /api/admin/clients/:id/workflow-settings/:slug   — enable/disable a workflow
 *
 * Run history:
 * GET   /api/workbench/run-history                       — runs + outputs for signed-in client
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";
import { sanitiseText, sanitiseShortText } from "../lib/sanitize";
import {
  generateMoneySnapshot,
  generateBookingFlow,
  generateQuoteProposal,
  proposalToHtml,
  generateProspectResearch,
} from "../lib/llm";

const router = Router();

const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];

function clientId(req: AuthedRequest, res: Parameters<typeof requireAuth>[1]): string | null {
  const id = req.atgUser?.clientId;
  if (!id) { res.status(404).json({ error: "Complete the intake first." }); return null; }
  return id;
}

/** Check tier and per-client override. */
async function checkAccess(clientId: string, slug: string): Promise<{ allowed: boolean; reason?: string }> {
  const [client, template, override] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { tier: true } }),
    prisma.workflowTemplate.findUnique({ where: { slug }, select: { minTier: true, enabled: true } }),
    prisma.clientWorkflowSettings.findUnique({ where: { clientId_slug: { clientId, slug } } }),
  ]);
  if (!template?.enabled) return { allowed: false, reason: "This workflow is not available." };
  if (override && !override.enabled) return { allowed: false, reason: "This workflow has been disabled for your account." };
  const minIdx = TIER_ORDER.indexOf(template.minTier);
  const clientIdx = TIER_ORDER.indexOf(client?.tier ?? "NONE");
  if (clientIdx < minIdx) return { allowed: false, reason: `This workflow requires the ${template.minTier.replace("_", " ").toLowerCase()} plan.` };
  return { allowed: true };
}

async function ensureWf(clientId: string, slug: string) {
  const t = await prisma.workflowTemplate.findUnique({ where: { slug }, select: { name: true, description: true } });
  const ex = await prisma.workflow.findFirst({ where: { clientId, name: t?.name ?? slug } });
  if (ex) return prisma.workflow.update({ where: { id: ex.id }, data: { lastRunAt: new Date() } });
  return prisma.workflow.create({ data: { clientId, name: t?.name ?? slug, description: t?.description ?? "", area: "sales", status: "live", lastRunAt: new Date() } });
}

async function makeOutput(clientId: string, wfId: string, type: string, subject: string, content: string) {
  const out = await prisma.outputItem.create({ data: { workflowId: wfId, clientId, type, subject, content, status: "pending" } });
  await prisma.workflowRun.create({ data: { workflowId: wfId, status: "completed", summary: subject, outputCount: 1 } });
  return out;
}

// ── 5. Weekly money snapshot ───────────────────────────────────────────────────

const MoneySnapshotBody = z.object({
  data:         z.string().trim().min(1).max(20000),
  weekEnding:   z.string().max(20).optional(),
  businessName: z.string().max(100).optional(),
});

router.post("/workbench/money-snapshot", withUser, requireAuth, async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const parsed = MoneySnapshotBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "data is required." }); return; }
  const access = await checkAccess(cid, "money-snapshot");
  if (!access.allowed) { res.status(403).json({ error: access.reason }); return; }

  const result = await generateMoneySnapshot({
    data: sanitiseText(parsed.data.data, 20000),
    weekEnding: parsed.data.weekEnding,
    businessName: parsed.data.businessName ? sanitiseShortText(parsed.data.businessName) : undefined,
  });
  const wf = await ensureWf(cid, "money-snapshot");
  const output = await makeOutput(cid, wf.id, "briefing",
    `Money snapshot${parsed.data.weekEnding ? ` — week of ${parsed.data.weekEnding}` : ""}`,
    JSON.stringify(result));
  res.status(201).json({ output, result });
});

// ── 6. Booking and reminder flow ───────────────────────────────────────────────

const BookingFlowBody = z.object({
  businessName: z.string().trim().min(1).max(100),
  serviceTypes: z.string().trim().min(1).max(300),
  platform:     z.string().trim().min(1).max(100),
  channels:     z.string().trim().min(1).max(200),
});

router.post("/workbench/booking-flow", withUser, requireAuth, async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const parsed = BookingFlowBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "businessName, serviceTypes, platform, and channels are required." }); return; }
  const access = await checkAccess(cid, "booking-flow");
  if (!access.allowed) { res.status(403).json({ error: access.reason }); return; }

  const user = (req as AuthedRequest).atgUser!;
  const result = await generateBookingFlow({ ...parsed.data, senderName: user.name ?? undefined });
  const wf = await ensureWf(cid, "booking-flow");
  const output = await makeOutput(cid, wf.id, "email_draft",
    `Booking flow — ${parsed.data.businessName} · ${result.sequences.length} sequences`,
    JSON.stringify(result));
  res.status(201).json({ output, result });
});

// ── 7. Quote / proposal draft ──────────────────────────────────────────────────

const QuoteProposalBody = z.object({
  clientName:         z.string().trim().min(1).max(150),
  businessName:       z.string().max(100).optional(),
  servicesAndPricing: z.string().trim().min(1).max(3000),
  scopeDescription:   z.string().trim().min(1).max(2000),
  termsNotes:         z.string().max(1000).optional(),
});

router.post("/workbench/quote-proposal", withUser, requireAuth, async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const parsed = QuoteProposalBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "clientName, servicesAndPricing, and scopeDescription are required." }); return; }
  const access = await checkAccess(cid, "quote-proposal");
  if (!access.allowed) { res.status(403).json({ error: access.reason }); return; }

  const user = (req as AuthedRequest).atgUser!;
  const result = await generateQuoteProposal({ ...parsed.data, senderName: user.name ?? undefined });
  const wf = await ensureWf(cid, "quote-proposal");
  const output = await makeOutput(cid, wf.id, "email_draft",
    `Proposal for ${parsed.data.clientName}`,
    JSON.stringify({ ...result, _clientName: parsed.data.clientName, _businessName: parsed.data.businessName ?? "" }));
  res.status(201).json({ output, result });
});

// Export proposal as printable HTML
router.get("/workbench/quote-proposal/:id/html", withUser, requireAuth, async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const item = await prisma.outputItem.findFirst({ where: { id: req.params.id as string, clientId: cid } });
  if (!item) { res.status(404).json({ error: "Not found." }); return; }
  let parsed: { proposalMarkdown?: string; _clientName?: string; _businessName?: string } = {};
  try { parsed = JSON.parse(item.content); } catch { res.status(422).json({ error: "Not a proposal output." }); return; }
  if (!parsed.proposalMarkdown) { res.status(422).json({ error: "Not a proposal output." }); return; }
  const html = proposalToHtml(parsed.proposalMarkdown, parsed._clientName ?? "Client", parsed._businessName ?? "");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// ── 8. Prospect research + outreach drafts ─────────────────────────────────────

const ProspectResearchBody = z.object({
  icp:          z.string().trim().min(1).max(500),
  prospects:    z.string().trim().min(1).max(5000),
  businessName: z.string().max(100).optional(),
});

router.post("/workbench/prospect-research", withUser, requireAuth, async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const parsed = ProspectResearchBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "icp and prospects are required." }); return; }
  const access = await checkAccess(cid, "prospect-research");
  if (!access.allowed) { res.status(403).json({ error: access.reason }); return; }

  const user = (req as AuthedRequest).atgUser!;
  const result = await generateProspectResearch({
    icp:          sanitiseText(parsed.data.icp, 500),
    prospects:    sanitiseText(parsed.data.prospects, 5000),
    businessName: parsed.data.businessName ? sanitiseShortText(parsed.data.businessName) : undefined,
    senderName:   user.name ?? undefined,
  });
  const wf = await ensureWf(cid, "prospect-research");
  const output = await makeOutput(cid, wf.id, "lead_list",
    `Prospect research — ${result.prospects.length} prospect${result.prospects.length !== 1 ? "s" : ""}`,
    JSON.stringify(result));
  res.status(201).json({ output, result });
});

// ── Run history ───────────────────────────────────────────────────────────────

router.get("/workbench/run-history", withUser, requireAuth, async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const skip = parseInt(req.query.skip as string ?? "0", 10) || 0;
  const take = Math.min(parseInt(req.query.take as string ?? "20", 10) || 20, 50);

  const runs = await prisma.workflowRun.findMany({
    where:   { workflow: { clientId: cid } },
    include: { workflow: { select: { name: true } } },
    orderBy: { runAt: "desc" },
    skip, take,
  });

  // Latest output per run
  const withOutputs = await Promise.all(runs.map(async (run) => {
    const output = await prisma.outputItem.findFirst({
      where: { workflowId: run.workflowId, createdAt: { gte: run.runAt } },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, subject: true, status: true, createdAt: true },
    });
    return { ...run, output };
  }));

  res.json(withOutputs);
});

// ── Admin: per-client workflow settings ───────────────────────────────────────

router.get("/admin/clients/:id/workflow-settings", withUser, requireAdmin, async (req, res) => {
  const clientId = req.params.id as string;
  const [templates, overrides] = await Promise.all([
    prisma.workflowTemplate.findMany({ select: { slug: true, name: true, minTier: true, enabled: true }, orderBy: { slug: "asc" } }),
    prisma.clientWorkflowSettings.findMany({ where: { clientId } }),
  ]);
  const overrideMap = Object.fromEntries(overrides.map((o) => [o.slug, o.enabled]));
  res.json(templates.map((t) => ({
    ...t,
    clientEnabled: overrideMap[t.slug] ?? null, // null = uses global enabled
  })));
});

const WorkflowSettingPatch = z.object({ enabled: z.boolean() });

router.patch("/admin/clients/:id/workflow-settings/:slug", withUser, requireAdmin, async (req, res) => {
  const parsed = WorkflowSettingPatch.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "enabled (boolean) is required." }); return; }
  const { id: clientId, slug } = { id: req.params.id as string, slug: req.params.slug as string };
  const setting = await prisma.clientWorkflowSettings.upsert({
    where: { clientId_slug: { clientId, slug } },
    create: { clientId, slug, enabled: parsed.data.enabled },
    update: { enabled: parsed.data.enabled },
  });
  res.json(setting);
});

export default router;
