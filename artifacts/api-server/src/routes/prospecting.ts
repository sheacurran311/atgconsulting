/** Admin-only ATG prospect review. No automated outreach or external account connections. */
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, type AuthedRequest } from "../lib/auth";
import { assessProspect, mayAdvanceProspect, normalizeProspectDomain, type ProspectStatus } from "../lib/prospecting";
import { audit } from "../lib/audit";
import { generateProspectDraft } from "../lib/prospectDraft";

export function createProspectingRouter(resolve: RequestHandler = withUser) {
const router = Router();
router.use("/admin/prospecting", resolve, requireAdmin);

const Evidence = z.object({
  claim: z.string().trim().min(1).max(500),
  sourceUrl: z.string().url().refine((x) => /^https?:\/\//i.test(x)),
  observedAt: z.string().datetime(),
  verified: z.boolean(),
}).strict();
const Review = z.object({
  industryFit: z.number().int().min(0).max(5),
  sizeFit: z.number().int().min(0).max(5),
  observableNeed: z.number().int().min(0).max(5),
  contactConfidence: z.number().int().min(0).max(5),
  urgency: z.number().int().min(0).max(5),
  evidence: z.array(Evidence).max(30),
  suppressed: z.boolean(),
}).strict();
const Create = z.object({
  businessName: z.string().trim().min(1).max(160),
  website: z.string().trim().min(3).max(500),
  industry: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(5000).optional(),
}).strict();
const Patch = z.object({
  businessName: z.string().trim().min(1).max(160).optional(),
  industry: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(5000).optional(),
  review: Review.optional(),
  outreachDraft: z.string().trim().max(8000).optional(),
  nextStatus: z.enum(["NEW", "RESEARCHED", "QUALIFIED", "DISQUALIFIED", "DRAFT_READY", "APPROVED", "CONTACTED", "REPLIED", "BOOKED", "WON", "LOST", "SUPPRESSED"]).optional(),
  expectedUpdatedAt: z.string().datetime().optional(),
}).strict();

router.get("/admin/prospecting", async (_req, res) => {
  const rows = await prisma.atgProspect.findMany({ orderBy: { updatedAt: "desc" }, take: 200 });
  res.json(rows.map((p) => ({ ...p, review: p.reviewJson ? JSON.parse(p.reviewJson) : null })));
});

router.post("/admin/prospecting", async (req, res) => {
  const parsed = Create.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid prospect information." }); return; }
  const domain = normalizeProspectDomain(parsed.data.website);
  if (!domain) { res.status(422).json({ error: "Valid public website required." }); return; }
  const existing = await prisma.atgProspect.findUnique({ where: { domain }, select: { id: true } });
  if (existing) { res.status(409).json({ error: "Prospect domain already tracked.", id: existing.id }); return; }
  const created = await prisma.atgProspect.create({ data: {
    domain, businessName: parsed.data.businessName, website: parsed.data.website,
    industry: parsed.data.industry || "", notes: parsed.data.notes || "",
  } });
  res.status(201).json(created);
});

router.patch("/admin/prospecting/:id", async (req, res) => {
  const parsed = Patch.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid prospect update." }); return; }
  const actor = (req as AuthedRequest).atgUser!;
  const old = await prisma.atgProspect.findUnique({ where: { id: req.params.id } });
  if (!old) { res.status(404).json({ error: "Prospect not found." }); return; }
  const next = parsed.data.nextStatus;
  if (old.status === "SUPPRESSED") { res.status(409).json({ error: "Suppressed prospect is locked." }); return; }
  if (!parsed.data.expectedUpdatedAt || parsed.data.expectedUpdatedAt !== old.updatedAt.toISOString()) {
    res.status(409).json({ error: "Prospect changed since you opened it. Reload before editing." }); return;
  }
  if (old.status === "APPROVED" && parsed.data.review !== undefined && JSON.stringify(parsed.data.review) !== (old.reviewJson ?? "null")) {
    res.status(409).json({ error: "Return an approved draft to review before changing qualification evidence." }); return;
  }
  if (parsed.data.outreachDraft !== undefined && (old.status === "APPROVED" || next === "APPROVED")) {
    res.status(409).json({ error: "Approved drafts cannot be replaced without returning to review." }); return;
  }
  if (next && !mayAdvanceProspect(old.status as ProspectStatus, next)) {
    res.status(409).json({ error: "Invalid status transition; review and approval cannot be bypassed." }); return;
  }
  const review = parsed.data.review ?? (old.reviewJson ? Review.parse(JSON.parse(old.reviewJson)) : null);
  const score = review ? assessProspect(review) : null;
  if (next === "QUALIFIED" && score?.label !== "QUALIFIED") {
    res.status(422).json({ error: "Qualification requires verified evidence and sufficient contact confidence." }); return;
  }
  const draft = parsed.data.outreachDraft ?? old.outreachDraft;
  if ((next === "DRAFT_READY" || next === "APPROVED") && !draft.trim()) {
    res.status(422).json({ error: "Prepare an outreach draft before approval." }); return;
  }
  if (review?.suppressed && next !== "SUPPRESSED") {
    res.status(422).json({ error: "Suppressed prospects may not advance." }); return;
  }
  if (next === "APPROVED" && old.status !== "DRAFT_READY") {
    res.status(409).json({ error: "Review draft before approval." }); return;
  }
  const data = {
    businessName: parsed.data.businessName ?? old.businessName,
    industry: parsed.data.industry ?? old.industry,
    notes: parsed.data.notes ?? old.notes,
    reviewJson: review ? JSON.stringify(review) : old.reviewJson,
    score: score?.total ?? old.score,
    outreachDraft: draft,
    status: next ?? old.status,
    approvedById: next === "APPROVED" ? actor.id : next === "DRAFT_READY" ? null : old.approvedById,
    approvedAt: next === "APPROVED" ? new Date() : next === "DRAFT_READY" ? null : old.approvedAt,
  };
  const result = await prisma.atgProspect.updateMany({ where: { id: old.id, status: old.status, updatedAt: old.updatedAt }, data });
  if (result.count !== 1) { res.status(409).json({ error: "Prospect was modified concurrently. Reload and retry." }); return; }
  const changed = await prisma.atgProspect.findUniqueOrThrow({ where: { id: old.id } });
  await audit({ actorUserId: actor.id, action: "ATG_PROSPECT_UPDATE", entity: "AtgProspect", entityId: old.id, meta: { from: old.status, to: changed.status }, ip: req.ip });
  res.json({ ...changed, review: changed.reviewJson ? JSON.parse(changed.reviewJson) : null, scoreReview: score });
});

// Generate an unsent outreach draft from already verified evidence.
// Generation cannot bypass qualification or the later human APPROVED state.
router.post("/admin/prospecting/:id/draft", async (req, res) => {
  const parsed = z.object({ expectedUpdatedAt: z.string().datetime() }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Prospect revision is required." }); return; }
  const actor = (req as AuthedRequest).atgUser!;
  const prospect = await prisma.atgProspect.findUnique({ where: { id: req.params.id } });
  if (!prospect) { res.status(404).json({ error: "Prospect not found." }); return; }
  if (prospect.status !== "QUALIFIED") { res.status(409).json({ error: "Only qualified prospects can receive an outreach draft." }); return; }
  if (prospect.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) {
    res.status(409).json({ error: "Prospect changed. Reload before drafting." }); return;
  }
  const review = prospect.reviewJson ? Review.safeParse(JSON.parse(prospect.reviewJson)) : null;
  if (!review?.success || assessProspect(review.data).label !== "QUALIFIED") {
    res.status(422).json({ error: "Verified evidence and adequate qualification are required." }); return;
  }
  const generated = await generateProspectDraft({
    businessName: prospect.businessName,
    verifiedEvidence: review.data.evidence.filter(e => e.verified),
  });
  const saved = await prisma.atgProspect.updateMany({
    where: { id: prospect.id, status: "QUALIFIED", updatedAt: prospect.updatedAt },
    data: { outreachDraft: generated.draft, status: "DRAFT_READY", approvedAt: null, approvedById: null },
  });
  if (saved.count !== 1) {
    res.status(409).json({ error: "Prospect changed during drafting. Reload and retry." }); return;
  }
  const updated = await prisma.atgProspect.findUniqueOrThrow({ where: { id: prospect.id } });
  await audit({ actorUserId: actor.id, action: "ATG_PROSPECT_DRAFT_CREATED",
    entity: "AtgProspect", entityId: prospect.id,
    meta: { source: generated.source, status: "DRAFT_READY" }, ip: req.ip });
  res.json({ ...updated, review: updated.reviewJson ? JSON.parse(updated.reviewJson) : null,
    draftSource: generated.source });
});

return router;
}
export default createProspectingRouter();
