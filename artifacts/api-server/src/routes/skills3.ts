/**
 * Phase 3 Workbench skills — Done-for-you tier.
 *
 * POST /api/workbench/faq-support            — FAQ build + support reply draft
 * POST /api/workbench/agent-pipeline/run     — run one step of a pipeline chain
 * POST /api/admin/clients/:id/agent-chains   — create pipeline chain
 * GET  /api/admin/clients/:id/agent-chains   — list chains
 * PATCH /api/admin/agent-chains/:id          — edit chain (slugs, name, enabled)
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";
import { sanitiseText, sanitiseShortText } from "../lib/sanitize";
import { buildFaqAndReply, runPipelineStep } from "../lib/llm";

const router = Router();
const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];

function cid(req: AuthedRequest, res: Parameters<typeof requireAuth>[1]): string | null {
  const id = req.atgUser?.clientId;
  if (!id) { res.status(404).json({ error: "Complete the intake first." }); return null; }
  return id;
}

async function checkAccess(clientId: string, slug: string) {
  const [client, template, override] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { tier: true } }),
    prisma.workflowTemplate.findUnique({ where: { slug }, select: { minTier: true, enabled: true } }),
    prisma.clientWorkflowSettings.findUnique({ where: { clientId_slug: { clientId, slug } } }),
  ]);
  if (!template?.enabled) return false;
  if (override && !override.enabled) return false;
  return TIER_ORDER.indexOf(client?.tier ?? "NONE") >= TIER_ORDER.indexOf(template.minTier);
}

async function ensureWf(clientId: string, slug: string) {
  const t = await prisma.workflowTemplate.findUnique({ where: { slug }, select: { name: true, description: true } });
  const ex = await prisma.workflow.findFirst({ where: { clientId, name: t?.name ?? slug } });
  if (ex) return prisma.workflow.update({ where: { id: ex.id }, data: { lastRunAt: new Date() } });
  return prisma.workflow.create({ data: { clientId, name: t?.name ?? slug, description: t?.description ?? "", area: "cs", status: "live", lastRunAt: new Date() } });
}

async function makeOutput(clientId: string, wfId: string, type: string, subject: string, content: string) {
  const out = await prisma.outputItem.create({ data: { workflowId: wfId, clientId, type, subject, content, status: "pending" } });
  await prisma.workflowRun.create({ data: { workflowId: wfId, status: "completed", summary: subject, outputCount: 1 } });
  return out;
}

// ── 9. FAQ + support replies ──────────────────────────────────────────────────

const FaqSupportBody = z.object({
  faqSource:        z.string().trim().min(1).max(10000),
  customerQuestion: z.string().max(500).optional(),
});

router.post("/workbench/faq-support", withUser, requireAuth, async (req, res) => {
  const clientId = cid(req as AuthedRequest, res);
  if (!clientId) return;
  const parsed = FaqSupportBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "faqSource is required." }); return; }
  if (!await checkAccess(clientId, "faq-support")) { res.status(403).json({ error: "This workflow requires the Done-for-you plan." }); return; }

  const result = await buildFaqAndReply({
    faqSource: sanitiseText(parsed.data.faqSource, 10000),
    customerQuestion: parsed.data.customerQuestion ? sanitiseShortText(parsed.data.customerQuestion) : undefined,
  });

  const wf = await ensureWf(clientId, "faq-support");
  const content = JSON.stringify(result);
  const subject = parsed.data.customerQuestion
    ? `FAQ build + reply draft${result.lowConfidence ? " (low confidence — review)" : ""}`
    : `FAQ knowledge base — ${result.faqItems.length} item${result.faqItems.length !== 1 ? "s" : ""}`;
  const output = await makeOutput(clientId, wf.id, "email_draft", subject, content);
  res.status(201).json({ output, result });
});

// ── 10. Agent pipeline ─────────────────────────────────────────────────────────

const PipelineRunBody = z.object({
  chainId:        z.string().min(1),
  stepIndex:      z.number().int().min(0),
  currentInput:   z.string().trim().min(1).max(5000),
  previousOutput: z.string().max(5000).optional(),
});

router.post("/workbench/agent-pipeline/run", withUser, requireAuth, async (req, res) => {
  const clientId = cid(req as AuthedRequest, res);
  if (!clientId) return;
  const parsed = PipelineRunBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "chainId, stepIndex, and currentInput are required." }); return; }
  if (!await checkAccess(clientId, "agent-pipeline")) { res.status(403).json({ error: "This workflow requires the Done-for-you plan." }); return; }

  const chain = await prisma.agentChain.findFirst({ where: { id: parsed.data.chainId, clientId, enabled: true } });
  if (!chain) { res.status(404).json({ error: "Chain not found or not enabled for your account." }); return; }

  const slugs: string[] = (() => { try { return JSON.parse(chain.slugs) as string[]; } catch { return []; } })();
  const slug = slugs[parsed.data.stepIndex];
  if (!slug) { res.status(422).json({ error: `Step index ${parsed.data.stepIndex} is out of range (chain has ${slugs.length} steps).` }); return; }

  const template = await prisma.workflowTemplate.findUnique({ where: { slug } });
  const result = await runPipelineStep({
    stepName:         template?.name ?? slug,
    stepInstructions: template?.systemPrompt?.slice(0, 2000) ?? "Process the input and produce useful output.",
    previousOutput:   parsed.data.previousOutput ? sanitiseText(parsed.data.previousOutput, 5000) : undefined,
    currentInput:     sanitiseText(parsed.data.currentInput, 5000),
  });

  const wf = await ensureWf(clientId, "agent-pipeline");
  const output = await makeOutput(clientId, wf.id, "briefing",
    `Pipeline step ${parsed.data.stepIndex + 1}: ${template?.name ?? slug}${!result.readyForNextStep ? " — review required" : ""}`,
    JSON.stringify(result));
  res.status(201).json({ output, result, totalSteps: slugs.length, nextStep: parsed.data.stepIndex + 1 < slugs.length ? parsed.data.stepIndex + 1 : null });
});

// ── Admin: agent chains ───────────────────────────────────────────────────────

const ChainSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  slugs:       z.array(z.string().min(1)).min(1).max(10),
  enabled:     z.boolean().optional(),
});

router.post("/admin/clients/:id/agent-chains", withUser, requireAdmin, async (req, res) => {
  const client = await prisma.client.findUnique({ where: { id: req.params.id as string } });
  if (!client) { res.status(404).json({ error: "Client not found." }); return; }
  const parsed = ChainSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "name and slugs are required." }); return; }
  const chain = await prisma.agentChain.create({
    data: { clientId: client.id, name: parsed.data.name, description: parsed.data.description ?? "", slugs: JSON.stringify(parsed.data.slugs) },
  });
  res.status(201).json(chain);
});

router.get("/admin/clients/:id/agent-chains", withUser, requireAdmin, async (req, res) => {
  const chains = await prisma.agentChain.findMany({ where: { clientId: req.params.id as string }, orderBy: { createdAt: "desc" } });
  res.json(chains);
});

router.patch("/admin/agent-chains/:id", withUser, requireAdmin, async (req, res) => {
  const parsed = ChainSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid fields." }); return; }
  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.slugs !== undefined) data.slugs = JSON.stringify(parsed.data.slugs);
  if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;
  const chain = await prisma.agentChain.update({ where: { id: req.params.id as string }, data });
  res.json(chain);
});

export default router;
