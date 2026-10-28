/**
 * Admin Discovery inbox — lists and manages discovery intake submissions.
 * Shea reviews answers, generates a report draft, approves it, and converts to a client.
 */
import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { Link } from "wouter";

interface IntakeRow {
  id: string;
  contactEmail: string | null;
  contactName: string | null;
  status: string;
  tokensUsed: number;
  consentGiven: boolean;
  reportApprovedAt: string | null;
  createdAt: string;
  clientId: string | null;
}

interface IntakeDetail extends IntakeRow {
  answers: string; // JSON
  transcript: string;
  reportDraft: string | null;
}

interface AnsweredQuestion { id: string; category: string; question: string; answer: string }
interface ReportDraft { summary: string; keyFindings: string[]; painPoints: string[]; suggestedTier: string; tierRationale: string; proposalScope: string; recommendedWorkflows: { slug: string; name: string; why: string }[]; discoveryQuestions: string[]; risks: string[]; nextSteps: string[] }

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  new:          { label: "New", color: "#D97706", bg: "rgba(217,119,6,0.1)" },
  reviewed:     { label: "Reviewed", color: "var(--blue-btn)", bg: "rgba(59,107,255,0.08)" },
  report_sent:  { label: "Report sent", color: "#16A34A", bg: "rgba(22,163,74,0.08)" },
  converted:    { label: "Converted", color: "var(--canvas-text-3)", bg: "var(--canvas-2)" },
};

