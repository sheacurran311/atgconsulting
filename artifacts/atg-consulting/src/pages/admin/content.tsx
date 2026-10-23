import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { api, type Module } from "@/lib/api";

const TIER_OPTIONS = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];

export default function AdminContentPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ slug: "", title: "", description: "", minTier: "NONE", body: "", status: "DRAFT" as "DRAFT" | "PUBLISHED", order: 0 });

  useEffect(() => { api.admin.modules.list().then(setModules).finally(() => setLoading(false)); }, []);

  async function createModule() {
    setCreating(true);
    const m = await api.admin.modules.create(form).catch(() => null);
    if (m) setModules((prev) => [...prev, m]);
    setForm({ slug: "", title: "", description: "", minTier: "NONE", body: "", status: "DRAFT", order: 0 });
    setCreating(false);
  }

  async function toggleStatus(m: Module) {
    const newStatus = m.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const updated = await api.admin.modules.update(m.id, { status: newStatus }).catch(() => null);
    if (updated) setModules((prev) => prev.map((x) => x.id === m.id ? updated : x));
  }

  return (
    <AdminShell>
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-extrabold text-canvas-text">Content manager</h1>

        {/* Create module */}
        <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-6">
          <p className="font-bold text-canvas-text mb-4">Add module</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="slug (e.g. intro-to-ai)" className="rounded-xl border border-canvas-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue" />
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="rounded-xl border border-canvas-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue" />
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" className="rounded-xl border border-canvas-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue sm:col-span-2" />
            <select value={form.minTier} onChange={(e) => setForm({ ...form, minTier: e.target.value })} className="rounded-xl border border-canvas-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue">
              {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "DRAFT" | "PUBLISHED" })} className="rounded-xl border border-canvas-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} placeholder="Module body (markdown)" className="w-full mt-3 rounded-xl border border-canvas-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue resize-none" />
          <button onClick={createModule} disabled={creating || !form.slug || !form.title} className="btn-primary text-sm mt-3">Add module</button>
        </div>

        {/* Module list */}
        <div className="space-y-3">
          <p className="font-bold text-canvas-text">Published modules ({modules.filter((m) => m.status === "PUBLISHED").length}) · Drafts ({modules.filter((m) => m.status === "DRAFT").length})</p>
          {loading ? <p className="text-canvas-text">Loading…</p> : modules.map((m) => (
            <div key={m.id} className="rounded-2xl border border-canvas-border bg-canvas-1 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-canvas-text text-sm">{m.title}</p>
                <p className="text-canvas-text text-xs">{m.slug} · Min tier: {m.minTier} · Order: {m.order}</p>
              </div>
              <div className="flex gap-2 items-center">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.status === "PUBLISHED" ? "bg-green-50 text-green-700" : "bg-canvas-2 text-canvas-text"}`}>{m.status.toLowerCase()}</span>
                <button onClick={() => toggleStatus(m)} className="btn-ghost text-xs py-1 px-2">
                  {m.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
