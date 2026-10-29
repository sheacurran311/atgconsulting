/**
 * /blog/:slug — Single published blog post.
 * Includes JSON-LD, OpenGraph, canonical URL, and an internal link to /intake.
 */
import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import LogoLockup from "@/components/LogoLockup";

interface Post {
  id: string; slug: string; title: string; metaDescription: string;
  body: string; tags: string[]; publishAt: string | null; createdAt: string;
}

const APP_URL = typeof window !== "undefined" ? window.location.origin : "https://atgconsulting.io";

function mdToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*?<\/li>\n?)+/gs, "<ul>$&</ul>")
    .replace(/\n\n(?!<[hulo])/g, "<br /><br />");
}

export default function BlogPostPage() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug ?? "";
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/content/${slug}`)
      .then((r) => { if (!r.ok) { setNotFound(true); return null; } return r.json() as Promise<Post>; })
      .then((p) => { if (p) { setPost(p); updateMeta(p); } })
      .finally(() => setLoading(false));
  }, [slug]);

  function updateMeta(p: Post) {
    document.title = `${p.title} — ATG Consulting`;
    const setMeta = (name: string, content: string, prop?: boolean) => {
      let el = document.querySelector(`meta[${prop ? "property" : "name"}="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(prop ? "property" : "name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("description", p.metaDescription);
    setMeta("og:title", p.title, true);
    setMeta("og:description", p.metaDescription, true);
    setMeta("og:url", `${APP_URL}/blog/${p.slug}`, true);
    setMeta("og:type", "article", true);
    setMeta("twitter:card", "summary");
    // JSON-LD
    const existing = document.getElementById("jsonld-article");
    if (existing) existing.remove();
    const ld = document.createElement("script");
    ld.id = "jsonld-article";
    ld.type = "application/ld+json";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.title,
      description: p.metaDescription,
      url: `${APP_URL}/blog/${p.slug}`,
      datePublished: p.publishAt ?? p.createdAt,
      publisher: { "@type": "Organization", name: "ATG Consulting" },
    });
    document.head.appendChild(ld);
    // Canonical
    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement("link"); canon.setAttribute("rel", "canonical"); document.head.appendChild(canon); }
    canon.setAttribute("href", `${APP_URL}/blog/${p.slug}`);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <header style={{ borderBottom: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <Link to="/"><LogoLockup variant="light" height={24} /></Link>
          <Link to="/blog"><span className="text-sm hover:underline" style={{ color: "var(--canvas-text-2)" }}>← All posts</span></Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading && <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>}
        {notFound && <div className="text-center py-16"><h1 className="font-bold text-xl mb-2" style={{ color: "var(--canvas-text)" }}>Post not found</h1><Link to="/blog"><span className="text-sm underline" style={{ color: "var(--blue-btn)" }}>← All posts</span></Link></div>}
        {post && (
          <>
            <div className="mb-8">
              <p className="font-mono text-xs mb-2" style={{ color: "var(--canvas-text-3)" }}>
                {new Date(post.publishAt ?? post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              <h1 className="font-extrabold text-3xl mb-3" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em", lineHeight: 1.2 }}>{post.title}</h1>
              <p className="text-lg" style={{ color: "var(--canvas-text-2)" }}>{post.metaDescription}</p>
            </div>

            <article
              className="legal-content"
              style={{ maxWidth: "100%" }}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: mdToHtml(post.body) }}
            />

            {/* Internal CTA */}
            <div className="mt-10 rounded-xl p-6" style={{ background: "rgba(59,107,255,0.05)", border: "1px solid rgba(59,107,255,0.2)" }}>
              <p className="font-semibold text-sm mb-2" style={{ color: "var(--canvas-text)" }}>Want help setting this up for your business?</p>
              <p className="text-sm mb-4" style={{ color: "var(--canvas-text-2)" }}>Take the free discovery assessment — Shea will review your answers personally.</p>
              <Link to="/intake"><span className="btn-primary text-sm" style={{ padding: "10px 18px" }}>Start your free assessment →</span></Link>
            </div>
          </>
        )}
      </main>

      <footer style={{ borderTop: "1px solid var(--canvas-border)", background: "var(--canvas-1)", marginTop: "48px" }}>
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap gap-4 items-center justify-between">
          <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>© ATG Consulting LTD · Colorado, USA</p>
          <div className="flex gap-4">
            {[["Blog", "/blog"], ["Terms", "/terms"], ["Privacy", "/privacy"]].map(([l, t]) => (
              <Link key={t} to={t!}><span className="text-xs hover:underline" style={{ color: "var(--canvas-text-3)" }}>{l}</span></Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
