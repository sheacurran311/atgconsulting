/**
 * Admin Catalog page — manage the recommendation catalog.
 * Lists items, shows review queue, import (JSON/CSV/URL), verify/reject.
 * Only verified items are shown to clients.
 */
import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";

interface CatalogItem {
  id: string; name: string; sourceType: string; sourceUrl: string;
  description: string; howItHelps: string; tags: string;
  tierFit: string; verified: boolean; reviewStatus: string;
  reviewNotes: string; enabled: boolean; createdAt: string;
  verifiedAt: string | null; verifiedBy: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  grok_bot_template: "Grok Bot", claude_skill: "Claude Skill",
  claude_plugin: "Claude Plugin", chatgpt_gpt: "ChatGPT GPT",
  mcp_connector: "MCP Connector", atg_template: "ATG Template",
};
const SOURCE_COLORS: Record<string, string> = {
  grok_bot_template: "rgba(59,107,255,0.1)", claude_skill: "rgba(139,92,246,0.1)",
  claude_plugin: "rgba(139,92,246,0.1)", chatgpt_gpt: "rgba(16,163,127,0.1)",
  mcp_connector: "rgba(234,179,8,0.1)", atg_template: "rgba(59,107,255,0.06)",
};

type Tab = "all" | "queue" | "import";

