import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { api, type AuditEntry } from "@/lib/api";

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("");
  const [skip, setSkip] = useState(0);

  function load(newSkip = 0) {
    setLoading(true);
    const params = new URLSearchParams();
    if (entity) params.set("entity", entity);
    params.set("skip", String(newSkip));
    params.set("take", "50");
    api.admin.audit(params.toString()).then((data) => {
      setEntries(newSkip > 0 ? (prev) => [...prev, ...data] : data);
      setSkip(newSkip + data.length);
    }).finally(() => setLoading(false));
  }

  useEffect(() => load(0), [entity]);

  const ENTITIES = ["", "Document", "Client", "Consultation", "Report", "Intake"];

  return (
    <AdminShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-extrabold text-canvas-text flex-1">Audit log</h1>
          <select value={entity} onChange={(e) => setEntity(e.target.value)} className="rounded-xl border border-canvas-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue">
            {ENTITIES.map((e) => <option key={e} value={e}>{e || "All entities"}</option>)}
          </select>
        </div>

        {loading && entries.length === 0 ? <p className="text-canvas-text">Loading…</p> : (
          <div className="rounded-2xl border border-canvas-border overflow-hidden">
            <table className="min-w-full bg-canvas-1 text-xs">
              <thead className="border-b border-canvas-border bg-canvas-2[0.02]">
                <tr>
                  {["Time", "Actor", "Action", "Entity", "ID"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left font-bold text-canvas-text uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {entries.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-canvas-text">No audit entries.</td></tr>
                ) : entries.map((e) => (
                  <tr key={e.id} className="hover:bg-canvas-2[0.01]">
                    <td className="px-3 py-2 text-canvas-text whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 text-canvas-text">{e.actor?.name ?? e.actor?.email ?? "system"}</td>
                    <td className="px-3 py-2 font-mono text-canvas-text">{e.action}</td>
                    <td className="px-3 py-2 text-canvas-text">{e.entity}</td>
                    <td className="px-3 py-2 text-canvas-text font-mono">{e.entityId?.slice(0, 8) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && entries.length >= 50 && (
          <button onClick={() => load(skip)} className="mt-4 btn-ghost text-sm">Load more</button>
        )}
      </div>
    </AdminShell>
  );
}
