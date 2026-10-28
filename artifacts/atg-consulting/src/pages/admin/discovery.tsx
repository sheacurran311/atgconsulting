/**
 * Admin Discovery inbox — lists and manages discovery intake submissions.
 * Shea reviews answers, generates a report draft, approves it, and converts to a client.
 */
import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { Link } from "wouter";

interface InviteRow {
  id: string; token: string; link: string; status: string;
  prefilledName: string | null; prefilledCompany: string | null;
  contextNote: string | null; discoveryIntakeId: string | null;
  expiresAt: string; revokedAt: string | null; createdAt: string;
}

interface ProposalRow {
  id: string; status: string; reviewSummary: string; execSummary: string;
  understanding: string; scope: string; howWeConnect: string;
  milestones: string; investment: string; acceptanceClause: string;
  approvedAt: string | null; portalPublishedAt: string | null;
}

interface IntakeRow {
  id: string;
  contactEmail: string | null;
  contactName: string | null;
  status: string;
  tokensUsed: number;
  consentGiven: boolean;
  reportApprovedAt: string | null;
  decisionAuthority: string | null;
  approverName: string | null;
  approverEmail: string | null;
  approverRole: string | null;
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
  const [tab, setTab] = useState<"inbox" | "invites">("inbox");
  const [intakes, setIntakes] = useState<IntakeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IntakeDetail | null>(null);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [manualLinkId, setManualLinkId] = useState("");
  const [manualLinking, setManualLinking] = useState(false);
  const [manualLinkMsg, setManualLinkMsg] = useState<string | null>(null);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [proposal, setProposal] = useState<ProposalRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  // Invite management state
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCompany, setInviteCompany] = useState("");
  const [inviteIndustry, setInviteIndustry] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

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

  function loadInvites() {
    fetch("/api/admin/discovery/invites", { credentials: "include" })
      .then((r) => r.json() as Promise<InviteRow[]>)
      .then(setInvites).catch(() => null);
  }
  useEffect(() => { if (tab === "invites") loadInvites(); }, [tab]);

  async function openDetail(id: string) {
    const r = await fetch(`/api/admin/discovery/${id}`, { credentials: "include" });
    const d = await r.json() as IntakeDetail;
    setSelected(d);
    setProposal(null);
    // Load proposal if it exists
    fetch(`/api/admin/discovery/${id}/proposal`, { credentials: "include" })
      .then((r) => r.ok ? r.json() as Promise<ProposalRow> : null)
      .then((p) => { if (p) setProposal(p); })
      .catch(() => null);
  }

  async function createInvite() {
    setCreatingInvite(true);
    const r = await fetch("/api/admin/discovery/invite", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefilledName: inviteName || undefined, prefilledEmail: inviteEmail || undefined, prefilledCompany: inviteCompany || undefined, prefilledIndustry: inviteIndustry || undefined, contextNote: inviteNote || undefined }),
    });
    const d = await r.json() as InviteRow;
    setCreatingInvite(false);
    setInviteName(""); setInviteEmail(""); setInviteCompany(""); setInviteIndustry(""); setInviteNote("");
    loadInvites();
    const fullLink = `${window.location.origin}${d.link}`;
    navigator.clipboard.writeText(fullLink).catch(() => null);
    setCopiedLink(fullLink);
    setTimeout(() => setCopiedLink(null), 4000);
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/admin/discovery/invites/${id}`, { method: "DELETE", credentials: "include" });
    loadInvites();
  }

  async function manualLinkToClient() {
    if (!selected || !manualLinkId.trim()) return;
    setManualLinking(true);
    const r = await fetch(`/api/admin/discovery/${selected.id}/link-client`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: manualLinkId.trim() }),
    });
    const d = await r.json() as { ok?: boolean; error?: string; clientEmail?: string; clientName?: string };
    if (d.ok) {
      setManualLinkMsg(`✓ Linked to ${d.clientName ?? d.clientEmail ?? manualLinkId}`);
      setSelected((s) => s ? { ...s, clientId: manualLinkId.trim() } : s);
      setManualLinkId("");
    } else {
      setManualLinkMsg(d.error ?? "Failed to link.");
    }
    setManualLinking(false);
    setTimeout(() => setManualLinkMsg(null), 5000);
  }

  async function generateProposal() {
    if (!selected) return;
    setGeneratingProposal(true);
    const r = await fetch(`/api/admin/discovery/${selected.id}/proposal`, { method: "POST", credentials: "include" });
    const d = await r.json() as { ok: boolean; proposal: ProposalRow };
    if (d.ok) setProposal(d.proposal);
    setGeneratingProposal(false);
  }

  async function approveProposal(publishToPortal = false) {
    if (!selected) return;
    setApproving(true);
    await fetch(`/api/admin/discovery/${selected.id}/proposal/approve`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publishToPortal }),
    });
    setProposal((p) => p ? { ...p, status: publishToPortal ? "portal_published" : "approved", approvedAt: new Date().toISOString() } : p);
    setApproving(false);
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
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>DISCOVERY</p>
            <div className="flex gap-1 mt-2">
              {(["inbox", "invites"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize"
                  style={{ background: tab === t ? "var(--blue)" : "var(--canvas-2)", color: tab === t ? "#fff" : "var(--canvas-text-2)", border: "none", cursor: "pointer" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {tab === "inbox" && (<>
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
          </>)}

          {tab === "invites" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold" style={{ color: "var(--canvas-text)" }}>Create invite link</p>
              <input className="field-input text-xs w-full" placeholder="Name (optional)" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
              <input className="field-input text-xs w-full" type="email" placeholder="Email (pre-fills and editable)" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value.toLowerCase())} />
              <input className="field-input text-xs w-full" placeholder="Company (optional)" value={inviteCompany} onChange={(e) => setInviteCompany(e.target.value)} />
              <input className="field-input text-xs w-full" placeholder="Industry (optional)" value={inviteIndustry} onChange={(e) => setInviteIndustry(e.target.value)} />
              <textarea className="field-input text-xs w-full" rows={2} placeholder="Private Grok context note (not shown to prospect)" value={inviteNote} onChange={(e) => setInviteNote(e.target.value)} style={{ resize: "vertical" }} />
              <button type="button" onClick={createInvite} disabled={creatingInvite} className="btn-primary text-xs w-full" style={{ padding: "8px" }}>
                {creatingInvite ? "Creating…" : "Create + copy link"}
              </button>
              {copiedLink && <p className="text-xs" style={{ color: "#16A34A" }}>✓ Copied: {copiedLink}</p>}
              <div className="space-y-2 mt-2">
                {invites.map((inv) => (
                  <div key={inv.id} className="rounded-lg p-3" style={{ background: "var(--canvas-1)", border: "1px solid var(--canvas-border)", opacity: inv.revokedAt ? 0.5 : 1 }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-medium" style={{ color: "var(--canvas-text)" }}>{inv.prefilledName ?? inv.prefilledCompany ?? "Anonymous invite"}</p>
                      <span className="font-mono text-2xs px-1 py-0.5 rounded" style={{ background: "var(--canvas-2)", color: "var(--canvas-text-3)" }}>{inv.status}</span>
                    </div>
                    <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)" }}>{new Date(inv.expiresAt).toLocaleDateString()}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${inv.link}`).catch(() => null); setCopiedLink(inv.link); setTimeout(() => setCopiedLink(null), 2000); }} className="text-xs underline" style={{ color: "var(--blue)" }}>Copy link</button>
                      {!inv.revokedAt && <button type="button" onClick={() => revokeInvite(inv.id)} className="text-xs underline" style={{ color: "#DC2626" }}>Revoke</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "inbox" ? (loading ? (
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
                      {new Date(row.createdAt).toLocaleDateString()} · {row.tokensUsed > 0 ? `${row.tokensUsed.toLocaleString()} tokens` : "no AI used"}
                    </p>
                    {(row.decisionAuthority === "partial" || row.decisionAuthority === "none") && (
                      <span className="font-mono text-2xs px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: "rgba(234,179,8,0.12)", color: "#D97706", letterSpacing: "0.04em", border: "1px solid rgba(234,179,8,0.3)" }}>
                        ⚠ PENDING APPROVER
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )) : null}
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
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                {!report && (
                  <button type="button" onClick={generateReport} disabled={generating} className="btn-primary text-sm" style={{ padding: "7px 14px" }}>
                    {generating ? "Generating…" : "Generate report"}
                  </button>
                )}
                {report && !selected.reportApprovedAt && (
                  <button type="button" onClick={approveReport} disabled={approving} className="btn-secondary text-sm" style={{ padding: "7px 14px" }}>
                    {approving ? "Approving…" : "Approve report"}
                  </button>
                )}
                {/* Proposal actions */}
                {!proposal && (
                  <button type="button" onClick={generateProposal} disabled={generatingProposal} className="btn-primary text-sm" style={{ padding: "7px 14px" }}>
                    {generatingProposal ? "Drafting proposal…" : "Generate proposal"}
                  </button>
                )}
                {proposal && proposal.status === "draft" && (
                  <>
                    <a href={`/api/admin/discovery/${selected.id}/proposal.html`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm" style={{ padding: "7px 14px" }}>
                      Preview proposal →
                    </a>
                    <button type="button" onClick={() => approveProposal(false)} disabled={approving} className="btn-primary text-sm" style={{ padding: "7px 14px", background: "#16A34A" }}>
                      {approving ? "…" : "Approve & export PDF"}
                    </button>
                  </>
                )}
                {proposal && proposal.status !== "draft" && (
                  <a href={`/api/admin/discovery/${selected.id}/proposal.html`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm" style={{ padding: "7px 14px" }}>
                    Open proposal PDF →
                  </a>
                )}
                {!selected.clientId && (
                  <button type="button" onClick={convertToClient} disabled={converting} className="btn-ghost text-sm" style={{ padding: "7px 14px" }}>
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

            {/* Manual link to client (override for email mismatch) */}
            {!selected.clientId && (
              <div className="rounded-xl p-4" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
                <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>MANUAL LINK — ADMIN OVERRIDE</p>
                <p className="text-xs mb-2" style={{ color: "var(--canvas-text-3)" }}>
                  For cases where the prospect signed up with a different email. This action is audit-logged.
                </p>
                <div className="flex gap-2">
                  <input
                    className="field-input text-xs flex-1"
                    placeholder="Client ID (cuid)"
                    value={manualLinkId}
                    onChange={(e) => setManualLinkId(e.target.value)}
                  />
                  <button type="button" onClick={manualLinkToClient} disabled={manualLinking || !manualLinkId.trim()} className="btn-secondary text-xs" style={{ padding: "6px 12px", flexShrink: 0 }}>
                    {manualLinking ? "…" : "Link"}
                  </button>
                </div>
                {manualLinkMsg && <p className="text-xs mt-1" style={{ color: manualLinkMsg.startsWith("✓") ? "#16A34A" : "#DC2626" }}>{manualLinkMsg}</p>}
              </div>
            )}

            {/* Decision authority panel */}
            {selected.decisionAuthority && (
              <div className="rounded-xl p-4" style={{
                background: selected.decisionAuthority === "full" ? "rgba(22,163,74,0.05)" : "rgba(234,179,8,0.06)",
                border: `1px solid ${selected.decisionAuthority === "full" ? "rgba(22,163,74,0.2)" : "rgba(234,179,8,0.3)"}`,
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-mono text-2xs" style={{ color: selected.decisionAuthority === "full" ? "#16A34A" : "#D97706", letterSpacing: "0.08em" }}>
                    DECISION AUTHORITY · {selected.decisionAuthority.toUpperCase()}
                  </p>
                  {selected.decisionAuthority !== "full" && (
                    <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: "rgba(234,179,8,0.12)", color: "#D97706" }}>⚠ PENDING APPROVER</span>
                  )}
                </div>
                {selected.decisionAuthority === "full" ? (
                  <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>Respondent has full authority to approve and grant access.</p>
                ) : (
                  <div className="space-y-1">
                    {selected.approverName  && <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}><strong>Approver:</strong> {selected.approverName}</p>}
                    {selected.approverRole  && <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}><strong>Title:</strong> {selected.approverRole}</p>}
                    {selected.approverEmail && (
                      <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>
                        <strong>Email:</strong>{" "}
                        <a href={`mailto:${selected.approverEmail}`} style={{ color: "var(--blue)", textDecoration: "underline" }}>{selected.approverEmail}</a>
                        {" · "}
                        <button type="button"
                          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/intake/i/new?email=${encodeURIComponent(selected.approverEmail ?? "")}`).catch(() => null); }}
                          className="text-xs underline" style={{ color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }}>
                          Copy invite link for approver
                        </button>
                      </p>
                    )}
                    {!selected.approverName && <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>Approver details not collected yet. Create an invite link and send it manually.</p>}
                  </div>
                )}
              </div>
            )}

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

            {/* Proposal draft panel */}
            {proposal && (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
                  <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>PROPOSAL DRAFT</p>
                  <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: proposal.status === "draft" ? "rgba(234,179,8,0.1)" : "rgba(22,163,74,0.08)", color: proposal.status === "draft" ? "#D97706" : "#16A34A" }}>
                    {proposal.status.toUpperCase()}
                  </span>
                </div>
                <div className="p-4 space-y-4 text-sm">
                  {[
                    ["Internal review", proposal.reviewSummary],
                    ["Executive summary", proposal.execSummary],
                    ["Understanding", proposal.understanding],
                    ["Scope", proposal.scope],
                    ["How it connects", proposal.howWeConnect],
                  ].map(([label, value]) => value ? (
                    <div key={label}>
                      <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>{label?.toUpperCase()}</p>
                      <p style={{ color: "var(--canvas-text)", whiteSpace: "pre-wrap" }}>{value}</p>
                    </div>
                  ) : null)}
                  <div>
                    <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>INVESTMENT</p>
                    <p style={{ color: "var(--canvas-text)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>{proposal.investment}</p>
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
