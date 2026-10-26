/**
 * Phase 1 Workbench skills — Self-serve workflows.
 * Every output lands in OutputItem awaiting client approval.
 * Nothing is sent automatically.
 *
 * POST /api/workbench/inbox-triage     — classify messages, draft replies
 * POST /api/workbench/review-request   — review request messages + reply drafts
 * POST /api/workbench/social-calendar  — content calendar + post drafts
 * POST /api/workbench/seo-audit        — server-side URL fetch + SEO fix list
 *
 * Auth: requireAuth + clientId required.
 * Tier: all available at SELF_SERVE and above (the WorkflowTemplate.minTier
 * enforces this; route checks tier against the DB template).
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, type AuthedRequest } from "../lib/auth";
import { sanitiseText, sanitiseShortText } from "../lib/sanitize";
import {
  triageInbox, generateReviewContent, generateSocialCalendar, runSeoAudit,
} from "../lib/llm";

const router = Router();
router.use(withUser, requireAuth);

const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];

function clientId(req: AuthedRequest, res: Parameters<typeof requireAuth>[1]): string | null {
  const id = req.atgUser?.clientId;
  if (!id) { res.status(404).json({ error: "Complete the intake and save your plan before running workflows." }); return null; }
  return id;
}

/** Check that the client tier meets the template minTier. */
async function checkTier(clientId: string, slug: string): Promise<boolean> {
  const [client, template] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { tier: true } }),
    prisma.workflowTemplate.findUnique({ where: { slug }, select: { minTier: true, enabled: true } }),
  ]);
  if (!template?.enabled) return false;
  const minIdx = TIER_ORDER.indexOf(template.minTier);
  const clientIdx = TIER_ORDER.indexOf(client?.tier ?? "NONE");
  return clientIdx >= minIdx;
}

/** Upsert the workflow for this client (creates if missing, updates lastRunAt). */
async function ensureWorkflow(clientId: string, slug: string): Promise<{ id: string }> {
  const template = await prisma.workflowTemplate.findUnique({
    where: { slug }, select: { name: true, description: true },
  });
  const existing = await prisma.workflow.findFirst({ where: { clientId, name: template?.name ?? slug } });
  if (existing) {
    return prisma.workflow.update({ where: { id: existing.id }, data: { lastRunAt: new Date() } });
  }
  return prisma.workflow.create({
    data: {
      clientId,
      name:      template?.name ?? slug,
      description: template?.description ?? "",
      area:      "sales",
      status:    "live",
      lastRunAt: new Date(),
    },
  });
}

/** Create a WorkflowRun + OutputItem and return the output. */
async function createOutput(clientId: string, workflowId: string, opts: {
  type: string; subject: string; content: string;
}) {
  const output = await prisma.outputItem.create({
    data: { workflowId, clientId, type: opts.type, subject: opts.subject, content: opts.content, status: "pending" },
  });
  await prisma.workflowRun.create({
    data: { workflowId, status: "completed", summary: opts.subject, outputCount: 1 },
  });
  await prisma.workflow.update({ where: { id: workflowId }, data: { lastRunAt: new Date() } });
  return output;
}

// ── 1. Inbox triage ───────────────────────────────────────────────────────────

const InboxTriageBody = z.object({
  messages:            z.string().trim().min(1).max(8000),
  businessDescription: z.string().max(300).optional(),
});

router.post("/workbench/inbox-triage", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const parsed = InboxTriageBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "messages is required.", issues: parsed.error.flatten() }); return; }
  if (!await checkTier(cid, "inbox-triage")) { res.status(403).json({ error: "Upgrade your plan to access inbox triage." }); return; }

  const user = (req as AuthedRequest).atgUser!;
  const result = await triageInbox({
    messages: sanitiseText(parsed.data.messages, 8000),
    businessDescription: parsed.data.businessDescription ? sanitiseShortText(parsed.data.businessDescription) : undefined,
    senderName: user.name ?? undefined,
  });

  const wf = await ensureWorkflow(cid, "inbox-triage");
  const output = await createOutput(cid, wf.id, {
    type: "email_draft",
    subject: `Inbox triage — ${result.items.length} message${result.items.length !== 1 ? "s" : ""} classified`,
    content: JSON.stringify(result.items),
  });
  res.status(201).json({ output, triage: result });
});

// ── 2. Review requests + replies ──────────────────────────────────────────────

const ReviewRequestBody = z.object({
  businessName: z.string().trim().min(1).max(100),
  businessType: z.string().trim().min(1).max(100),
  channels:     z.string().trim().min(1).max(200),
  reviews:      z.string().max(5000).optional(),
});

