/**
 * Site-root SEO files. Crawlers request these on the public host.
 * The Vite server proxies here when VITE_PROXY_TARGET is set, and also
 * builds the same documents itself if the API is unreachable.
 */

import { Router } from "express";
import { prisma } from "../lib/db";
import { originFromHost, robotsTxt, sitemapXml, type SitemapPost } from "../lib/seo";

const router = Router();

router.get("/sitemap.xml", async (req, res) => {
  const origin = originFromHost(req.get("host"), req.get("x-forwarded-proto"));
  let posts: SitemapPost[] = [];
  try {
    const rows = await prisma.content.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
    });
    posts = rows.map((row) => ({ slug: row.slug, updatedAt: row.updatedAt.toISOString() }));
  } catch (err) {
    console.warn("[seo] sitemap fell back to static paths:", err instanceof Error ? err.message : err);
  }
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.send(sitemapXml(origin, posts));
});

router.get("/robots.txt", (req, res) => {
  const origin = originFromHost(req.get("host"), req.get("x-forwarded-proto"));
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(robotsTxt(origin));
});

export default router;
