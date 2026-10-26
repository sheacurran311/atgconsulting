/**
 * Admin Tools page — manage the tool database.
 * List, edit referralUrl/pricingNote, view click counts, CSV export/import.
 * Affiliate disclosure: displayed prominently at the top.
 */
import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { api } from "@/lib/api";

interface AdminTool {
  id: string; slug: string; name: string; category: string;
  description: string; officialUrl: string; referralUrl: string;
  hasReferral: boolean; pricingNote: string; featured: boolean;
  enabled: boolean; sortOrder: number; clickCount: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  ai_platform: "AI Platform", productivity: "Productivity", email: "Email",
  calendar: "Calendar", scheduling: "Scheduling", payments: "Payments",
  accounting: "Accounting", crm: "CRM", design: "Design",
  social_media: "Social Media", automation: "Automation", dev_tool: "Dev Tool", other: "Other",
};

export default function AdminToolsPage() {
  const [tools, setTools] = useState<AdminTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReferralUrl, setEditReferralUrl] = useState("");
  const [editPricingNote, setEditPricingNote] = useState("");
  const [editHasReferral, setEditHasReferral] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importCsv, setImportCsv] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/admin/tools", { credentials: "include" })
      .then((r) => r.json() as Promise<AdminTool[]>)
      .then((data) => { setTools(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function startEdit(tool: AdminTool) {
    setEditingId(tool.id);
    setEditReferralUrl(tool.referralUrl);
    setEditPricingNote(tool.pricingNote);
    setEditHasReferral(tool.hasReferral);
  }

  async function saveEdit(tool: AdminTool) {
    setSaving(true);
    await fetch(`/api/admin/tools/${tool.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralUrl: editReferralUrl, pricingNote: editPricingNote, hasReferral: editHasReferral }),
    });
    setSaving(false);
    setEditingId(null);
    load();
  }

  async function toggleEnabled(tool: AdminTool) {
    await fetch(`/api/admin/tools/${tool.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !tool.enabled }),
    });
    load();
  }

  async function importTools() {
    if (!importCsv.trim()) return;
    setImporting(true);
    const r = await fetch("/api/admin/tools/import", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: importCsv }),
    });
    const data = await r.json() as { imported: number; results: { slug: string; action: string; error?: string }[] };
    setImportResult(`Imported ${data.imported} tools. ${data.results.filter(x => x.action === "error").length} errors.`);
    setImporting(false);
    setImportCsv("");
    load();
  }

  const filtered = tools.filter((t) =>
    !filter || t.name.toLowerCase().includes(filter.toLowerCase()) ||
    t.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <AdminShell>
      <div className="max-w-content mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>ADMIN</p>
            <h1 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>Tools database</h1>
          </div>
          <a
            href="/api/admin/tools/export.csv"
            download="atg-tools.csv"
            className="btn-secondary text-sm"
            style={{ padding: "8px 14px" }}
          >
            ↓ Export CSV
          </a>
        </div>

        {/* Affiliate disclosure — required near all referral links */}
        <div className="rounded-xl p-4" style={{ background: "rgba(59,107,255,0.06)", border: "1px solid rgba(59,107,255,0.2)" }}>
          <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>AFFILIATE DISCLOSURE</p>
          <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
            Tools with a referral link go through <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>/go/:slug</code> which logs a click and redirects to the referral URL.
            Set <strong>referralUrl</strong> after joining the program and mark <strong>hasReferral=true</strong>.
            All outbound tool links in client-facing pages show: "Some links are referral links; ATG may earn credit at no extra cost to you."
          </p>
        </div>

        {/* Filter */}
        <input
          className="field-input w-full text-sm"
          placeholder="Filter by name or category…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        {loading ? (
          <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((tool) => (
              <div key={tool.id} className="rounded-xl p-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)", opacity: tool.enabled ? 1 : 0.5 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{tool.name}</p>
                      <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: "var(--canvas-2)", color: "var(--canvas-text-3)", letterSpacing: "0.05em" }}>
                        {CATEGORY_LABELS[tool.category] ?? tool.category}
                      </span>
                      {tool.featured && <span className="font-mono text-2xs" style={{ color: "var(--blue)" }}>★ FEATURED</span>}
                      {tool.hasReferral && <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.08)", color: "#16A34A", letterSpacing: "0.05em" }}>REFERRAL</span>}
                    </div>
                    <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>/go/{tool.slug} · {tool.clickCount} click{tool.clickCount !== 1 ? "s" : ""}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--canvas-text-2)" }}>{tool.description}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button type="button" onClick={() => startEdit(tool)} className="btn-secondary text-xs" style={{ padding: "5px 10px" }}>Edit</button>
                    <button type="button" onClick={() => toggleEnabled(tool)} className="btn-ghost text-xs">{tool.enabled ? "Disable" : "Enable"}</button>
                  </div>
                </div>

                {editingId === tool.id && (
                  <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--canvas-border)" }}>
                    <div>
                      <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>REFERRAL URL (leave blank until you join the program)</label>
                      <input className="field-input text-sm w-full" value={editReferralUrl} onChange={(e) => setEditReferralUrl(e.target.value)} placeholder="https://example.com/ref/..." />
                    </div>
                    <div>
                      <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>PRICING NOTE</label>
                      <input className="field-input text-sm w-full" value={editPricingNote} onChange={(e) => setEditPricingNote(e.target.value)} placeholder="Free tier available; check current pricing at their site." />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id={`hr-${tool.id}`} checked={editHasReferral} onChange={(e) => setEditHasReferral(e.target.checked)} />
                      <label htmlFor={`hr-${tool.id}`} className="text-sm" style={{ color: "var(--canvas-text)" }}>Has active referral (show disclosure on tool links)</label>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveEdit(tool)} disabled={saving} className="btn-primary text-sm" style={{ padding: "6px 14px" }}>
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="btn-ghost text-sm">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CSV import */}
        <div className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
          <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>BULK CSV IMPORT</p>
          <p className="text-xs mb-3" style={{ color: "var(--canvas-text-3)" }}>
            Required columns: slug, name, category, officialUrl. Optional: description, referralUrl, hasReferral, pricingNote, featured, enabled, sortOrder.
          </p>
          <textarea
            className="field-input text-xs w-full font-mono"
            rows={6}
            value={importCsv}
            onChange={(e) => setImportCsv(e.target.value)}
            placeholder={"slug,name,category,officialUrl\ngrok-bot,Grok Bot,ai_platform,https://x.com/grok"}
            style={{ resize: "vertical" }}
          />
          {importResult && <p className="text-xs mt-2" style={{ color: "var(--canvas-text-2)" }}>{importResult}</p>}
          <button type="button" onClick={importTools} disabled={importing || !importCsv.trim()} className="btn-primary text-sm mt-3" style={{ padding: "7px 14px" }}>
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
