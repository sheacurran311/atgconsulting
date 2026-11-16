/**
 * Content / Blog routes.
 *
 * Public:
 *   GET /api/content              — published posts (list)
 *   GET /api/content/:slug        — single published post
 *   GET /api/content/feed.rss     — RSS 2.0 feed
 *   GET /api/content/sitemap.xml  — sitemap fragment for blog posts
 *
 * Admin:
 *   GET    /api/admin/content          — all posts (any status)
 *   POST   /api/admin/content          — create draft manually
 *   PATCH  /api/admin/content/:id      — edit
 *   POST   /api/admin/content/:id/approve  — approve → status='approved'
 *   POST   /api/admin/content/:id/publish  — publish → status='published', sets publishAt=now
 *   DELETE /api/admin/content/:id      — soft-delete (sets status='archived')
 *   POST   /api/admin/content/generate — generate a new draft with Grok
 */

import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAdmin } from "../lib/auth";
import { generateContentDraft } from "../lib/contentAI";
import { audit } from "../lib/audit";
import type { AuthedRequest } from "../lib/auth";

export function createContentRouter(resolve: RequestHandler = withUser) {
const router = Router();

const APP_URL = process.env.APP_URL ?? "https://atgconsulting.io";

// ── Public: list published posts ──────────────────────────────────────────────

router.get("/content", async (_req, res) => {
  const posts = await prisma.content.findMany({
    where: { status: "published" },
    orderBy: { publishAt: "desc" },
    select: { id: true, slug: true, title: true, metaDescription: true, tags: true, publishAt: true, createdAt: true },
    take: 50,
  });
  res.json(posts.map((p) => ({ ...p, tags: (() => { try { return JSON.parse(p.tags) as string[]; } catch { return []; } })() })));
});

// ── Public: RSS feed ──────────────────────────────────────────────────────────

router.get("/content/feed.rss", async (_req, res) => {
  const posts = await prisma.content.findMany({
    where: { status: "published" },
    orderBy: { publishAt: "desc" },
    take: 20,
    select: { slug: true, title: true, metaDescription: true, publishAt: true, createdAt: true },
  });

  const items = posts.map((p) => {
    const date = (p.publishAt ?? p.createdAt).toUTCString();
    return `    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${APP_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${APP_URL}/blog/${p.slug}</guid>
      <description><![CDATA[${p.metaDescription}]]></description>
      <pubDate>${date}</pubDate>
    </item>`;
  }).join("\n");

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ATG Consulting Blog</title>
    <link>${APP_URL}/blog</link>
    <description>Practical AI workflow guides for small business owners.</description>
    <language>en-us</language>
    <atom:link href="${APP_URL}/api/content/feed.rss" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`);
});

// ── Public: sitemap fragment ──────────────────────────────────────────────────

router.get("/content/sitemap.xml", async (_req, res) => {
  const posts = await prisma.content.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true },
  });
  const urls = posts.map((p) =>
    `  <url><loc>${APP_URL}/blog/${p.slug}</loc><lastmod>${p.updatedAt.toISOString().split("T")[0]}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`
  ).join("\n");
  res.setHeader("Content-Type", "application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
});

router.get("/content/:slug", async (req, res) => {
  const slug = req.params.slug as string;
  if (slug === "feed.rss" || slug === "sitemap.xml") {
    res.status(404).json({ error: "Post not found." });
    return;
  }
  const post = await prisma.content.findFirst({
    where: { slug, status: "published" },
  });
  if (!post) { res.status(404).json({ error: "Post not found." }); return; }
  res.json({ ...post, tags: (() => { try { return JSON.parse(post.tags) as string[]; } catch { return []; } })() });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

router.get("/admin/content", resolve, requireAdmin, async (req, res) => {
  const { status, item } = req.query as { status?: string; item?: string };
  const posts = await prisma.content.findMany({
    where: { ...(status ? { status } : {}), ...(item ? { id: item } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  res.json(posts);
});

const ContentBody = z.object({
  topic:              z.string().min(1).max(200),
  slug:               z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  title:              z.string().min(1).max(300),
  metaDescription:    z.string().max(200).optional(),
  body:               z.string().max(100_000).optional(),
  tags:               z.array(z.string()).optional(),
  publishAt:          z.string().optional(),
  linkedCatalogItems: z.array(z.string()).optional(),
});

router.post("/admin/content", resolve, requireAdmin, async (req, res) => {
  const parsed = ContentBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }
  const { tags, linkedCatalogItems, slug, publishAt, ...rest } = parsed.data;
  const finalSlug = slug ?? rest.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const post = await prisma.content.create({
    data: { ...rest, slug: finalSlug, tags: JSON.stringify(tags ?? []), linkedCatalogItems: JSON.stringify(linkedCatalogItems ?? []), publishAt: publishAt ? new Date(publishAt) : null, source: "manual" },
  });
  res.status(201).json(post);
});

router.patch("/admin/content/:id", resolve, requireAdmin, async (req, res) => {
  const parsed = ContentBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed." }); return; }
  const { tags, linkedCatalogItems, publishAt, ...rest } = parsed.data;
  const updated = await prisma.content.update({
    where: { id: req.params.id as string },
    data: {
      ...rest,
      ...(tags !== undefined ? { tags: JSON.stringify(tags) } : {}),
      ...(linkedCatalogItems !== undefined ? { linkedCatalogItems: JSON.stringify(linkedCatalogItems) } : {}),
      ...(publishAt !== undefined ? { publishAt: publishAt ? new Date(publishAt) : null } : {}),
    },
  });
  res.json(updated);
});

router.post("/admin/content/:id/generate", resolve, requireAdmin, async (req, res) => {
  const existing = await prisma.content.findUnique({ where: { id: req.params.id as string } });
  if (!existing) { res.status(404).json({ error: "Post not found." }); return; }
  if (existing.status === "draft") { res.json(existing); return; }
  if (existing.status !== "queued") { res.status(409).json({ error: "Only a queued topic can generate its first draft." }); return; }
  const draft = await generateContentDraft(existing.topic, existing.metaDescription || existing.title);
  const result = await prisma.content.updateMany({ where: { id: existing.id, status: "queued", updatedAt: existing.updatedAt }, data: { title: draft.title, metaDescription: draft.metaDescription, body: draft.body, tags: JSON.stringify(draft.tags), status: "draft", source: draft.tokensUsed ? "grok" : "template", tokensUsed: draft.tokensUsed } });
  if (!result.count) { res.status(409).json({ error: "The topic changed. Refresh before generating again." }); return; }
  const post = await prisma.content.findUnique({ where: { id: existing.id } });
  await audit({ actorUserId: (req as AuthedRequest).atgUser!.id, action: "CONTENT_GENERATED", entity: "Content", entityId: existing.id });
  res.json(post);
});

// A single explicit operator action can approve and publish to ATG's own blog.
router.post("/admin/content/:id/approve-publish", resolve, requireAdmin, async (req, res) => {
  const existing = await prisma.content.findUnique({ where: { id: req.params.id as string } });
  if (!existing) { res.status(404).json({ error: "Post not found." }); return; }
  if (existing.status === "published") { res.json(existing); return; } // Safe retry.
  if (!["draft", "approved"].includes(existing.status) || !existing.body.trim()) {
    res.status(409).json({ error: "Review a completed draft before publishing." }); return;
  }
  if (existing.publishAt && existing.publishAt > new Date()) {
    res.status(409).json({ error: "This post has a future schedule. Approve it for that schedule instead of publishing now." }); return;
  }
  const result = await prisma.content.updateMany({ where: { id: existing.id, updatedAt: existing.updatedAt, status: existing.status }, data: { status: "published", publishAt: new Date() } });
  if (!result.count) { res.status(409).json({ error: "The post changed. Reload and review the saved version." }); return; }
  const post = await prisma.content.findUnique({ where: { id: existing.id } });
  await audit({ actorUserId: (req as AuthedRequest).atgUser!.id, action: "CONTENT_APPROVED_AND_PUBLISHED", entity: "Content", entityId: existing.id, meta: { slug: existing.slug } });
  res.json(post);
});

router.post("/admin/content/:id/approve", resolve, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const existing = await prisma.content.findUnique({ where: { id: req.params.id as string } });
  if (!existing) { res.status(404).json({ error: "Post not found." }); return; }
  if (existing.status === "published" || existing.status === "approved") { res.json(existing); return; }
  if (existing.status !== "draft") { res.status(409).json({ error: "Only a completed draft can be approved." }); return; }
  const post = await prisma.content.update({
    where: { id: existing.id },
    data: { status: "approved" },
  });
  await audit({ actorUserId: actor.id, action: "CONTENT_APPROVED", entity: "Content", entityId: post.id, meta: { slug: post.slug } });
  res.json(post);
});

router.post("/admin/content/:id/publish", resolve, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const existing = await prisma.content.findUnique({ where: { id: req.params.id as string } });
  if (!existing) { res.status(404).json({ error: "Post not found." }); return; }
  if (existing.status === "published") { res.json(existing); return; }
  if (existing.status !== "approved") {
    res.status(409).json({ error: "Approve the draft before publishing." });
    return;
  }
  const post = await prisma.content.update({
    where: { id: existing.id },
    data: { status: "published", publishAt: new Date() },
  });
  await audit({ actorUserId: actor.id, action: "CONTENT_PUBLISHED", entity: "Content", entityId: post.id, meta: { slug: post.slug } });
  res.json(post);
});

router.delete("/admin/content/:id", resolve, requireAdmin, async (req, res) => {
  await prisma.content.update({ where: { id: req.params.id as string }, data: { status: "archived" } });
  res.json({ ok: true });
});

// Admin: generate a new draft with Grok
router.post("/admin/content/generate", resolve, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const body = z.object({ topic: z.string().min(1).max(200), angle: z.string().min(1).max(500) }).safeParse(req.body);
  if (!body.success) { res.status(422).json({ error: "topic and angle are required." }); return; }
  const draft = await generateContentDraft(body.data.topic, body.data.angle);
  const post = await prisma.content.create({
    data: {
      topic: draft.topic, slug: draft.slug, title: draft.title,
      metaDescription: draft.metaDescription, body: draft.body,
      tags: JSON.stringify(draft.tags), status: "draft", source: "grok",
      tokensUsed: draft.tokensUsed,
    },
  });
  await audit({ actorUserId: actor.id, action: "CONTENT_GENERATED", entity: "Content", entityId: post.id, meta: { slug: post.slug, tokensUsed: draft.tokensUsed } });
  res.status(201).json(post);
});

return router;
}
export default createContentRouter();
