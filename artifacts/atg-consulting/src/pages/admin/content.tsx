/**
 * Admin content page — list and approve/publish blog drafts.
 */
import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { Link } from "wouter";

interface Post { id: string; topic: string; slug: string; title: string; status: string; source: string; tokensUsed: number; updatedAt: string }

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",     color: "#D97706", bg: "rgba(217,119,6,0.08)" },
  approved:  { label: "Approved",  color: "#3B6BFF", bg: "rgba(59,107,255,0.08)" },
  published: { label: "Published", color: "#16A34A", bg: "rgba(22,163,74,0.08)" },
  archived:  { label: "Archived",  color: "var(--canvas-text-3)", bg: "var(--canvas-2)" },
};

export default function AdminContentPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("draft");
  const [acting, setActing] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genAngle, setGenAngle] = useState("");
  const [genMsg, setGenMsg] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/admin/content${filter ? `?status=${filter}` : ""}`, { credentials: "include" })
      .then((r) => r.json() as Promise<Post[]>).then(setPosts).catch(() => null).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filter]);

  async function act(id: string, action: "approve" | "publish") {
    setActing(id);
    await fetch(`/api/admin/content/${id}/${action}`, { method: "POST", credentials: "include" });
    setActing(null);
    load();
  }

  async function generate() {
    if (!genTopic.trim()) return;
    setGenerating(true);
    const r = await fetch("/api/admin/content/generate", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: genTopic, angle: genAngle || `Practical guide to ${genTopic} for small businesses` }),
    });
    const d = await r.json() as { title?: string; error?: string };
    setGenMsg(d.title ? `✓ Created: "${d.title}"` : d.error ?? "Done");
    setGenTopic(""); setGenAngle("");
    setGenerating(false);
    load();
  }

  return (
    <AdminShell>
      <div className="max-w-content mx-auto space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>CONTENT ENGINE</p>
            <h1 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>{posts.length} post{posts.length !== 1 ? "s" : ""}</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/blog" target="_blank"><span className="btn-secondary text-sm" style={{ padding: "7px 12px" }}>View blog ↗</span></Link>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5">
          {["draft","approved","published",""].map((s) => (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md capitalize"
              style={{ background: filter === s ? "var(--blue)" : "var(--canvas-2)", color: filter === s ? "#fff" : "var(--canvas-text-2)", border: "none", cursor: "pointer" }}>
              {s || "All"}
            </button>
          ))}
        </div>

        {/* Generate */}
        <div className="rounded-xl p-4" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
          <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>GENERATE NEW DRAFT</p>
          <div className="flex gap-2 mb-2">
            <input className="field-input text-sm flex-1" placeholder="Topic slug (e.g. invoice-follow-up)" value={genTopic} onChange={(e) => setGenTopic(e.target.value)} />
            <input className="field-input text-sm flex-1" placeholder="Angle (optional)" value={genAngle} onChange={(e) => setGenAngle(e.target.value)} />
            <button type="button" onClick={generate} disabled={generating || !genTopic.trim()} className="btn-primary text-sm" style={{ padding: "7px 14px", flexShrink: 0 }}>
              {generating ? "Generating…" : "Generate"}
            </button>
          </div>
          {genMsg && <p className="text-xs" style={{ color: "#16A34A" }}>{genMsg}</p>}
        </div>

        {loading ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
        : posts.length === 0 ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>No {filter || "posts"} yet.</p>
        : (
          <div className="space-y-3">
            {posts.map((post) => {
              const st = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft!;
              return (
                <div key={post.id} className="rounded-xl p-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm truncate" style={{ color: "var(--canvas-text)" }}>{post.title}</p>
                        <span className="font-mono text-2xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      </div>
                      <p className="font-mono text-xs" style={{ color: "var(--canvas-text-3)" }}>/blog/{post.slug} · {post.source} · {post.tokensUsed} tokens</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {post.status === "draft" && (
                        <button type="button" onClick={() => act(post.id, "approve")} disabled={acting === post.id}
                          className="btn-secondary text-xs" style={{ padding: "5px 10px" }}>Approve</button>
                      )}
                      {post.status === "approved" && (
                        <button type="button" onClick={() => act(post.id, "publish")} disabled={acting === post.id}
                          className="btn-primary text-xs" style={{ padding: "5px 10px" }}>Publish</button>
                      )}
                      {post.status === "published" && (
                        <Link to={`/blog/${post.slug}`} target="_blank">
                          <span className="text-xs underline" style={{ color: "var(--blue)" }}>View ↗</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
