/**
 * Knowledge / Resources API
 *
 * Client:
 *   GET /api/knowledge                  — articles relevant to this client (filtered by tags)
 *   GET /api/knowledge/:slug            — single article
 *   GET /api/resources/tools            — client's personalised tool recommendations (from tool plan)
 *   GET /api/resources/platform-guides  — platform guides for the client's preferred AI platforms
 *
 * Admin:
 *   GET    /api/admin/knowledge          — all articles
 *   POST   /api/admin/knowledge          — create article
 *   PATCH  /api/admin/knowledge/:id      — edit
 *   DELETE /api/admin/knowledge/:id      — disable
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ArticleTags { verticals: string[]; tiers: string[]; platforms: string[] }

function parseTags(raw: string): ArticleTags {
  try { return JSON.parse(raw) as ArticleTags; } catch { return { verticals: [], tiers: [], platforms: [] }; }
}

function matchesClient(
  tags: ArticleTags,
  clientVertical: string | null,
  clientTier: string,
  clientPlatforms: string[],
): boolean {
  const { verticals, tiers, platforms } = tags;
  if (verticals.length > 0 && clientVertical && !verticals.includes(clientVertical)) return false;
  if (tiers.length > 0 && !tiers.includes(clientTier)) return false;
  if (platforms.length > 0 && clientPlatforms.length > 0) {
    if (!platforms.some((p) => clientPlatforms.includes(p))) return false;
  }
  return true;
}

// ── Client: knowledge articles ────────────────────────────────────────────────

router.get("/knowledge", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;

  const client = user.clientId
    ? await prisma.client.findUnique({
        where: { id: user.clientId },
        select: { tier: true, industry: true, intakes: { orderBy: { createdAt: "desc" }, take: 1, select: { answers: true } } },
      })
    : null;

  const clientTier = client?.tier ?? "NONE";
  const clientVertical = client?.industry ?? null;
  const answers = (() => {
    try { return JSON.parse(client?.intakes[0]?.answers ?? "{}") as Record<string, unknown>; }
    catch { return {}; }
  })();
  const clientPlatforms: string[] = Array.isArray(answers.aiPlatforms) ? (answers.aiPlatforms as string[]) : [];

  const articles = await prisma.knowledgeArticle.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
  });

  // Filter to articles relevant to this client; if no filter matches, return all
  const relevant = articles.filter((a) => matchesClient(parseTags(a.tags), clientVertical, clientTier, clientPlatforms));
  res.json((relevant.length > 0 ? relevant : articles).map((a) => ({
    id: a.id, slug: a.slug, title: a.title, body: a.body,
    tags: parseTags(a.tags), sortOrder: a.sortOrder,
  })));
});

router.get("/knowledge/:slug", withUser, requireAuth, async (req, res) => {
  const article = await prisma.knowledgeArticle.findFirst({
    where: { slug: req.params.slug as string, enabled: true },
  });
  if (!article) { res.status(404).json({ error: "Article not found." }); return; }
  res.json({ id: article.id, slug: article.slug, title: article.title, body: article.body, tags: parseTags(article.tags) });
});

// ── Client: personalised tool recommendations ─────────────────────────────────

router.get("/resources/tools", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;

  // 1. Get tools from the client's approved tool plan
  const toolPlanTools: { name: string; slug?: string; why: string; costNote: string }[] = [];
  if (user.clientId) {
    const plan = await prisma.toolPlan.findFirst({
      where: { clientId: user.clientId, status: { in: ["approved", "draft"] } },
      orderBy: { createdAt: "desc" },
      select: { toolsJson: true },
    });
    if (plan?.toolsJson) {
      try {
        const parsed = JSON.parse(plan.toolsJson) as { name: string; slug?: string; why: string; costNote: string }[];
        toolPlanTools.push(...parsed);
      } catch { /* ignore */ }
    }
  }

  // 2. Enrich with Tool DB data (add goUrl, featured flag, description)
  const slugs = toolPlanTools.map((t) => t.slug).filter((s): s is string => !!s);
  const dbTools = slugs.length > 0
    ? await prisma.tool.findMany({ where: { slug: { in: slugs }, enabled: true } })
    : [];
  const dbMap = Object.fromEntries(dbTools.map((t) => [t.slug, t]));

  const enriched = toolPlanTools.map((t) => {
    const db = t.slug ? dbMap[t.slug] : undefined;
    return {
      name: t.name,
      slug: t.slug ?? null,
      why: t.why,
      costNote: t.costNote,
      goUrl: t.slug ? `/go/${t.slug}` : null,
      officialUrl: db?.officialUrl ?? null,
      description: db?.description ?? null,
      category: db?.category ?? null,
      hasReferral: db?.hasReferral ?? false,
    };
  });

  // 3. Also surface featured tools not already in the plan
  const planSlugs = new Set(toolPlanTools.map((t) => t.slug).filter(Boolean));
  const featuredTools = await prisma.tool.findMany({
    where: { featured: true, enabled: true, slug: { notIn: Array.from(planSlugs) as string[] } },
    orderBy: { sortOrder: "asc" },
    take: 6,
  });

  res.json({
    planTools: enriched,
    featuredTools: featuredTools.map((t) => ({
      name: t.name, slug: t.slug, why: t.description,
      goUrl: `/go/${t.slug}`, officialUrl: t.officialUrl,
      description: t.description, category: t.category, hasReferral: t.hasReferral,
    })),
    affiliateDisclosure: "Some links are referral links; ATG may earn credit at no extra cost to you.",
  });
});