export default function AdminCatalogPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [queue, setQueue] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [filter, setFilter] = useState("");
  const [verifying, setVerifying] = useState<string | null>(null);
  const [batching, setBatching] = useState(false);

  // Import state
  const [importMode, setImportMode] = useState<"json" | "url">("json");
  const [importData, setImportData] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importSourceType, setImportSourceType] = useState("chatgpt_gpt");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/catalog", { credentials: "include" }).then((r) => r.json() as Promise<CatalogItem[]>),
      fetch("/api/admin/catalog/queue", { credentials: "include" }).then((r) => r.json() as Promise<CatalogItem[]>),
    ]).then(([all, q]) => { setItems(all); setQueue(q); }).catch(() => null)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function verifyBatch() {
    setBatching(true);
    const response = await fetch("/api/admin/catalog/verify-batch", { method: "POST", credentials: "include" });
    const payload = await response.json().catch(() => ({ verified: 0 })) as { verified?: number };
    setBatching(false);
    setImportResult(payload.verified ? `Verified ${payload.verified} link-checked item(s).` : "No link-checked pending items to verify.");
    load();
  }

  async function verify(id: string) {
    setVerifying(id);
    await fetch(`/api/admin/catalog/${id}/verify`, { method: "POST", credentials: "include" });
    setVerifying(null);
    load();
    setSelected(null);
  }

  async function reject(id: string, note = "") {
    await fetch(`/api/admin/catalog/${id}/reject`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    load();
    setSelected(null);
  }

  async function importItems() {
    setImporting(true);
    setImportResult(null);
    if (importMode === "url") {
      const r = await fetch("/api/admin/catalog/import-url", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl, sourceType: importSourceType }),
      });
      const d = await r.json() as { ok?: boolean; message?: string; error?: string };
      setImportResult(d.message ?? d.error ?? "Done");
      setImportUrl("");
    } else {
      const r = await fetch("/api/admin/catalog/import", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "json", data: importData }),
      });
      const d = await r.json() as { imported?: number };
      setImportResult(`Imported ${d.imported ?? 0} items`);
      setImportData("");
    }
    setImporting(false);
    load();
  }

  const displayed = tab === "queue" ? queue
    : items.filter((i) => !filter || i.name.toLowerCase().includes(filter.toLowerCase()) || i.sourceType.includes(filter.toLowerCase()));

  return (
    <AdminShell>
      <div className="max-w-wide mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>RECOMMENDATION CATALOG</p>
            <h1 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>
              {items.length} items · {queue.length} pending review
            </h1>
          </div>
          <div className="flex gap-1">
            {(["all", "queue", "import"] as Tab[]).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all"
                style={{ background: tab === t ? "var(--blue)" : "var(--canvas-2)", color: tab === t ? "#fff" : "var(--canvas-text-2)", border: "none", cursor: "pointer" }}>
                {t === "queue" ? `Queue (${queue.length})` : t}
              </button>
            ))}
          </div>
        </div>

        {/* Filter */}
        {tab === "all" && (
          <input className="field-input text-sm w-full max-w-sm" placeholder="Filter by name or source type…"
            value={filter} onChange={(e) => setFilter(e.target.value)} />
        )}

        {/* Import tab */}
        {tab === "import" && (
          <div className="rounded-xl p-5 space-y-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
            <div>
              <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>IMPORT METHOD</p>
              <div className="flex gap-2 mb-4">
                {(["json", "url"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setImportMode(m)}
                    className="px-3 py-1.5 text-xs rounded-md"
                    style={{ background: importMode === m ? "rgba(59,107,255,0.1)" : "var(--canvas-1)", border: `1px solid ${importMode === m ? "var(--blue)" : "var(--canvas-border)"}`, color: importMode === m ? "var(--blue)" : "var(--canvas-text-2)", cursor: "pointer" }}>
                    {m === "json" ? "Paste JSON / CSV" : "Paste a URL"}
                  </button>
                ))}
              </div>

              {importMode === "url" ? (
                <div className="space-y-3">
                  <input className="field-input text-sm w-full" type="url" placeholder="https://marketplace.example.com/plugin/..."
                    value={importUrl} onChange={(e) => setImportUrl(e.target.value)} />
                  <select className="field-input text-xs" value={importSourceType} onChange={(e) => setImportSourceType(e.target.value)}>
                    {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
                    We fetch the page title and meta description. You'll then fill in tags and howItHelps in the review queue before verifying.
                    <strong style={{ color: "var(--canvas-text)" }}> Never verify a listing without checking the URL is live and accurate.</strong>
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea className="field-input text-xs w-full font-mono" rows={8} style={{ resize: "vertical" }}
                    placeholder={`Paste a JSON array:\n[{"name":"My GPT","sourceType":"chatgpt_gpt","sourceUrl":"https://...","description":"..."}]`}
                    value={importData} onChange={(e) => setImportData(e.target.value)} />
                  <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
                    Fields: name, sourceType, sourceUrl, description, howItHelps, tierFit.
                    Imported items go to the review queue — verify each one before clients can see it.
                  </p>
                </div>
              )}
              {importResult && <p className="text-sm font-medium" style={{ color: "#16A34A" }}>✓ {importResult}</p>}
              <button type="button" onClick={importItems} disabled={importing || (!importData.trim() && !importUrl.trim())}
                className="btn-primary text-sm" style={{ padding: "8px 16px" }}>
                {importing ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        )}

        {tab === "queue" && queue.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
              One approval verifies pending items whose links were already checked. Items stay hidden until you do this.
            </p>
            <button type="button" onClick={verifyBatch} disabled={batching} className="btn-primary text-xs" style={{ padding: "6px 12px" }}>
              {batching ? "Verifying…" : "Verify link-checked batch"}
            </button>
          </div>
        )}
        {tab === "queue" && importResult && (
          <p className="text-sm font-medium" style={{ color: "#16A34A" }}>{importResult}</p>
        )}

        {/* Item list */}
        {(tab === "all" || tab === "queue") && (
          loading ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
          : displayed.length === 0 ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>{tab === "queue" ? "No items pending review." : "No items yet. Import some from the Import tab."}</p>
          : (
            <div className="space-y-3">
              {displayed.map((item) => (
                <div key={item.id} className="rounded-xl p-4" style={{ border: `1px solid ${selected?.id === item.id ? "var(--blue)" : "var(--canvas-border)"}`, background: SOURCE_COLORS[item.sourceType] ?? "var(--canvas-1)", cursor: "pointer" }}
                  onClick={() => setSelected(item.id === selected?.id ? null : item)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm truncate" style={{ color: "var(--canvas-text)" }}>{item.name}</p>
                        <span className="font-mono text-2xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "rgba(0,0,0,0.06)", color: "var(--canvas-text-3)" }}>
                          {SOURCE_LABELS[item.sourceType] ?? item.sourceType}
                        </span>
                        {item.verified && <span className="font-mono text-2xs px-1 py-0.5 rounded" style={{ background: "rgba(22,163,74,0.08)", color: "#16A34A" }}>✓ VERIFIED</span>}
                        {item.reviewStatus === "pending" && <span className="font-mono text-2xs" style={{ color: "#D97706" }}>PENDING</span>}
                      </div>
                      <p className="text-xs truncate" style={{ color: "var(--canvas-text-2)" }}>{item.howItHelps || item.description}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {!item.verified && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); verify(item.id); }}
                          disabled={verifying === item.id} className="btn-primary text-xs" style={{ padding: "5px 10px" }}>
                          {verifying === item.id ? "…" : "Verify"}
                        </button>
                      )}
                      {item.reviewStatus === "pending" && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); reject(item.id); }}
                          className="text-xs underline" style={{ color: "#DC2626" }}>Reject</button>
                      )}
                    </div>
                  </div>
                  {selected?.id === item.id && (
                    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--canvas-border)" }}>
                      {item.sourceUrl && <p className="text-xs"><strong>URL:</strong> <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--blue)" }}>{item.sourceUrl}</a></p>}
                      <p className="text-xs"><strong>How it helps:</strong> {item.howItHelps || "(not set)"}</p>
                      <p className="text-xs"><strong>Tags:</strong> {item.tags}</p>
                      <p className="text-xs"><strong>Tier:</strong> {item.tierFit} · <strong>Verified by:</strong> {item.verifiedBy ?? "—"}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </AdminShell>
  );
}
