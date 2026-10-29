/**
 * /blog — Published blog posts list.
 * Server-rendered via Vite SSR or just client-rendered with SEO meta tags.
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import LogoLockup from "@/components/LogoLockup";

interface Post { id: string; slug: string; title: string; metaDescription: string; tags: string[]; publishAt: string | null; createdAt: string }

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content").then((r) => r.json() as Promise<Post[]>).then(setPosts).catch(() => null).finally(() => setLoading(false));

    // SEO meta
    document.title = "ATG Consulting Blog — Practical AI guides for small businesses";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Practical AI workflow guides for small business owners, ops managers, and solo operators.");
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <header style={{ borderBottom: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <Link to="/"><LogoLockup variant="light" height={24} /></Link>
          <div className="flex gap-4 text-sm" style={{ color: "var(--canvas-text-2)" }}>
            <Link to="/intake"><span className="hover:underline" style={{ color: "var(--blue-btn)" }}>Free assessment →</span></Link>
          </div>
        </div>
      </header>

      <main className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>ATG CONSULTING · BLOG</p>
          <h1 className="font-extrabold text-4xl mb-3" style={{ color: "var(--canvas-text)", letterSpacing: "-0.04em" }}>Practical AI for real businesses</h1>
          <p className="text-lg" style={{ color: "var(--canvas-text-2)" }}>No hype. No invented stats. Just what actually works for small teams.</p>
        </div>

        {loading ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
        : posts.length === 0 ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>No posts published yet.</p>
        : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`}>
                <article className="rounded-xl p-5 h-full transition-all" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--blue)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--canvas-border)")}>
                  <p className="font-semibold text-sm mb-2" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em", lineHeight: 1.4 }}>{post.title}</p>
                  <p className="text-xs mb-3" style={{ color: "var(--canvas-text-2)", lineHeight: 1.6 }}>{post.metaDescription}</p>
                  <p className="font-mono text-xs" style={{ color: "var(--canvas-text-3)" }}>
                    {new Date(post.publishAt ?? post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer style={{ borderTop: "1px solid var(--canvas-border)", background: "var(--canvas-1)", marginTop: "64px" }}>
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap gap-4 items-center justify-between">
          <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>© ATG Consulting LTD · CO · USA</p>
          <div className="flex gap-4">
            {[["Terms", "/terms"], ["Privacy", "/privacy"], ["Refunds", "/refunds"]].map(([l, t]) => (
              <Link key={t} to={t!}><span className="text-xs hover:underline" style={{ color: "var(--canvas-text-3)" }}>{l}</span></Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
