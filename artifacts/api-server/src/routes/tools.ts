/**
 * Tools / Resources API
 *
 * Public:
 *   GET /api/tools              — list enabled tools (client-facing resources page)
 *   GET /api/tools/:slug        — single tool
 *
 * Admin:
 *   GET    /api/admin/tools              — all tools (including disabled)
 *   POST   /api/admin/tools              — create tool
 *   PATCH  /api/admin/tools/:id          — edit tool (set referralUrl, pricingNote, etc.)
 *   DELETE /api/admin/tools/:id          — soft-delete (sets enabled=false)
 *   GET    /api/admin/tools/export.csv   — CSV export
 *   POST   /api/admin/tools/import       — bulk CSV import (upsert by slug)
 *   GET    /api/admin/tools/clicks       — click counts per tool
 *   GET    /api/admin/tools/clicks/client/:clientId — clicks for one client
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJsonArray(raw: string): string[] {
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; }
  catch { return []; }
}

const ToolBody = z.object({
  slug:               z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
  name:               z.string().min(1).max(200),
  category:           z.string().min(1).max(80),
  description:        z.string().max(1000).optional(),
  bestForVerticals:   z.array(z.string()).optional(),
  pricingNote:        z.string().max(500).optional(),
  officialUrl:        z.string().url().max(500),
  referralUrl:        z.string().max(500).optional(),
  hasReferral:        z.boolean().optional(),
  referralNotes:      z.string().max(500).optional(),
  platformsSupported: z.array(z.string()).optional(),
  setupGuideLink:     z.string().max(500).optional(),
  logo:               z.string().max(500).optional(),
  featured:           z.boolean().optional(),
  enabled:            z.boolean().optional(),
  sortOrder:          z.number().int().optional(),
});

// ── Public ─────────────────────────────────────────────────────────────────────

router.get("/tools", withUser, async (_req, res) => {
  const tools = await prisma.tool.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  res.json(tools.map(formatTool));
});

router.get("/tools/:slug", withUser, async (req, res) => {
  const tool = await prisma.tool.findFirst({
    where: { slug: req.params.slug as string, enabled: true },
  });
  if (!tool) { res.status(404).json({ error: "Tool not found." }); return; }
  res.json(formatTool(tool));
});

function formatTool(tool: {
  id: string; slug: string; name: string; category: string; description: string;
  bestForVerticals: string; pricingNote: string; officialUrl: string;
  referralUrl: string; hasReferral: boolean; platformsSupported: string;
  setupGuideLink: string; logo: string; featured: boolean; enabled: boolean; sortOrder: number;
  referralNotes?: string; createdAt?: Date; updatedAt?: Date;
}) {
  return {
    id:                 tool.id,
    slug:               tool.slug,
    name:               tool.name,
    category:           tool.category,
    description:        tool.description,
    bestForVerticals:   parseJsonArray(tool.bestForVerticals),
    pricingNote:        tool.pricingNote,
    /** Public-facing URL goes through /go/:slug for tracking */
    goUrl:              `/go/${tool.slug}`,
    officialUrl:        tool.officialUrl,
    hasReferral:        tool.hasReferral,
    platformsSupported: parseJsonArray(tool.platformsSupported),
    setupGuideLink:     tool.setupGuideLink,
    logo:               tool.logo,
    featured:           tool.featured,
    enabled:            tool.enabled,
    sortOrder:          tool.sortOrder,
  };
}

// ── Admin ─────────────────────────────────────────────────────────────────────

router.get("/admin/tools", withUser, requireAuth, requireAdmin, async (_req, res) => {
  const tools = await prisma.tool.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const counts = await prisma.toolClick.groupBy({ by: ["toolId"], _count: { id: true } });
  const countMap = Object.fromEntries(counts.map((c) => [c.toolId, c._count.id]));
  res.json(tools.map((t) => ({ ...t, clickCount: countMap[t.id] ?? 0 })));
});

router.post("/admin/tools", withUser, requireAuth, requireAdmin, async (req, res) => {
  const parsed = ToolBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }
  const { bestForVerticals = [], platformsSupported = [], slug, ...rest } = parsed.data;
  const generatedSlug = slug ?? rest.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const existing = await prisma.tool.findUnique({ where: { slug: generatedSlug } });
  if (existing) { res.status(409).json({ error: "A tool with this slug already exists." }); return; }
  const tool = await prisma.tool.create({
    data: {
      slug: generatedSlug,
      ...rest,
      description: rest.description ?? "",
      pricingNote: rest.pricingNote ?? "",
      referralUrl: rest.referralUrl ?? "",
      referralNotes: rest.referralNotes ?? "",
      setupGuideLink: rest.setupGuideLink ?? "",
      logo: rest.logo ?? "",
      bestForVerticals: JSON.stringify(bestForVerticals),
      platformsSupported: JSON.stringify(platformsSupported),
    },
  });
  res.status(201).json(tool);
});

