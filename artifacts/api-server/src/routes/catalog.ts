/**
 * Recommendation catalog routes.
 *
 * Public:
 *   GET /api/catalog                    — verified + enabled items (client portal)
 *   GET /api/catalog/chips              — suggested pain chips for a business type
 *
 * Admin:
 *   GET    /api/admin/catalog            — all items (including unverified)
 *   POST   /api/admin/catalog            — create item
 *   PATCH  /api/admin/catalog/:id        — edit item
 *   DELETE /api/admin/catalog/:id        — disable item
 *   POST   /api/admin/catalog/import     — bulk import (CSV string or JSON array)
 *   POST   /api/admin/catalog/import-url — fetch a URL and extract metadata
 *   GET    /api/admin/catalog/queue      — review queue (pending items)
 *   POST   /api/admin/catalog/verify-batch — verify link-checked pending items
 *   POST   /api/admin/catalog/:id/verify — mark verified
 *   POST   /api/admin/catalog/:id/reject — reject with note
 *
 * Matching:
 *   POST /api/admin/catalog/match/:intakeId — run matching for an intake
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, requireAuth, type AuthedRequest } from "../lib/auth";
import { classifyPainPoints, matchAndRankCatalog, getPainChips } from "../lib/catalogAI";
import { audit } from "../lib/audit";

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────

router.get("/catalog", withUser, async (_req, res) => {
  const items = await prisma.catalogItem.findMany({
    where: { verified: true, enabled: true },
    orderBy: [{ sourceType: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, sourceType: true, sourceUrl: true,
      description: true, howItHelps: true, tags: true, tierFit: true,
    },
  });
  res.json(items);
});

router.get("/catalog/chips", async (req, res) => {
  const { industry } = req.query as { industry?: string };
  res.json({ chips: getPainChips(industry ?? null) });
});

// ── Admin: CRUD ───────────────────────────────────────────────────────────────

const ItemBody = z.object({
  name:        z.string().min(1).max(300),
  sourceType:  z.enum(["grok_bot_template","claude_skill","claude_plugin","chatgpt_gpt","mcp_connector","atg_template"]),
  sourceUrl:   z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  howItHelps:  z.string().max(500).optional(),
  tags:        z.object({
    departments: z.array(z.string()).optional(),
    tasks:       z.array(z.string()).optional(),
    industries:  z.array(z.string()).optional(),
  }).optional(),
  tierFit:     z.enum(["SELF_SERVE","GUIDED","WHITE_GLOVE","all"]).optional(),
  referralUrl: z.string().max(500).optional(),
  enabled:     z.boolean().optional(),
});

router.get("/admin/catalog", withUser, requireAdmin, async (req, res) => {
  const { status, source } = req.query as { status?: string; source?: string };
  const where: Record<string, unknown> = {};
  if (status) where.reviewStatus = status;
  if (source) where.sourceType = source;
  const items = await prisma.catalogItem.findMany({
    where, orderBy: { createdAt: "desc" }, take: 200,
  });
  res.json(items);
});

router.post("/admin/catalog", withUser, requireAdmin, async (req, res) => {
  const parsed = ItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }
  const { tags, ...rest } = parsed.data;
  const item = await prisma.catalogItem.create({
    data: { ...rest, sourceUrl: rest.sourceUrl ?? "", description: rest.description ?? "", howItHelps: rest.howItHelps ?? "", tags: JSON.stringify(tags ?? {}), tierFit: rest.tierFit ?? "all", referralUrl: rest.referralUrl ?? "" },
  });
  res.status(201).json(item);
});

router.patch("/admin/catalog/:id", withUser, requireAdmin, async (req, res) => {
  const item = await prisma.catalogItem.findUnique({ where: { id: req.params.id as string } });
  if (!item) { res.status(404).json({ error: "Not found." }); return; }
  const parsed = ItemBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed." }); return; }
  const { tags, ...rest } = parsed.data;
  const updated = await prisma.catalogItem.update({
    where: { id: item.id },
    data: { ...rest, ...(tags !== undefined ? { tags: JSON.stringify(tags) } : {}) },
  });
  res.json(updated);
});

router.delete("/admin/catalog/:id", withUser, requireAdmin, async (req, res) => {
  await prisma.catalogItem.update({ where: { id: req.params.id as string }, data: { enabled: false } });
  res.json({ ok: true });
});

// ── Admin: bulk import ────────────────────────────────────────────────────────

router.post("/admin/catalog/import", withUser, requireAdmin, async (req, res) => {
  const body = z.object({
    format: z.enum(["json", "csv"]),
    data:   z.string().min(1).max(500_000),
  }).safeParse(req.body);
  if (!body.success) { res.status(422).json({ error: "Send { format: 'json'|'csv', data: '...' }" }); return; }

  let items: Partial<z.infer<typeof ItemBody>>[] = [];

  if (body.data.format === "json") {
    try {
      const parsed = JSON.parse(body.data.data) as unknown;
      items = Array.isArray(parsed) ? (parsed as Partial<z.infer<typeof ItemBody>>[]) : [parsed as Partial<z.infer<typeof ItemBody>>];
    } catch { res.status(422).json({ error: "Invalid JSON." }); return; }
  } else {
    // CSV: name,sourceType,sourceUrl,description,howItHelps,tierFit
    const lines = body.data.data.split("\n").map((l) => l.trim()).filter(Boolean);
    const headers = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
    for (const line of lines.slice(1)) {
      const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
      items.push({ name: row.name, sourceType: row.sourcetype as z.infer<typeof ItemBody>["sourceType"], sourceUrl: row.sourceurl, description: row.description, howItHelps: row.howItHelps ?? row.howithelps, tierFit: (row.tierfit as z.infer<typeof ItemBody>["tierFit"]) ?? "all" });
    }
  }

  const results: { name: string; action: string; error?: string }[] = [];
  for (const raw of items) {
    if (!raw.name || !raw.sourceType) { results.push({ name: raw.name ?? "?", action: "skip", error: "name and sourceType are required" }); continue; }
    try {
      await prisma.catalogItem.create({
        data: {
          name: raw.name,
          sourceType: raw.sourceType,
          sourceUrl: raw.sourceUrl ?? "",
          description: raw.description ?? "",
          howItHelps: raw.howItHelps ?? "",
          tags: "{}",
          tierFit: raw.tierFit ?? "all",
          reviewStatus: "pending",
        },
      });
      results.push({ name: raw.name, action: "created" });
    } catch (err) {
      results.push({ name: raw.name, action: "error", error: err instanceof Error ? err.message : "unknown" });
    }
  }
  res.json({ imported: results.filter((r) => r.action === "created").length, results });
});

// ── Admin: import from URL ────────────────────────────────────────────────────

router.post("/admin/catalog/import-url", withUser, requireAdmin, async (req, res) => {
  const body = z.object({
    url:        z.string().url(),
    sourceType: z.enum(["grok_bot_template","claude_skill","claude_plugin","chatgpt_gpt","mcp_connector","atg_template"]).optional(),
  }).safeParse(req.body);
  if (!body.success) { res.status(422).json({ error: "url is required." }); return; }

  let title = "";
  let desc = "";
  try {
    const response = await fetch(body.data.url, {
      headers: { "User-Agent": "ATG-Consulting-Catalog-Bot/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await response.text();
    // Extract title and meta description
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const metaMatch  = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    title = (titleMatch?.[1] ?? "").trim().slice(0, 200);
    desc  = (metaMatch?.[1]  ?? "").trim().slice(0, 1000);
  } catch {
    res.status(422).json({ error: "Could not fetch the URL. Check it's publicly accessible." }); return;
  }

  const item = await prisma.catalogItem.create({
    data: {
      name:        title || body.data.url,
      sourceType:  body.data.sourceType ?? "chatgpt_gpt",
      sourceUrl:   body.data.url,
      description: desc,
      howItHelps:  "",
      tags:        "{}",
      tierFit:     "all",
      reviewStatus:"pending",
      lastCheckedAt: new Date(),
    },
  });
  res.status(201).json({ ok: true, item, message: "Added to review queue. Fill in howItHelps and tags before verifying." });
});

// ── Admin: review queue ───────────────────────────────────────────────────────

router.get("/admin/catalog/queue", withUser, requireAdmin, async (_req, res) => {
  const items = await prisma.catalogItem.findMany({
    where: { reviewStatus: "pending" },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  res.json(items);
});

router.post("/admin/catalog/verify-batch", withUser, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]).filter((id): id is string => typeof id === "string") : null;
  const pending = await prisma.catalogItem.findMany({
    where: {
      reviewStatus: "pending",
      verified: false,
      enabled: true,
      sourceUrl: { not: "" },
      lastCheckedAt: { not: null },
      ...(ids ? { id: { in: ids } } : {}),
    },
    select: { id: true, name: true, sourceType: true },
    take: 100,
  });
  if (pending.length === 0) {
    res.json({ verified: 0, items: [] });
    return;
  }
  const now = new Date();
  await prisma.catalogItem.updateMany({
    where: { id: { in: pending.map((item) => item.id) } },
    data: { verified: true, verifiedAt: now, verifiedBy: actor.email, reviewStatus: "approved" },
  });
  await audit({
    actorUserId: actor.id,
    action: "CATALOG_VERIFIED_BATCH",
    entity: "CatalogItem",
    entityId: pending[0]!.id,
    meta: { count: pending.length },
  });
  res.json({ verified: pending.length, items: pending });
});

router.post("/admin/catalog/:id/verify", withUser, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const item = await prisma.catalogItem.findUnique({ where: { id: req.params.id as string } });
  if (!item) { res.status(404).json({ error: "Not found." }); return; }
  const updated = await prisma.catalogItem.update({
    where: { id: item.id },
    data: { verified: true, verifiedAt: new Date(), verifiedBy: actor.email, reviewStatus: "approved" },
  });
  await audit({ actorUserId: actor.id, action: "CATALOG_VERIFIED", entity: "CatalogItem", entityId: item.id, meta: { name: item.name, sourceType: item.sourceType } });
  res.json(updated);
});

router.post("/admin/catalog/:id/reject", withUser, requireAdmin, async (req, res) => {
  const { note } = req.body as { note?: string };
  await prisma.catalogItem.update({
    where: { id: req.params.id as string },
    data: { reviewStatus: "rejected", reviewNotes: note ?? "", enabled: false },
  });
  res.json({ ok: true });
});

// ── Matching: run catalog match for an intake ─────────────────────────────────

router.post("/admin/catalog/match/:intakeId", withUser, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const intake = await prisma.discoveryIntake.findUnique({ where: { id: req.params.intakeId as string } });
  if (!intake) { res.status(404).json({ error: "Intake not found." }); return; }

  // Get pain text from answers
  const answers: Array<{ id: string; answer: string }> = (() => {
    try { return JSON.parse(intake.answers) as Array<{ id: string; answer: string }>; } catch { return []; }
  })();
  const painText = answers.find((a) => a.id === "top_problems")?.answer
    ?? answers.map((a) => a.answer).join(" ").slice(0, 800);

  const industry = answers.find((a) => a.id === "business_type")?.answer ?? null;

  // Classify pain points
  const classification = await classifyPainPoints(painText, industry);

  // Save classification
  await prisma.discoveryIntake.update({
    where: { id: intake.id },
    data: {
      painClassification: JSON.stringify(classification),
      tokensUsed: { increment: classification.tokensUsed },
    },
  });

  // Fetch verified catalog items
  const catalogItems = await prisma.catalogItem.findMany({
    where: { verified: true, enabled: true },
    select: { id: true, name: true, description: true, howItHelps: true, tags: true, sourceType: true, tierFit: true },
  });

  const helpStyleFromAnswers = answers.find((a) => a.id === "preferredHelp")?.answer ?? answers.find((a) => a.id === "decision_authority")?.answer;
  const clientTier = helpStyleFromAnswers?.includes("done_for_you") ? "WHITE_GLOVE"
    : helpStyleFromAnswers?.includes("guided") ? "GUIDED" : "SELF_SERVE";

  const { matches, tokensUsed: matchTokens } = await matchAndRankCatalog(
    classification, clientTier, catalogItems, null
  );

  // Store matches in DB
  await prisma.catalogMatch.deleteMany({ where: { intakeId: intake.id } });
  const created: string[] = [];
  for (const m of matches) {
    if (!m.itemId) continue; // gap items don't have a real catalogItem
    const exists = await prisma.catalogItem.findUnique({ where: { id: m.itemId } });
    if (!exists) continue;
    await prisma.catalogMatch.create({
      data: {
        intakeId:       intake.id,
        catalogItemId:  m.itemId,
        painPoint:      m.painPoint,
        score:          m.score,
        rankExplanation:m.rankExplanation,
        isGap:          m.isGap,
      },
    });
    created.push(m.itemId);
  }

  if (matchTokens > 0) {
    await prisma.discoveryIntake.update({
      where: { id: intake.id },
      data: { tokensUsed: { increment: matchTokens } },
    });
  }

  await audit({ actorUserId: actor.id, action: "CATALOG_MATCHED", entity: "DiscoveryIntake", entityId: intake.id, meta: { matchCount: matches.length, tokensUsed: classification.tokensUsed + matchTokens } });

  res.json({ ok: true, classification, matches, matchCount: created.length });
});

// ── Client: get matches for their approved intake ─────────────────────────────

router.get("/client/catalog-matches", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.json([]); return; }

  const intake = await prisma.discoveryIntake.findFirst({
    where: { clientId: user.clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!intake) { res.json([]); return; }

  const matches = await prisma.catalogMatch.findMany({
    where: { intakeId: intake.id, catalogItem: { verified: true, enabled: true } },
    include: { catalogItem: { select: { name: true, sourceType: true, sourceUrl: true, howItHelps: true, tierFit: true } } },
    orderBy: { score: "desc" },
  });
  res.json(matches);
});

export default router;
