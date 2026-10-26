/**
 * Info tab — knowledge articles, platform guides, and glossary.
 * Content is personalised: shows articles tagged for the client's vertical,
 * tier, and preferred AI platforms. Platform guides shown first.
 * Markdown rendered as simple HTML via a lightweight parser.
 */
import { useState, useEffect } from "react";
import { api, type KnowledgeArticle } from "@/lib/api";

// Minimal markdown → HTML renderer (no external dependency)
function mdToHtml(md: string): string {
  return md
    .replace(/^#{3} (.+)$/gm, "<h3>$1</h3>")
    .replace(/^#{2} (.+)$/gm, "<h2>$1</h2>")
    .replace(/^#{1} (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text: string, href: string) => {
      // Affiliate disclosure: show (ref) tag for /go/ links
      const isRef = href.startsWith("/go/");
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}${isRef ? '<span style="font-size:10px;color:var(--canvas-text-3);margin-left:3px">ref</span>' : ""}</a>`;
    })
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
    .replace(/\n{2,}/g, "<br /><br />");
}

function ArticleView({ article, onBack }: { article: KnowledgeArticle; onBack: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-sm mb-4 flex items-center gap-1"
        style={{ color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }}
      >
        ← Back
      </button>
      <h2 className="font-extrabold text-xl mb-4" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>
        {article.title}
      </h2>
      <div
        className="prose-atg text-sm leading-relaxed"
        style={{ color: "var(--canvas-text-2)", maxWidth: "680px" }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: mdToHtml(article.body) }}
      />
      <p className="text-xs mt-6" style={{ color: "var(--canvas-text-3)" }}>
        Some links marked "ref" are referral links; ATG may earn credit at no extra cost to you.
      </p>
    </div>
  );
}

function ArticleCard({ article, onClick }: { article: KnowledgeArticle; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left rounded-xl p-4 transition-all"
      style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)", cursor: "pointer" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--blue)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--canvas-border)")}
    >
      <p className="font-semibold text-sm mb-1" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>
        {article.title}
      </p>
      <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
        {article.body.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.slice(0, 120) ?? ""}…
      </p>
    </button>
  );
}

export default function InfoTab() {
  const [guides, setGuides] = useState<{ id: string; slug: string; title: string; body: string }[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null);

  useEffect(() => {
    Promise.all([
      api.knowledge.platformGuides().catch(() => []),
      api.knowledge.list().catch(() => []),
    ]).then(([g, a]) => {
      setGuides(g);
      // Exclude articles that are also platform guides to avoid duplication
      const guideSlugs = new Set(g.map((x) => x.slug));
      setArticles((a as KnowledgeArticle[]).filter((x) => !guideSlugs.has(x.slug)));
      setLoading(false);
    });
  }, []);

  if (selected) return <ArticleView article={selected} onBack={() => setSelected(null)} />;

  if (loading) return <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>;

  const allEmpty = guides.length === 0 && articles.length === 0;

  return (
    <div className="space-y-6">
      {/* Platform guides — shown first */}
      {guides.length > 0 && (
        <div>
          <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
            YOUR PLATFORM SETUP GUIDES
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {guides.map((g) => (
              <ArticleCard
                key={g.slug}
                article={{ ...g, tags: { verticals: [], tiers: [], platforms: [] } }}
                onClick={() => setSelected({ ...g, tags: { verticals: [], tiers: [], platforms: [] } })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other articles */}
      {articles.length > 0 && (
        <div>
          <p className="font-mono text-2xs mb-3" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.1em" }}>
            GUIDES & GLOSSARY
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {articles.map((a) => (
              <ArticleCard key={a.slug} article={a} onClick={() => setSelected(a)} />
            ))}
          </div>
        </div>
      )}

      {allEmpty && (
        <div className="rounded-xl p-6" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
          <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
            Platform guides and knowledge articles will appear here. They're personalised to your AI platform preference — update it in your intake answers from the account page.
          </p>
        </div>
      )}
    </div>
  );
}