router.post("/workbench/review-request", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const parsed = ReviewRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "businessName, businessType, and channels are required." }); return; }
  if (!await checkTier(cid, "review-request")) { res.status(403).json({ error: "Upgrade your plan to access review workflows." }); return; }

  const user = (req as AuthedRequest).atgUser!;
  const result = await generateReviewContent({
    businessName: sanitiseShortText(parsed.data.businessName),
    businessType: sanitiseShortText(parsed.data.businessType),
    channels:     sanitiseShortText(parsed.data.channels),
    reviews:      parsed.data.reviews ? sanitiseText(parsed.data.reviews, 5000) : undefined,
    senderName:   user.name ?? undefined,
  });

  const wf = await ensureWorkflow(cid, "review-request");
  const output = await createOutput(cid, wf.id, {
    type: "review_request",
    subject: `Review content — ${result.requestMessages.length} request message${result.requestMessages.length !== 1 ? "s" : ""}${result.reviewReplies.length ? ` + ${result.reviewReplies.length} reply draft${result.reviewReplies.length !== 1 ? "s" : ""}` : ""}`,
    content: JSON.stringify(result),
  });
  res.status(201).json({ output, result });
});

// ── 3. Social content calendar ─────────────────────────────────────────────────

const SocialCalendarBody = z.object({
  businessDescription: z.string().trim().min(1).max(400),
  offers:    z.string().max(500).optional(),
  platforms: z.string().trim().min(1).max(200),
  cadence:   z.number().int().min(1).max(7).default(3),
  weeks:     z.number().int().min(1).max(4).default(2),
});

router.post("/workbench/social-calendar", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const parsed = SocialCalendarBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "businessDescription and platforms are required." }); return; }
  if (!await checkTier(cid, "social-calendar")) { res.status(403).json({ error: "Upgrade your plan to access social calendar." }); return; }

  const result = await generateSocialCalendar({
    businessDescription: sanitiseText(parsed.data.businessDescription, 400),
    offers:    parsed.data.offers ? sanitiseText(parsed.data.offers, 500) : undefined,
    platforms: sanitiseShortText(parsed.data.platforms),
    cadence:   parsed.data.cadence,
    weeks:     parsed.data.weeks,
  });

  const totalPosts = result.calendarWeeks.reduce((s, w) => s + w.posts.length, 0);
  const wf = await ensureWorkflow(cid, "social-calendar");
  const output = await createOutput(cid, wf.id, {
    type: "social_post",
    subject: `${parsed.data.weeks}-week social calendar — ${totalPosts} post draft${totalPosts !== 1 ? "s" : ""}`,
    content: JSON.stringify(result.calendarWeeks),
  });
  res.status(201).json({ output, calendar: result });
});

// ── 4. Local SEO audit ────────────────────────────────────────────────────────

const SeoAuditBody = z.object({
  url:          z.string().url().max(500),
  businessType: z.string().trim().min(1).max(100),
  cityArea:     z.string().max(100).optional(),
});

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_CHARS   = 80_000;

router.post("/workbench/seo-audit", async (req, res) => {
  const cid = clientId(req as AuthedRequest, res);
  if (!cid) return;
  const parsed = SeoAuditBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "url and businessType are required.", issues: parsed.error.flatten() }); return; }
  if (!await checkTier(cid, "seo-audit")) { res.status(403).json({ error: "Upgrade your plan to access SEO audit." }); return; }

  const { url, businessType, cityArea } = parsed.data;

  // Fetch the page server-side with a timeout. No paid APIs.
  let html = "";
  let fetchError: string | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ATG-SEO-Audit/1.0 (site audit; contact shea@atgconsulting.io)" },
    });
    clearTimeout(timer);
    if (!response.ok) {
      fetchError = `Page returned HTTP ${response.status}. Audit limited to URL structure only.`;
    } else {
      const text = await response.text();
      html = text.slice(0, MAX_HTML_CHARS);
    }
  } catch (err) {
    fetchError = err instanceof Error && err.name === "AbortError"
      ? "Page fetch timed out after 15 seconds. Audit limited to what was received."
      : "Page could not be fetched. Audit limited to URL structure only.";
  }

  const result = await runSeoAudit({
    html:         sanitiseText(html, MAX_HTML_CHARS),
    businessType: sanitiseShortText(businessType),
    cityArea:     cityArea ? sanitiseShortText(cityArea) : undefined,
  });

  const p0Count = result.findings.filter((f) => f.priority === "P0").length;
  const wf = await ensureWorkflow(cid, "seo-audit");
  const output = await createOutput(cid, wf.id, {
    type: "briefing",
    subject: `SEO audit — ${url.replace(/^https?:\/\//, "").split("/")[0]} · ${p0Count} critical issue${p0Count !== 1 ? "s" : ""}`,
    content: JSON.stringify({ ...result, url, fetchError }),
  });
  res.status(201).json({ output, audit: result, fetchError });
});

export default router;
