/**
 * Pure HTML / sitemap helpers for the public blog.
 * Dev and preview servers inject these into the initial HTML for /blog routes.
 * The production build also writes dist/public/blog/index.html and, when the
 * content API is reachable, dist/public/blog/<slug>/index.html so a static
 * host serves the tags without running Vite.
 * The API also serves /sitemap.xml and /robots.txt at the site root.
 */

export const SITE_NAME = "ATG Consulting";
export const DEFAULT_ORIGIN = "https://atgconsulting.io";

export const BLOG_TITLE = "ATG Consulting Blog — Practical AI guides for small businesses";
export const BLOG_DESCRIPTION =
  "Practical AI workflow guides for small business owners, ops managers, and solo operators.";

export const PUBLIC_PATHS: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/blog", changefreq: "daily", priority: "0.8" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/refunds", changefreq: "yearly", priority: "0.3" },
];

export interface HeadInput {
  title: string;
  description: string;
  url: string;
  type: "website" | "article";
  jsonLd: Record<string, unknown>;
  robots?: string;
}

export interface SitemapPost {
  slug: string;
  updatedAt: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeXml(value: string): string {
  return escapeHtml(value).replace(/'/g, "&apos;");
}

export function originFromHost(host: string | undefined, proto: string | undefined): string {
  const env = process.env.APP_URL?.replace(/\/$/, "");
  if (env) return env;
  if (!host) return DEFAULT_ORIGIN;
  const scheme = proto === "http" || proto === "https" ? proto : host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${scheme}://${host}`;
}

function setMeta(html: string, attr: "name" | "property", key: string, content: string): string {
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
  const re = new RegExp(`<meta\\s+${attr}=["']${key}["'][^>]*>`, "i");
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

export function blogIndexHead(origin: string): HeadInput {
  const url = `${origin}/blog`;
  return {
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    url,
    type: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "ATG Consulting Blog",
      description: BLOG_DESCRIPTION,
      url,
      publisher: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

export function articleHead(
  origin: string,
  post: { slug: string; title: string; description: string; publishedAt?: string | null },
): HeadInput {
  const url = `${origin}/blog/${post.slug}`;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    url,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };
  if (post.publishedAt) jsonLd.datePublished = post.publishedAt;
  return {
    title: `${post.title} — ${SITE_NAME}`,
    description: post.description || BLOG_DESCRIPTION,
    url,
    type: "article",
    jsonLd,
  };
}

/** Replace title, description, Open Graph, canonical, and JSON-LD in an HTML document. */
export function injectDocumentHead(html: string, input: HeadInput): string {
  let next = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(input.title)}</title>`);
  next = setMeta(next, "name", "description", input.description);
  next = setMeta(next, "property", "og:title", input.title);
  next = setMeta(next, "property", "og:description", input.description);
  next = setMeta(next, "property", "og:url", input.url);
  next = setMeta(next, "property", "og:type", input.type);
  next = setMeta(next, "property", "og:site_name", SITE_NAME);
  next = setMeta(next, "name", "twitter:card", "summary_large_image");
  next = setMeta(next, "name", "twitter:title", input.title);
  next = setMeta(next, "name", "twitter:description", input.description);
  if (input.robots) next = setMeta(next, "name", "robots", input.robots);

  const canonical = `<link rel="canonical" href="${escapeHtml(input.url)}" />`;
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(next)) {
    next = next.replace(/<link\s+rel=["']canonical["'][^>]*>/i, canonical);
  } else {
    next = next.replace("</head>", `    ${canonical}\n  </head>`);
  }

  const ld = `<script type="application/ld+json" id="atg-jsonld">${JSON.stringify(input.jsonLd).replace(/</g, "\\u003c")}</script>`;
  if (/<script[^>]*id=["']atg-jsonld["'][^>]*>[\s\S]*?<\/script>/i.test(next)) {
    next = next.replace(/<script[^>]*id=["']atg-jsonld["'][^>]*>[\s\S]*?<\/script>/i, ld);
  } else {
    next = next.replace("</head>", `    ${ld}\n  </head>`);
  }
  return next;
}

export function renderPrerenderedBlog(
  indexHtml: string,
  origin: string,
  posts: Array<{ slug: string; title: string; description: string; publishedAt?: string | null }>,
): { index: string; posts: Array<{ slug: string; html: string }> } {
  return {
    index: injectDocumentHead(indexHtml, blogIndexHead(origin)),
    posts: posts.map((post) => ({
      slug: post.slug,
      html: injectDocumentHead(indexHtml, articleHead(origin, post)),
    })),
  };
}

export function sitemapXml(origin: string, posts: SitemapPost[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const staticUrls = PUBLIC_PATHS.map((page) =>
    `  <url><loc>${escapeXml(origin + page.path)}</loc><lastmod>${today}</lastmod><changefreq>${page.changefreq}</changefreq><priority>${page.priority}</priority></url>`,
  );
  const postUrls = posts
    .filter((post) => /^[a-z0-9-]+$/.test(post.slug))
    .map((post) => {
      const lastmod = post.updatedAt.slice(0, 10);
      return `  <url><loc>${escapeXml(`${origin}/blog/${post.slug}`)}</loc><lastmod>${escapeXml(lastmod)}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, ...postUrls].join("\n")}\n</urlset>\n`;
}

export function robotsTxt(origin: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}
