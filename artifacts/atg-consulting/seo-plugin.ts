/**
 * Injects blog meta, Open Graph, and JSON-LD into the initial HTML,
 * and serves /sitemap.xml and /robots.txt from the Vite dev and preview servers.
 */
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import {
  articleHead,
  blogIndexHead,
  injectDocumentHead,
  originFromHost,
  robotsTxt,
  renderPrerenderedBlog,
  sitemapXml,
  type HeadInput,
  type SitemapPost,
} from "../api-server/src/lib/seo.ts";

function apiBase(): string {
  return (process.env.VITE_PROXY_TARGET ?? process.env.API_SERVER_URL ?? "").replace(/\/$/, "");
}

function requestOrigin(req: IncomingMessage): string {
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = typeof protoHeader === "string" ? protoHeader.split(",")[0]?.trim() : undefined;
  return originFromHost(req.headers.host, proto);
}

function pathnameOf(req: IncomingMessage): string {
  const raw = (req.url ?? "/").split("?")[0] ?? "/";
  const base = process.env.BASE_PATH && process.env.BASE_PATH !== "/"
    ? process.env.BASE_PATH.replace(/\/$/, "")
    : "";
  if (base && (raw === base || raw.startsWith(`${base}/`))) {
    const rest = raw.slice(base.length);
    return rest.startsWith("/") ? rest || "/" : `/${rest}`;
  }
  return raw || "/";
}

async function loadPosts(): Promise<SitemapPost[]> {
  const base = apiBase();
  if (!base) return [];
  try {
    const response = await fetch(`${base}/api/content`, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return [];
    const rows = await response.json() as { slug: string; createdAt?: string; publishAt?: string | null }[];
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      slug: row.slug,
      updatedAt: row.publishAt ?? row.createdAt ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

async function loadPost(slug: string): Promise<{ title: string; description: string; publishedAt: string | null } | "missing" | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const response = await fetch(`${base}/api/content/${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(4000) });
    if (response.status === 404) return "missing";
    if (!response.ok) return null;
    const post = await response.json() as { title: string; metaDescription: string; publishAt: string | null; createdAt: string };
    return { title: post.title, description: post.metaDescription, publishedAt: post.publishAt ?? post.createdAt };
  } catch {
    return null;
  }
}

function humanize(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
  renderIndex: (url: string) => Promise<string>,
) {
  if (req.method !== "GET" && req.method !== "HEAD") { next(); return; }
  const pathname = pathnameOf(req);
  const origin = requestOrigin(req);

  if (pathname === "/sitemap.xml") {
    const base = apiBase();
    if (base) {
      try {
        const proxied = await fetch(`${base}/sitemap.xml`, { signal: AbortSignal.timeout(4000) });
        if (proxied.ok) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/xml; charset=utf-8");
          res.end(await proxied.text());
          return;
        }
      } catch {
        // Build from the content API, or from the static page list.
      }
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.end(sitemapXml(origin, await loadPosts()));
    return;
  }

  if (pathname === "/robots.txt") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(robotsTxt(origin));
    return;
  }

  const blogIndex = pathname === "/blog" || pathname === "/blog/";
  const postMatch = pathname.match(/^\/blog\/([a-z0-9-]+)\/?$/);
  if (!blogIndex && !postMatch) { next(); return; }
  const accept = req.headers.accept ?? "";
  if (accept && !accept.includes("text/html") && !accept.includes("*/*")) { next(); return; }

  try {
    const html = await renderIndex(req.url ?? pathname);
    let head: HeadInput;
    if (blogIndex) {
      head = blogIndexHead(origin);
    } else {
      const slug = postMatch![1]!;
      const post = await loadPost(slug);
      if (post === "missing") {
        head = {
          ...articleHead(origin, { slug, title: "Post not found", description: "This post is not published.", publishedAt: null }),
          robots: "noindex",
        };
      } else if (post) {
        head = articleHead(origin, { slug, ...post });
      } else {
        head = articleHead(origin, {
          slug,
          title: humanize(slug),
          description: "Practical AI workflow guide from ATG Consulting.",
          publishedAt: null,
        });
      }
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(req.method === "HEAD" ? undefined : injectDocumentHead(html, head));
  } catch (err) {
    next(err);
  }
}

async function prerenderBuiltBlog(outDir: string): Promise<void> {
  const indexPath = path.join(outDir, "index.html");
  if (!fs.existsSync(indexPath)) return;
  const indexHtml = fs.readFileSync(indexPath, "utf8");
  const origin = (process.env.APP_URL ?? "https://atgconsulting.io").replace(/\/$/, "");
  const posts: { slug: string; title: string; description: string; publishedAt: string | null }[] = [];
  const listed = await loadPosts();
  for (const row of listed) {
    const post = await loadPost(row.slug);
    if (!post || post === "missing") continue;
    posts.push({ slug: row.slug, title: post.title, description: post.description, publishedAt: post.publishedAt });
  }
  const rendered = renderPrerenderedBlog(indexHtml, origin, posts);
  const blogDir = path.join(outDir, "blog");
  fs.mkdirSync(blogDir, { recursive: true });
  fs.writeFileSync(path.join(blogDir, "index.html"), rendered.index);
  for (const post of rendered.posts) {
    const dir = path.join(blogDir, post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), post.html);
  }
}

export function seoPlugin(): Plugin {
  let outDir = "";
  return {
    name: "atg-blog-seo",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      if (outDir) await prerenderBuiltBlog(outDir);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handle(req, res, next, async (url) => {
          const file = fs.readFileSync(path.resolve(server.config.root, "index.html"), "utf8");
          return server.transformIndexHtml(url, file);
        });
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void handle(req, res, next, async () => {
          return fs.readFileSync(path.resolve(server.config.root, "dist/public/index.html"), "utf8");
        });
      });
    },
  };
}
