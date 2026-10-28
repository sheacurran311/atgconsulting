/**
 * Admin Engagements page — multi-person company intake groups.
 * Lists engagements, shows member status per engagement, triggers merged review,
 * and lets Shea add role-scoped invite links.
 * Nothing is sent automatically — Shea copies links and sends them himself.
 */
import { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { Link } from "wouter";

interface EngRow {
  id: string;
  companyName: string;
  primaryEmail: string | null;
  status: string;
  rolesRequired: string;
  createdAt: string;
  _count: { members: number; intakes: number };
}

interface MemberRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  status: string;
  inviteToken: string | null;
  inviteExpiresAt: string | null;
  revokedAt: string | null;
  discoveryIntakeId: string | null;
}

interface IntakeSummary {
  id: string;
  contactEmail: string | null;
  contactName: string | null;
  respondentRole: string | null;
  decisionAuthority: string | null;
  tokensUsed: number;
  createdAt: string;
}

interface EngDetail extends EngRow {
  members: MemberRow[];
  intakes: IntakeSummary[];
  mergedReview: string | null;
  totalTokens: number;
}

interface Suggestion { role: string; roleLabel: string; reason: string; priority: string }

const STATUS_COLORS: Record<string, string> = {
  collecting: "#D97706",
  reviewing:  "#3B6BFF",
  approved:   "#16A34A",
};

const MEMBER_STATUS_COLORS: Record<string, string> = {
  invited:     "var(--canvas-text-3)",
  opened:      "#D97706",
  in_progress: "#3B6BFF",
  submitted:   "#16A34A",
  skipped:     "var(--canvas-text-3)",
};

const ROLE_OPTIONS = ["owner","ops_manager","it_admin","finance","sales","field_ops","marketing","general"];