export default function AdminDiscoveryPage() {
  const [intakes, setIntakes] = useState<IntakeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IntakeDetail | null>(null);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  function load() {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/admin/discovery${params}`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ intakes: IntakeRow[]; total: number }>)
      .then((d) => { setIntakes(d.intakes); setTotal(d.total); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function openDetail(id: string) {
    const r = await fetch(`/api/admin/discovery/${id}`, { credentials: "include" });
    const d = await r.json() as IntakeDetail;
    setSelected(d);
  }

  async function generateReport() {
    if (!selected) return;
    setGenerating(true);
    const r = await fetch(`/api/admin/discovery/${selected.id}/report`, {
      method: "POST", credentials: "include",
    });
    const d = await r.json() as { ok: boolean; report: ReportDraft };
    if (d.ok) {
      setSelected((s) => s ? { ...s, reportDraft: JSON.stringify(d.report), status: "reviewed" } : s);
    }
    setGenerating(false);
    load();
  }

  async function approveReport() {
    if (!selected) return;
    setApproving(true);
    await fetch(`/api/admin/discovery/${selected.id}/approve`, { method: "POST", credentials: "include" });
    setSelected((s) => s ? { ...s, reportApprovedAt: new Date().toISOString(), status: "report_sent" } : s);
    setApproving(false);
    load();
  }

  async function convertToClient() {
    if (!selected) return;
    setConverting(true);
    const r = await fetch(`/api/admin/discovery/${selected.id}/convert`, { method: "POST", credentials: "include" });
    const d = await r.json() as { ok: boolean; clientId?: string };
    if (d.ok && d.clientId) {
      setSelected((s) => s ? { ...s, clientId: d.clientId ?? null, status: "converted" } : s);
    }
    setConverting(false);
    load();
  }

  const answers: AnsweredQuestion[] = (() => {
    try { return selected ? JSON.parse(selected.answers) as AnsweredQuestion[] : []; } catch { return []; }
  })();
  const report: ReportDraft | null = (() => {
    try { return selected?.reportDraft ? JSON.parse(selected.reportDraft) as ReportDraft : null; } catch { return null; }
  })();

  return (
    <AdminShell>
      <div className="flex gap-6 max-w-wide mx-auto" style={{ minHeight: "calc(100vh - 80px)" }}>
        {/* List panel */}
        <div className="w-72 flex-shrink-0 space-y-4">
          <div>
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>DISCOVERY INBOX</p>
            <h1 className="font-extrabold text-xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>
              {total} submission{total !== 1 ? "s" : ""}
            </h1>
          </div>
          <select
            className="field-input text-xs w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="report_sent">Report sent</option>
            <option value="converted">Converted</option>
          </select>

          {loading ? (
            <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
          ) : intakes.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>No submissions yet.</p>
          ) : (
            <div className="space-y-2">
              {intakes.map((row) => {
                const st = STATUS_LABELS[row.status] ?? { label: row.status, color: "var(--canvas-text-3)", bg: "var(--canvas-2)" };
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => openDetail(row.id)}
                    className="w-full text-left rounded-xl p-3 transition-all"
                    style={{
                      background: selected?.id === row.id ? "rgba(59,107,255,0.06)" : "var(--canvas-1)",
                      border: `1px solid ${selected?.id === row.id ? "var(--blue)" : "var(--canvas-border)"}`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--canvas-text)" }}>
                        {row.contactName ?? row.contactEmail ?? "Anonymous"}
                      </p>
                      <span className="font-mono text-2xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: st.bg, color: st.color, letterSpacing: "0.05em" }}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--canvas-text-3)" }}>
                      {new Date(row.createdAt).toLocaleDateString()} · {row.tokensUsed.toLocaleString()} tokens
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="flex-1 min-w-0 overflow-auto space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-extrabold text-xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>
                  {selected.contactName ?? selected.contactEmail ?? "Anonymous"}
                </p>
                <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>{selected.contactEmail ?? "—"}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {!report && (
                  <button type="button" onClick={generateReport} disabled={generating} className="btn-primary text-sm" style={{ padding: "7px 14px" }}>
                    {generating ? "Generating…" : "Generate report draft"}
                  </button>
                )}
                {report && !selected.reportApprovedAt && (
                  <button type="button" onClick={approveReport} disabled={approving} className="btn-primary text-sm" style={{ padding: "7px 14px" }}>
                    {approving ? "Approving…" : "Approve report"}
                  </button>
                )}
                {!selected.clientId && (
                  <button type="button" onClick={convertToClient} disabled={converting} className="btn-secondary text-sm" style={{ padding: "7px 14px" }}>
                    {converting ? "Converting…" : "Convert to client"}
                  </button>
                )}
                {selected.clientId && (
                  <Link to={`/admin/clients/${selected.clientId}`}>
                    <span className="btn-secondary text-sm" style={{ padding: "7px 14px" }}>View client →</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Q&A transcript */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
              <div className="px-4 py-3" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
                <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>
                  ANSWERS · {answers.length} questions
                </p>
              </div>
              <div className="p-4 space-y-4">
                {answers.map((a, i) => (
                  <div key={a.id}>
                    <p className="font-mono text-2xs mb-0.5" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>
                      {i + 1}. [{a.category}] {a.question}
                    </p>
                    <p className="text-sm" style={{ color: "var(--canvas-text)" }}>{a.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Report draft */}
            {report && (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
                  <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>REPORT DRAFT</p>
                  {selected.reportApprovedAt && (
                    <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: "rgba(22,163,74,0.08)", color: "#16A34A" }}>
                      APPROVED {new Date(selected.reportApprovedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-4 text-sm">
                  <div>
                    <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>SUMMARY</p>
                    <p style={{ color: "var(--canvas-text)" }}>{report.summary}</p>
                  </div>
                  <div>
                    <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>SUGGESTED TIER</p>
                    <p className="font-semibold" style={{ color: "var(--canvas-text)" }}>{report.suggestedTier} — {report.tierRationale}</p>
                  </div>
                  <div>
                    <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>PAIN POINTS</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {report.painPoints.map((p, i) => <li key={i} style={{ color: "var(--canvas-text-2)" }}>{p}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>RECOMMENDED WORKFLOWS</p>
                    {report.recommendedWorkflows.map((w) => (
                      <div key={w.slug} className="flex gap-2 text-sm">
                        <span className="font-mono text-xs text-canvas-text-3">{w.slug}</span>
                        <span style={{ color: "var(--canvas-text-2)" }}>— {w.why}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>PROPOSAL SCOPE</p>
                    <p style={{ color: "var(--canvas-text)" }}>{report.proposalScope}</p>
                  </div>
                  <div>
                    <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>DISCOVERY CALL QUESTIONS</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {report.discoveryQuestions.map((q, i) => <li key={i} style={{ color: "var(--canvas-text-2)" }}>{q}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>NEXT STEPS</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {report.nextSteps.map((s, i) => <li key={i} style={{ color: "var(--canvas-text-2)" }}>{s}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: "var(--canvas-text-3)" }}>
            <p className="text-sm">Select a submission to view details</p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
