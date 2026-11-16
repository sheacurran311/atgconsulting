import { useState, useEffect, useRef } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { Link, useSearch } from "wouter";
import { adminJson, announceAdminChange } from "@/lib/adminWork";

interface Post { id: string; topic: string; slug: string; title: string; body: string; status: string; source: string; tokensUsed: number; updatedAt: string; publishAt?: string | null }
const LABELS: Record<string, string> = { queued: "Queued topic", draft: "Draft · private", approved: "Approved · not yet published", published: "Published on ATG blog", archived: "Archived" };
export default function AdminContentPage() {
  const search = useSearch(); const focus = new URLSearchParams(search).get("item");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(focus ? "" : "draft");
  const [acting, setActing] = useState<string | null>(null);
  const locks = useRef(new Set<string>()); const readVersion = useRef(0);
  const [generating, setGenerating] = useState(false);
  const [genTopic, setGenTopic] = useState(""); const [genAngle, setGenAngle] = useState("");
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  async function load() {
    const version = ++readVersion.current; setLoading(true); setError("");
    const query = new URLSearchParams(); if (filter) query.set("status", filter); if (focus) query.set("item", focus);
    try { const rows = await adminJson<Post[]>(`/api/admin/content?${query}`); if (version === readVersion.current) setPosts(rows); }
    catch (e) { if (version === readVersion.current) setError(e instanceof Error ? e.message : "Could not load posts."); }
    finally { if (version === readVersion.current) setLoading(false); }
  }
  useEffect(() => { void load(); }, [filter, focus]);
  async function act(id: string, action: "approve" | "publish" | "approve-publish" | "archive" | "generate") {
    if (locks.current.has(id)) return;
    locks.current.add(id); ++readVersion.current; setLoading(false); setActing(id); setError(""); setNotice("");
    try {
      const saved = await adminJson<Post>(`/api/admin/content/${id}${action === "archive" ? "" : `/${action}`}`, { method: action === "archive" ? "DELETE" : "POST" });
      setPosts((rows) => rows.flatMap((post) => post.id !== id ? [post] : action === "archive" || (filter && saved.status !== filter) ? [] : [saved]));
      setNotice(action === "archive" ? "Topic skipped." : saved.status === "published" ? "Published on the ATG blog." : action === "generate" ? "Draft generated. Review before approving or publishing." : "Approved for the publishing queue. A scheduled publisher may publish it when due.");
      announceAdminChange();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Your post is still here."); }
    finally { locks.current.delete(id); setActing(null); }
  }
  async function generate() {
    if (!genTopic.trim() || locks.current.has("generate")) return;
    locks.current.add("generate"); setGenerating(true); setError(""); setNotice("");
    try {
      const saved = await adminJson<Post>("/api/admin/content/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: genTopic, angle: genAngle || `Practical guide to ${genTopic} for small businesses` }) });
      setNotice(`Draft created: ${saved.title}. Review before publishing.`); setGenTopic(""); setGenAngle(""); announceAdminChange(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not generate a draft. Your topic is still here."); }
    finally { locks.current.delete("generate"); setGenerating(false); }
  }
  return <AdminShell><div className="max-w-content mx-auto space-y-5">
    <div className="flex justify-between gap-4 flex-wrap"><div><p className="section-eyebrow">CONTENT ENGINE</p><h1 className="text-2xl font-bold">ATG blog posts</h1></div><Link to="/blog" className="btn-secondary">View blog ↗</Link></div>
    <p className="text-sm">This is marketing for ATG, separate from client delivery. Review the post, then choose <strong>Approve &amp; publish now</strong> for one action, or approve it for the publishing queue. Nothing here sends client messages or posts to social accounts.</p>
    <Link to="/admin/playbook" className="text-sm underline">Where this fits in the delivery playbook</Link>
    {focus && <p className="text-sm">Opened the requested post. <Link to="/admin/content" className="underline">Show all posts</Link></p>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <div className="flex flex-wrap gap-2">{["queued", "draft", "approved", "published", ""].map((value) => <button type="button" key={value} onClick={() => setFilter(value)} className={filter === value ? "btn-primary text-xs" : "btn-secondary text-xs"}>{value || "All"}</button>)}</div>
    <div className="rounded-xl p-4 border border-canvas-border space-y-3">
      <p className="label-mono">GENERATE PRIVATE BLOG DRAFT</p><div className="flex gap-2 flex-wrap">
        <input aria-label="Blog topic" className="field-input flex-1 min-w-0" placeholder="Topic" value={genTopic} onChange={(e) => setGenTopic(e.target.value)} />
        <input aria-label="Blog angle" className="field-input flex-1 min-w-0" placeholder="Angle (optional)" value={genAngle} onChange={(e) => setGenAngle(e.target.value)} />
        <button onClick={() => void generate()} disabled={generating || !genTopic.trim()} className="btn-primary">{generating ? "Generating…" : "Generate"}</button>
      </div>
    </div>
    {loading ? <p>Loading…</p> : posts.length === 0 ? <p>No matching posts. <button className="underline" onClick={() => void load()}>Refresh</button></p> : posts.map((post) => {
      const scheduled = !!post.publishAt && new Date(post.publishAt) > new Date();
      return <article id={`post-${post.id}`} key={post.id} className="rounded-xl border border-canvas-border p-4 space-y-3">
        <div className="flex justify-between gap-3 flex-wrap"><div><h2 className="font-semibold">{post.title}</h2><p className="text-xs">{LABELS[post.status] ?? post.status}{scheduled ? ` · scheduled ${new Date(post.publishAt!).toLocaleString()}` : ""}</p></div>
        <div className="flex gap-2 flex-wrap">
          {post.status === "queued" && <button className="btn-primary text-xs" disabled={acting === post.id} onClick={() => void act(post.id, "generate")}>Generate this draft</button>}
          {post.status === "queued" && <button className="btn-secondary text-xs" disabled={acting === post.id} onClick={() => void act(post.id, "archive")}>Skip topic</button>}
          {post.status === "draft" && <><button className="btn-secondary text-xs" disabled={acting === post.id} onClick={() => void act(post.id, "approve")}>Approve for publishing queue</button>{!scheduled && <button className="btn-primary text-xs" disabled={acting === post.id} onClick={() => void act(post.id, "approve-publish")}>{acting === post.id ? "Saving…" : "Approve & publish now"}</button>}</>}
          {post.status === "approved" && !scheduled && <button className="btn-primary text-xs" disabled={acting === post.id} onClick={() => void act(post.id, "publish")}>Publish on ATG blog</button>}
          {post.status === "published" && <Link to={`/blog/${post.slug}`} className="underline text-sm">View published post ↗</Link>}
        </div></div>
        <details open={focus === post.id || undefined}><summary className="cursor-pointer font-semibold text-sm">Review post</summary><div className="prose max-w-none mt-3"><div className="whitespace-pre-wrap">{post.body || "No draft body yet."}</div></div></details>
      </article>;
    })}
  </div></AdminShell>;
}