router.patch("/admin/tools/:id", withUser, requireAuth, requireAdmin, async (req, res) => {
  const tool = await prisma.tool.findUnique({ where: { id: req.params.id as string } });
  if (!tool) { res.status(404).json({ error: "Tool not found." }); return; }
  const parsed = ToolBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }
  const { bestForVerticals, platformsSupported, ...rest } = parsed.data;
  const updated = await prisma.tool.update({
    where: { id: tool.id },
    data: {
      ...rest,
      ...(bestForVerticals !== undefined ? { bestForVerticals: JSON.stringify(bestForVerticals) } : {}),
      ...(platformsSupported !== undefined ? { platformsSupported: JSON.stringify(platformsSupported) } : {}),
    },
  });
  res.json(updated);
});

router.delete("/admin/tools/:id", withUser, requireAuth, requireAdmin, async (req, res) => {
  const tool = await prisma.tool.findUnique({ where: { id: req.params.id as string } });
  if (!tool) { res.status(404).json({ error: "Tool not found." }); return; }
  await prisma.tool.update({ where: { id: tool.id }, data: { enabled: false } });
  res.json({ ok: true });
});

// ── CSV export ────────────────────────────────────────────────────────────────

const CSV_COLS = ["slug","name","category","description","officialUrl","referralUrl","hasReferral","pricingNote","featured","enabled","sortOrder"];

router.get("/admin/tools/export.csv", withUser, requireAuth, requireAdmin, async (_req, res) => {
  const tools = await prisma.tool.findMany({ orderBy: { sortOrder: "asc" } });
  const header = CSV_COLS.join(",");
  const rows = tools.map((t) =>
    CSV_COLS.map((col) => {
      const v = (t as Record<string, unknown>)[col];
      const s = v === null || v === undefined ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")
  );
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="atg-tools.csv"');
  res.send([header, ...rows].join("\n"));
});

// ── CSV import (upsert by slug) ───────────────────────────────────────────────

const ImportRow = z.object({
  slug:        z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  name:        z.string().min(1).max(200),
  category:    z.string().min(1).max(80),
  description: z.string().max(1000).optional(),
  officialUrl: z.string().url(),
  referralUrl: z.string().max(500).optional(),
  hasReferral: z.string().optional(),
  pricingNote: z.string().max(500).optional(),
  featured:    z.string().optional(),
  enabled:     z.string().optional(),
  sortOrder:   z.string().optional(),
});

router.post("/admin/tools/import", withUser, requireAuth, requireAdmin, async (req, res) => {
  const body = z.object({ csv: z.string().min(1).max(500_000) }).safeParse(req.body);
  if (!body.success) { res.status(422).json({ error: "Send { csv: '...' }" }); return; }

  const lines = body.data.csv.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) { res.status(422).json({ error: "CSV must have a header row and at least one data row." }); return; }

  const headers = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const results: { slug: string; action: string; error?: string }[] = [];

  for (const line of lines.slice(1)) {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });

    const parsed = ImportRow.safeParse(row);
    if (!parsed.success) {
      results.push({ slug: row.slug ?? "?", action: "skip", error: parsed.error.issues[0]?.message });
      continue;
    }
    const d = parsed.data;
    try {
      await prisma.tool.upsert({
        where: { slug: d.slug },
        create: {
          slug: d.slug, name: d.name, category: d.category,
          description: d.description ?? "", officialUrl: d.officialUrl,
          referralUrl: d.referralUrl ?? "", pricingNote: d.pricingNote ?? "",
          hasReferral: d.hasReferral === "true",
          featured: d.featured === "true",
          enabled: d.enabled !== "false",
          sortOrder: parseInt(d.sortOrder ?? "0", 10) || 0,
        },
        update: {
          name: d.name, category: d.category,
          description: d.description ?? undefined,
          officialUrl: d.officialUrl,
          referralUrl: d.referralUrl ?? undefined,
          pricingNote: d.pricingNote ?? undefined,
          hasReferral: d.hasReferral !== undefined ? d.hasReferral === "true" : undefined,
          featured: d.featured !== undefined ? d.featured === "true" : undefined,
          enabled: d.enabled !== undefined ? d.enabled !== "false" : undefined,
          sortOrder: d.sortOrder !== undefined ? (parseInt(d.sortOrder, 10) || 0) : undefined,
        },
      });
      results.push({ slug: d.slug, action: "upserted" });
    } catch (err) {
      results.push({ slug: d.slug, action: "error", error: err instanceof Error ? err.message : "Unknown error" });
    }
  }
  res.json({ imported: results.filter((r) => r.action === "upserted").length, results });
});

// ── Click analytics ───────────────────────────────────────────────────────────

router.get("/admin/tools/clicks", withUser, requireAuth, requireAdmin, async (_req, res) => {
  const counts = await prisma.toolClick.groupBy({
    by: ["toolId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  const tools = await prisma.tool.findMany({ select: { id: true, name: true, slug: true } });
  const toolMap = Object.fromEntries(tools.map((t) => [t.id, t]));
  res.json(counts.map((c) => ({
    tool: toolMap[c.toolId],
    clicks: c._count.id,
  })));
});

router.get("/admin/tools/clicks/client/:clientId", withUser, requireAuth, requireAdmin, async (req, res) => {
  const clicks = await prisma.toolClick.findMany({
    where: { clientId: req.params.clientId as string },
    include: { tool: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(clicks);
});

export default router;
