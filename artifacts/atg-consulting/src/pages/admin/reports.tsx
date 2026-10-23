import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { api, type Report } from "@/lib/api";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("DRAFT");
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.admin.reports(filter).then(setReports).finally(() => setLoading(false));
  }
  useEffect(load, [filter]);

  async function publish(id: string) {
    const updated = await api.admin.publishReport(id).catch(() => null);
    if (updated) setReports((r) => r.filter((x) => x.id !== id));
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    await api.admin.updateReport(editId, { contentMarkdown: editContent });
    setReports((r) => r.map((x) => x.id === editId ? { ...x, contentMarkdown: editContent } : x));
    setEditId(null);
    setSaving(false);
  }

  return (
    <AdminShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-canvas-text">Daily reports</h1>
          <div className="flex gap-2">
            {["DRAFT", "PUBLISHED"].map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold ${filter === s ? "bg-ink text-white" : "bg-canvas-2 text-canvas-text"}`}>
                {s.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? <p className="text-canvas-text">Loading…</p> : reports.length === 0 ? (
          <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-10 text-center">
            <p className="text-canvas-text">No {filter.toLowerCase()} reports.</p>
            {filter === "DRAFT" && <p className="text-canvas-text text-sm mt-2">Trigger the daily cron to generate reports for active clients.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r.id} className="rounded-2xl border border-canvas-border bg-canvas-1 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-bold text-canvas-text">{r.date}</p>
                    <p className="text-canvas-text text-xs capitalize">{r.status.toLowerCase()}</p>
                  </div>
                  <div className="flex gap-2">
                    {r.status === "DRAFT" && (
                      <>
                        <button onClick={() => { setEditId(editId === r.id ? null : r.id); setEditContent(r.contentMarkdown); }} className="btn-ghost text-xs py-1 px-2">Edit</button>
                        <button onClick={() => publish(r.id)} className="btn-primary text-xs py-1 px-3">Publish</button>
                      </>
                    )}
                  </div>
                </div>

                {editId === r.id ? (
                  <div className="space-y-2">
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={8}
                      className="w-full rounded-xl border border-canvas-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue resize-none font-mono" />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} disabled={saving} className="btn-primary text-sm">{saving ? "Saving…" : "Save"}</button>
                      <button onClick={() => setEditId(null)} className="btn-ghost text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-canvas-text whitespace-pre-wrap leading-relaxed max-h-48 overflow-hidden relative">
                    {r.contentMarkdown.slice(0, 400)}{r.contentMarkdown.length > 400 && "…"}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
