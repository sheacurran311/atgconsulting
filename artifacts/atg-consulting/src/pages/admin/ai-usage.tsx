/**
 * Admin AI Assist usage page — monthly token counts + estimated cost per client.
 * Costs are estimates only (input/output split assumed 50/50). Verify against xAI billing.
 * Also links to the chat log viewer per client.
 */
import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";

interface UsageRow {
  clientId: string; name: string; email: string; tier: string;
  messages: number; tokens: number; estimatedCostUsd: number;
}

interface LogEntry {
  id: string; feature: string; role: string; content: string;
  tokens: number; model: string; createdAt: string;
}

export default function AdminAIUsagePage() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [month, setMonth] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ai-assist/usage", { credentials: "include" })
      .then((r) => r.json() as Promise<{ month: string; disclaimer: string; rows: UsageRow[] }>)
      .then((d) => { setRows(d.rows); setMonth(d.month); setDisclaimer(d.disclaimer); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  function loadLog(clientId: string) {
    setSelectedClient(clientId);
    setLogLoading(true);
    fetch(`/api/admin/ai-assist/log/${clientId}`, { credentials: "include" })
      .then((r) => r.json() as Promise<LogEntry[]>)
      .then(setLog)
      .catch(() => setLog([]))
      .finally(() => setLogLoading(false));
  }

  const totalTokens = rows.reduce((s, r) => s + r.tokens, 0);
  const totalCost = rows.reduce((s, r) => s + r.estimatedCostUsd, 0);

  const FEATURE_COLORS: Record<string, string> = {
    coach: "rgba(59,107,255,0.12)",
    customize: "rgba(139,92,246,0.12)",
    troubleshoot: "rgba(234,179,8,0.12)",
    refresh: "rgba(34,197,94,0.12)",
  };

  return (
    <AdminShell>
      <div className="max-w-content mx-auto space-y-6">
        <div>
          <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>ADMIN · AI ASSIST</p>
          <h1 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>AI usage · {month}</h1>
          {disclaimer && (
            <p className="text-xs mt-1" style={{ color: "var(--canvas-text-3)" }}>{disclaimer}</p>
          )}
        </div>

        {/* Totals */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            ["Total clients using AI", rows.length.toLocaleString()],
            ["Total tokens", totalTokens.toLocaleString()],
            ["Estimated cost", `$${totalCost.toFixed(4)} USD`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl p-4" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>{label?.toUpperCase()}</p>
              <p className="font-extrabold text-xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>{value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--canvas-border)" }}>
            <table className="min-w-full text-sm" style={{ background: "var(--canvas-1)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
                  {["Client", "Tier", "Messages", "Tokens", "Est. cost", "Log"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">
                      <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>{h.toUpperCase()}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.clientId} style={{ borderBottom: "1px solid var(--canvas-border)" }}>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: "var(--canvas-text)" }}>{row.name}</p>
                      <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>{row.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: "var(--canvas-2)", color: "var(--canvas-text-3)" }}>{row.tier}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--canvas-text)" }}>{row.messages}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--canvas-text)" }}>{row.tokens.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--canvas-text)" }}>~${row.estimatedCostUsd.toFixed(4)}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => loadLog(row.clientId)} className="text-xs underline" style={{ color: "var(--blue)" }}>
                        View log
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--canvas-text-3)" }}>No AI usage this month.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Chat log drawer */}
        {selectedClient && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
              <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>
                Chat log — {rows.find((r) => r.clientId === selectedClient)?.name ?? selectedClient}
              </p>
              <button type="button" onClick={() => setSelectedClient(null)} className="btn-ghost text-sm p-1">✕</button>
            </div>
            <div className="p-4 space-y-3" style={{ maxHeight: "480px", overflowY: "auto" }}>
              {logLoading ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p> :
                log.length === 0 ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>No messages.</p> :
                log.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="rounded-xl px-3 py-2 text-xs max-w-[80%]" style={{
                      background: FEATURE_COLORS[m.feature] ?? "var(--canvas-2)",
                      border: "1px solid var(--canvas-border)",
                      color: "var(--canvas-text)",
                    }}>
                      <div className="flex gap-2 mb-0.5" style={{ color: "var(--canvas-text-3)", fontSize: "10px" }}>
                        <span>{m.feature} · {m.role}</span>
                        <span>{new Date(m.createdAt).toLocaleString()}</span>
                        {m.tokens > 0 && <span>{m.tokens} tok</span>}
                      </div>
                      <p style={{ whiteSpace: "pre-wrap" }}>{m.content}</p>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