export default function AdminEngagementsPage() {
  const [engagements, setEngagements] = useState<EngRow[]>([]);
  const [selected, setSelected] = useState<EngDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newMemberRole, setNewMemberRole] = useState("ops_manager");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/engagements", { credentials: "include" })
      .then((r) => r.json() as Promise<EngRow[]>)
      .then(setEngagements).catch(() => null)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function openDetail(id: string) {
    const r = await fetch(`/api/admin/engagements/${id}`, { credentials: "include" });
    const d = await r.json() as EngDetail;
    setSelected(d);
    setSuggestions([]);
  }

  async function addMember() {
    if (!selected || !newMemberRole) return;
    setAddingMember(true);
    const r = await fetch(`/api/admin/engagements/${selected.id}/members`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newMemberRole, name: newMemberName || undefined, email: newMemberEmail || undefined }),
    });
    const d = await r.json() as MemberRow & { link: string };
    setNewMemberName(""); setNewMemberEmail("");
    const fullLink = `${window.location.origin}${d.link}`;
    navigator.clipboard.writeText(fullLink).catch(() => null);
    setCopiedLink(fullLink);
    setTimeout(() => setCopiedLink(null), 4000);
    setAddingMember(false);
    openDetail(selected.id);
    load();
  }

  async function revokeMember(mid: string) {
    if (!selected) return;
    await fetch(`/api/admin/engagements/${selected.id}/members/${mid}`, { method: "DELETE", credentials: "include" });
    openDetail(selected.id);
  }

  async function mergeReview() {
    if (!selected) return;
    setMerging(true);
    const r = await fetch(`/api/admin/engagements/${selected.id}/merge`, { method: "POST", credentials: "include" });
    const d = await r.json() as { ok: boolean };
    if (d.ok) openDetail(selected.id);
    setMerging(false);
  }

  async function suggestMembersFromAI() {
    if (!selected) return;
    setSuggesting(true);
    const r = await fetch(`/api/admin/engagements/${selected.id}/suggest-members`, { method: "POST", credentials: "include" });
    const d = await r.json() as { suggestions: Suggestion[] };
    setSuggestions(d.suggestions);
    setSuggesting(false);
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/intake/e/${token}`;
    navigator.clipboard.writeText(url).catch(() => null);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  }

  const mergedReview = (() => {
    try { return selected?.mergedReview ? JSON.parse(selected.mergedReview) as Record<string, unknown> : null; } catch { return null; }
  })();

  return (
    <AdminShell>
      <div className="flex gap-6 max-w-wide mx-auto" style={{ minHeight: "calc(100vh - 80px)" }}>
        {/* List panel */}
        <div className="w-64 flex-shrink-0 space-y-4">
          <div>
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>ENGAGEMENTS</p>
            <h1 className="font-extrabold text-xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>
              {engagements.length} company{engagements.length !== 1 ? "s" : ""}
            </h1>
          </div>
          {loading ? <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>Loading…</p> : (
            <div className="space-y-2">
              {engagements.map((eng) => (
                <button key={eng.id} type="button" onClick={() => openDetail(eng.id)}
                  className="w-full text-left rounded-xl p-3 transition-all"
                  style={{ background: selected?.id === eng.id ? "rgba(59,107,255,0.06)" : "var(--canvas-1)", border: `1px solid ${selected?.id === eng.id ? "var(--blue)" : "var(--canvas-border)"}` }}>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--canvas-text)" }}>{eng.companyName}</p>
                    <span className="font-mono text-2xs flex-shrink-0" style={{ color: STATUS_COLORS[eng.status] ?? "var(--canvas-text-3)" }}>
                      {eng.status}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
                    {eng._count.members} member{eng._count.members !== 1 ? "s" : ""} · {eng._count.intakes} intake{eng._count.intakes !== 1 ? "s" : ""}
                  </p>
                </button>
              ))}
              {engagements.length === 0 && <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>No engagements yet. They're created when a prospect submits their intake.</p>}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="flex-1 min-w-0 overflow-auto space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-extrabold text-xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>{selected.companyName}</p>
                <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>{selected.primaryEmail ?? "—"} · {selected.totalTokens.toLocaleString()} total tokens</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={suggestMembersFromAI} disabled={suggesting} className="btn-secondary text-sm" style={{ padding: "7px 12px" }}>
                  {suggesting ? "Analysing…" : "Suggest members"}
                </button>
                <button type="button" onClick={mergeReview} disabled={merging} className="btn-primary text-sm" style={{ padding: "7px 12px" }}>
                  {merging ? "Merging…" : "Generate merged review"}
                </button>
              </div>
            </div>

            {/* AI suggestions */}
            {suggestions.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "rgba(59,107,255,0.05)", border: "1px solid rgba(59,107,255,0.2)" }}>
                <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>GROK SUGGESTS ADDING</p>
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div key={s.role} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--canvas-text)" }}>{s.roleLabel}</p>
                        <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>{s.reason}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono text-2xs" style={{ color: s.priority === "required" ? "#DC2626" : s.priority === "recommended" ? "#D97706" : "var(--canvas-text-3)" }}>
                          {s.priority}
                        </span>
                        <button type="button" onClick={() => { setNewMemberRole(s.role); }}
                          className="text-xs underline" style={{ color: "var(--blue)" }}>Use</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
                <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>MEMBERS · {selected.members.length}</p>
              </div>
              <div className="p-4 space-y-3">
                {selected.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg p-3" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)", opacity: m.revokedAt ? 0.5 : 1 }}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium" style={{ color: "var(--canvas-text)" }}>{m.name ?? m.email ?? "—"}</p>
                        <span className="font-mono text-2xs" style={{ color: MEMBER_STATUS_COLORS[m.status] ?? "var(--canvas-text-3)" }}>{m.status}</span>
                      </div>
                      <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>{m.role} · {m.email ?? "no email"}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {m.inviteToken && !m.revokedAt && m.status !== "submitted" && (
                        <button type="button" onClick={() => copyLink(m.inviteToken!)} className="text-xs underline" style={{ color: "var(--blue)" }}>
                          {copiedLink?.includes(m.inviteToken) ? "Copied ✓" : "Copy link"}
                        </button>
                      )}
                      {m.discoveryIntakeId && (
                        <Link to={`/admin/discovery`}>
                          <span className="text-xs underline" style={{ color: "var(--canvas-text-2)" }}>View intake</span>
                        </Link>
                      )}
                      {!m.revokedAt && m.status !== "submitted" && (
                        <button type="button" onClick={() => revokeMember(m.id)} className="text-xs underline" style={{ color: "#DC2626" }}>Revoke</button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add member */}
                <div className="pt-3" style={{ borderTop: "1px solid var(--canvas-border)" }}>
                  <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>ADD MEMBER — LINK COPIED TO CLIPBOARD ON CREATE</p>
                  <div className="grid sm:grid-cols-3 gap-2 mb-2">
                    <select className="field-input text-xs" value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)}>
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <input className="field-input text-xs" placeholder="Name (optional)" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
                    <input className="field-input text-xs" type="email" placeholder="Email (optional)" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} />
                  </div>
                  <button type="button" onClick={addMember} disabled={addingMember} className="btn-primary text-xs" style={{ padding: "7px 14px" }}>
                    {addingMember ? "Adding…" : "Add + copy invite link"}
                  </button>
                  {copiedLink && <p className="text-xs mt-1" style={{ color: "#16A34A" }}>✓ Copied: {copiedLink}</p>}
                </div>
              </div>
            </div>

            {/* Intake summaries */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
              <div className="px-4 py-3" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
                <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>SUBMISSIONS · {selected.intakes.length}</p>
              </div>
              <div className="p-4 space-y-2">
                {selected.intakes.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>No submissions yet. Share invite links with your team members.</p>
                ) : selected.intakes.map((intake) => (
                  <div key={intake.id} className="rounded-lg p-3 flex items-center justify-between gap-3" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--canvas-text)" }}>{intake.contactName ?? intake.contactEmail ?? "—"}</p>
                      <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>
                        {intake.respondentRole ?? "unknown role"} · auth: {intake.decisionAuthority ?? "—"} · {intake.tokensUsed} tokens
                      </p>
                    </div>
                    <Link to="/admin/discovery">
                      <span className="text-xs underline" style={{ color: "var(--blue)" }}>View →</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Merged review */}
            {mergedReview && (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
                <div className="px-4 py-3" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
                  <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>MERGED REVIEW</p>
                </div>
                <div className="p-4 space-y-4 text-sm">
                  {(mergedReview as { overview?: string }).overview && (
                    <p style={{ color: "var(--canvas-text)" }}>{(mergedReview as { overview: string }).overview}</p>
                  )}
                  {((mergedReview as { conflicts?: unknown[] }).conflicts ?? []).length > 0 && (
                    <div>
                      <p className="font-mono text-2xs mb-1" style={{ color: "#DC2626", letterSpacing: "0.06em" }}>CONFLICTS</p>
                      {((mergedReview as { conflicts: Array<{ topic: string; description: string; members: string[] }> }).conflicts).map((c, i) => (
                        <div key={i} className="rounded-lg px-3 py-2 mb-1" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)" }}>
                          <p className="font-semibold text-xs" style={{ color: "#DC2626" }}>{c.topic}</p>
                          <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>{c.description}</p>
                          <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>Between: {c.members.join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {((mergedReview as { missingInput?: unknown[] }).missingInput ?? []).length > 0 && (
                    <div>
                      <p className="font-mono text-2xs mb-1" style={{ color: "#D97706", letterSpacing: "0.06em" }}>MISSING INPUT</p>
                      {((mergedReview as { missingInput: Array<{ topic: string; suggestedRole: string }> }).missingInput).map((m, i) => (
                        <p key={i} className="text-xs" style={{ color: "var(--canvas-text-2)" }}>
                          · {m.topic} — suggest adding <strong>{m.suggestedRole}</strong>
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
                    Readiness: <strong style={{ color: (mergedReview as { proposalReadiness?: string }).proposalReadiness === "ready" ? "#16A34A" : "#D97706" }}>
                      {(mergedReview as { proposalReadiness?: string }).proposalReadiness ?? "—"}
                    </strong> · {(mergedReview as { readinessNote?: string }).readinessNote}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: "var(--canvas-text-3)" }}>
            <p className="text-sm">Select an engagement to view details</p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