// ── Client: platform-specific setup guides ────────────────────────────────────

router.get("/resources/platform-guides", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;

  // Determine client's preferred platforms from intake
  let platforms: string[] = [];
  if (user.clientId) {
    const intake = await prisma.intake.findFirst({
      where: { clientId: user.clientId },
      orderBy: { createdAt: "desc" },
      select: { answers: true },
    });
    const answers = (() => {
      try { return JSON.parse(intake?.answers ?? "{}") as Record<string, unknown>; }
      catch { return {}; }
    })();
    if (Array.isArray(answers.aiPlatforms)) {
      platforms = (answers.aiPlatforms as string[]).filter((p) => p !== "none" && p !== "not_sure");
    }
  }

  // Map platform slugs to knowledge article slugs
  const PLATFORM_SLUG_MAP: Record<string, string> = {
    grok_bot: "grok-bot-getting-started",
    claude: "claude-getting-started",
    chatgpt: "chatgpt-getting-started",
  };

  const targetSlugs = platforms.length > 0
    ? platforms.map((p) => PLATFORM_SLUG_MAP[p]).filter(Boolean)
    : Object.values(PLATFORM_SLUG_MAP); // show all if no preference

  const guides = await prisma.knowledgeArticle.findMany({
    where: { slug: { in: targetSlugs as string[] }, enabled: true },
    orderBy: { sortOrder: "asc" },
  });

  res.json(guides.map((g) => ({
    id: g.id, slug: g.slug, title: g.title, body: g.body,
  })));
});

// ── Admin: knowledge articles ─────────────────────────────────────────────────

const ArticleBody = z.object({
  slug:      z.string().min(1).max(120).regex(/^[a-z0-9-]+$/).optional(),
  title:     z.string().min(1).max(200),
  body:      z.string().max(50_000),
  tags:      z.object({
    verticals: z.array(z.string()).optional(),
    tiers:     z.array(z.string()).optional(),
    platforms: z.array(z.string()).optional(),
  }).optional(),
  enabled:   z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.get("/admin/knowledge", withUser, requireAuth, requireAdmin, async (_req, res) => {
  const articles = await prisma.knowledgeArticle.findMany({ orderBy: { sortOrder: "asc" } });
  res.json(articles.map((a) => ({ ...a, tags: parseTags(a.tags) })));
});

router.post("/admin/knowledge", withUser, requireAuth, requireAdmin, async (req, res) => {
  const parsed = ArticleBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }
  const { tags, slug, ...rest } = parsed.data;
  const generatedSlug = slug ?? rest.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const article = await prisma.knowledgeArticle.create({
    data: { slug: generatedSlug, ...rest, body: rest.body ?? "", tags: JSON.stringify(tags ?? {}) },
  });
  res.status(201).json({ ...article, tags: parseTags(article.tags) });
});

router.patch("/admin/knowledge/:id", withUser, requireAuth, requireAdmin, async (req, res) => {
  const article = await prisma.knowledgeArticle.findUnique({ where: { id: req.params.id as string } });
  if (!article) { res.status(404).json({ error: "Article not found." }); return; }
  const parsed = ArticleBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }
  const { tags, ...rest } = parsed.data;
  const updated = await prisma.knowledgeArticle.update({
    where: { id: article.id },
    data: { ...rest, ...(tags ? { tags: JSON.stringify(tags) } : {}) },
  });
  res.json({ ...updated, tags: parseTags(updated.tags) });
});

router.delete("/admin/knowledge/:id", withUser, requireAuth, requireAdmin, async (req, res) => {
  const article = await prisma.knowledgeArticle.findUnique({ where: { id: req.params.id as string } });
  if (!article) { res.status(404).json({ error: "Article not found." }); return; }
  await prisma.knowledgeArticle.update({ where: { id: article.id }, data: { enabled: false } });
  res.json({ ok: true });
});

export default router;
