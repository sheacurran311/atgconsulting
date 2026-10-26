import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import AdminShell from "@/components/admin/AdminShell";
import { api, type ClientAdmin, type ClientDetail, type PrepView, type PlanAdmin } from "@/lib/api";
import PlaybookTab from "@/components/admin/PlaybookTab";
import SessionsTab from "@/components/admin/SessionsTab";

// ── Clients list ─────────────────────────────────────────────────────────────

export default function AdminClientsPage() {
  const [, params] = useRoute("/admin/clients/:id/:tab?");
  if (params?.id) return <AdminClientDetail id={params.id} tab={params.tab ?? "overview"} />;
  return <ClientList />;
}

const TIER_OPTIONS = ["", "NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];
const STATUS_OPTIONS = ["", "PROSPECT", "ACTIVE", "PAUSED", "CHURNED"];
const TIER_LABELS: Record<string, string> = { NONE: "No plan", SELF_SERVE: "Self-serve", GUIDED: "Guided", WHITE_GLOVE: "White Glove" };
const STATUS_COLORS: Record<string, string> = { PROSPECT: "text-blue bg-blue/10", ACTIVE: "text-green-700 bg-green-50", PAUSED: "text-canvas-text bg-canvas-2", CHURNED: "text-red-600 bg-red-50" };

function ClientList() {
  const [clients, setClients] = useState<ClientAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tier) params.set("tier", tier);
    if (status) params.set("status", status);
    api.admin.clients(params.toString()).then(setClients).finally(() => setLoading(false));
  }

  useEffect(load, [tier, status]);

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-canvas-text">Clients</h1>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search name, email, company…" className="flex-1 min-w-48 rounded-xl border border-canvas-border px-4 py-2.5 text-sm text-canvas-text focus:outline-none focus:ring-2 focus:ring-blue" />
          <select value={tier} onChange={(e) => setTier(e.target.value)} className="rounded-xl border border-canvas-border px-3 py-2.5 text-sm text-canvas-text focus:outline-none focus:ring-2 focus:ring-blue">
            {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t ? TIER_LABELS[t] ?? t : "All tiers"}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-canvas-border px-3 py-2.5 text-sm text-canvas-text focus:outline-none focus:ring-2 focus:ring-blue">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
          </select>
          <button onClick={load} className="btn-primary text-sm py-2.5">Search</button>
        </div>

        {loading ? <p className="text-canvas-text">Loading…</p> : (
          <div className="rounded-2xl border border-canvas-border overflow-hidden">
            <table className="min-w-full bg-canvas-1 text-sm">
              <thead className="border-b border-canvas-border bg-canvas-2[0.02]">
                <tr>
                  {["Name", "Tier", "Status", "Industry", "AI Level", "Sessions", "Docs", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-canvas-text uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {clients.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-canvas-text">No clients found.</td></tr>
                ) : clients.map((c) => (
                  <tr key={c.id} className="hover:bg-canvas-2[0.015]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-canvas-text">{c.user.name ?? "—"}</p>
                      <p className="text-canvas-text text-xs">{c.user.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-canvas-text">{TIER_LABELS[c.tier] ?? c.tier}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[c.status] ?? "text-canvas-text"}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-canvas-text">{c.industry ?? "—"}</td>
                    <td className="px-4 py-3 text-canvas-text">{c.aiLevel}/4</td>
                    <td className="px-4 py-3 text-canvas-text">{c._count?.consultations ?? 0}</td>
                    <td className="px-4 py-3 text-canvas-text">{c._count?.documents ?? 0}</td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/clients/${c.id}`}><span className="text-blue text-xs font-semibold hover:underline cursor-pointer">View →</span></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

// ── Client detail ─────────────────────────────────────────────────────────────

const TABS = ["overview", "prep", "playbook", "sessions", "plan", "consultations", "documents", "reports", "outputs", "workflows"];

function AdminClientDetail({ id, tab }: { id: string; tab: string }) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [prep, setPrep] = useState<PrepView | null>(null);
  const [loading, setLoading] = useState(true);
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    api.admin.client(id).then((c) => { setClient(c); setEditNotes(c.notes ?? ""); }).finally(() => setLoading(false));
    api.admin.clientPrep(id).then(setPrep).catch(() => null);
  }, [id]);

  async function updateField(field: string, value: string) {
    setSaving(true);
    const updated = await api.admin.updateClient(id, { [field]: value }).catch(() => null);
    if (updated && client) setClient({ ...client, [field]: value });
    setSaving(false);
  }

  async function saveNotes() {
    setSavingNotes(true);
    await api.admin.updateClient(id, { notes: editNotes });
    if (client) setClient({ ...client, notes: editNotes });
    setSavingNotes(false);
  }

  if (loading) return <AdminShell><p className="text-canvas-text">Loading…</p></AdminShell>;
  if (!client) return <AdminShell><p className="text-red-500">Client not found.</p></AdminShell>;

  return (
    <AdminShell>
      <div className="max-w-4xl mx-auto">
        <Link to="/admin/clients"><span className="btn-ghost mb-4 inline-flex text-sm">← Clients</span></Link>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-canvas-text">{client.user.name ?? "Unnamed"}</h1>
            <p className="text-canvas-text text-sm">{client.user.email ?? "—"} · {client.industry ?? "—"}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={client.tier} disabled={saving} onChange={(e) => updateField("tier", e.target.value)}
              className="rounded-xl border border-canvas-border px-3 py-2 text-sm text-canvas-text focus:outline-none focus:ring-2 focus:ring-blue">
              {["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"].map((t) => <option key={t} value={t}>{TIER_LABELS[t] ?? t}</option>)}
            </select>
            <select value={client.status} disabled={saving} onChange={(e) => updateField("status", e.target.value)}
              className="rounded-xl border border-canvas-border px-3 py-2 text-sm text-canvas-text focus:outline-none focus:ring-2 focus:ring-blue">
              {["PROSPECT", "ACTIVE", "PAUSED", "CHURNED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <PersonalizeButton clientId={id} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-canvas-border mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <Link key={t} to={`/admin/clients/${id}/${t}`}>
              <span className={`px-4 py-2.5 text-sm font-semibold capitalize whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t ? "border-blue text-blue" : "border-transparent text-canvas-text hover:text-canvas-text"}`}>{t}</span>
            </Link>
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && <OverviewTab client={client} editNotes={editNotes} setEditNotes={setEditNotes} saveNotes={saveNotes} savingNotes={savingNotes} />}
        {tab === "prep" && <PrepTab prep={prep} />}
        {tab === "playbook" && <PlaybookTabWrapper clientId={id} intakeId={client.intakes[0]?.id} />}
        {tab === "sessions" && <SessionsTab clientId={id} />}
        {tab === "plan" && <PlanTab plan={client.plans[0] ?? null} />}
        {tab === "consultations" && <ConsultationsTab client={client} onRefresh={() => api.admin.client(id).then(setClient)} />}
        {tab === "documents" && <DocumentsTab client={client} />}
        {tab === "reports" && <ReportsTab client={client} />}
        {tab === "outputs" && <OutputsTab client={client} onRefresh={() => api.admin.client(id).then(setClient)} />}
        {tab === "workflows" && <ClientWorkflowsTab clientId={id} />}
      </div>
    </AdminShell>
  );
}

function OverviewTab({ client, editNotes, setEditNotes, saveNotes, savingNotes }: { client: ClientDetail; editNotes: string; setEditNotes: (v: string) => void; saveNotes: () => void; savingNotes: boolean }) {
  const [sessTotal, setSessTotal] = useState<number | "">(("guidedSessionsTotal" in client ? (client as ClientDetail & { guidedSessionsTotal?: number }).guidedSessionsTotal : null) ?? "");
  const [sessUsed, setSessUsed] = useState<number>(("guidedSessionsUsed" in client ? (client as ClientDetail & { guidedSessionsUsed?: number }).guidedSessionsUsed : 0) ?? 0);
  const [savingSess, setSavingSess] = useState(false);

  async function saveSessions() {
    if (!sessTotal) return;
    setSavingSess(true);
    await api.admin.setGuidedSessions(client.id, { guidedSessionsTotal: Number(sessTotal), guidedSessionsUsed: sessUsed }).catch(() => null);
    setSavingSess(false);
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="AI level" value={`${client.aiLevel}/4`} />
        <Stat label="Consultations" value={String(client.consultations.length)} />
        <Stat label="Documents" value={String(client.documents.length)} />
      </div>

      {/* Guided session package */}
      {(client.tier === "GUIDED" || sessTotal !== "") && (
        <div className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
          <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>GUIDED SESSION PACKAGE</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)" }}>TOTAL SESSIONS</label>
              <input type="number" min={1} max={20} value={sessTotal} onChange={(e) => setSessTotal(e.target.value ? Number(e.target.value) : "")}
                className="field-input text-sm" />
            </div>
            <div>
              <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)" }}>SESSIONS USED</label>
              <input type="number" min={0} max={20} value={sessUsed} onChange={(e) => setSessUsed(Number(e.target.value))}
                className="field-input text-sm" />
            </div>
          </div>
          <button onClick={saveSessions} disabled={savingSess || !sessTotal} className="btn-primary text-sm">
            {savingSess ? "Saving…" : "Save session package"}
          </button>
        </div>
      )}

      <div className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
        <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>ADMIN NOTES</p>
        <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={5}
          className="field-input resize-none text-sm" placeholder="Private notes about this client…" />
        <button onClick={saveNotes} disabled={savingNotes} className="btn-primary text-sm mt-2">{savingNotes ? "Saving…" : "Save notes"}</button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-4">
      <p className="text-xs text-canvas-text mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-canvas-text">{value}</p>
    </div>
  );
}

function PrepTab({ prep }: { prep: PrepView | null }) {
  if (!prep) return <p className="text-canvas-text">No intake data yet.</p>;
  const { answers, plan, talkingPoints } = prep;

  // Parse admin report if present
  let adminReport: Record<string, unknown> | null = null;
  if (plan?.adminReport) {
    try { adminReport = JSON.parse(plan.adminReport); } catch { /* ignore */ }
  }

  return (
    <div className="space-y-5">
      {/* Intake summary */}
      {answers && (
        <Section title="Intake answers">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {(["Role", "Industry", "Business size", "Hours/week lost", "Preferred help", "Automate first", "Tool budget", "Current software", "Weekly volumes"] as const).map((label, i) => {
              const keys = ["role", "industry", "bizSize", "hoursLost", "preferredHelp", "automateFirst", "toolBudget", "currentSoftware", "weeklyVolumes"];
              const v = (answers as Record<string, unknown>)[keys[i]!];
              return v ? <div key={label}><span className="font-semibold text-canvas-text">{label}:</span> <span className="text-canvas-text">{String(v)}</span></div> : null;
            })}
          </div>
        </Section>
      )}

      {/* Admin report */}
      {adminReport ? (
        <>
          {renderAdminReportSection("Situation & pains", adminReport.situationAndPains as string)}
          {renderAdminReportSection("AI readiness assessment", adminReport.aiReadinessAssessment as string)}
          {Array.isArray(adminReport.opportunityAreas) && (
            <Section title="Opportunity areas (ranked)">
              {(adminReport.opportunityAreas as Array<{ area: string; title: string; estimatedTimeSavedHrsPerWeek: number; solutionIdeas: string[]; toolOptions: string[] }>).map((o, i) => (
                <div key={i} className="mb-4 last:mb-0 border-b border-canvas-border pb-4 last:border-0">
                  <p className="font-bold text-canvas-text">{i + 1}. {o.title} <span className="text-blue text-xs">~{o.estimatedTimeSavedHrsPerWeek}h/wk</span></p>
                  <p className="text-canvas-text text-sm mt-1">Ideas: {o.solutionIdeas?.join(" · ")}</p>
                  <p className="text-canvas-text text-xs mt-0.5">Tools: {o.toolOptions?.join(", ")}</p>
                </div>
              ))}
            </Section>
          )}
          {Array.isArray(adminReport.callAgenda) && <Section title="Call agenda"><ul className="space-y-1 text-sm text-canvas-text">{(adminReport.callAgenda as string[]).map((a, i) => <li key={i} className="flex gap-2"><span className="text-blue font-bold">{i + 1}.</span>{a}</li>)}</ul></Section>}
          {Array.isArray(adminReport.discoveryQuestions) && <Section title="Discovery questions"><ul className="space-y-1.5 text-sm text-canvas-text">{(adminReport.discoveryQuestions as string[]).map((q, i) => <li key={i} className="flex gap-2"><span className="text-blue">→</span>{q}</li>)}</ul></Section>}
          {Array.isArray(adminReport.likelyObjections) && <Section title="Likely objections"><ul className="space-y-1.5 text-sm text-canvas-text">{(adminReport.likelyObjections as string[]).map((o, i) => <li key={i} className="flex gap-2"><span className="text-red-400">⚠</span>{o}</li>)}</ul></Section>}
          {renderAdminReportSection("Recommended scope", adminReport.recommendedScope as string)}
          {Array.isArray(adminReport.risks) && <Section title="Risks & red flags"><ul className="space-y-1.5 text-sm text-canvas-text">{(adminReport.risks as string[]).map((r, i) => <li key={i} className="flex gap-2"><span className="text-red-500">🔴</span>{r}</li>)}</ul></Section>}
          {Array.isArray(adminReport.nextSteps) && <Section title="Next steps"><ul className="space-y-1.5 text-sm text-canvas-text">{(adminReport.nextSteps as string[]).map((s, i) => <li key={i} className="flex gap-2"><span className="text-green-600">✓</span>{s}</li>)}</ul></Section>}
        </>
      ) : (
        <Section title="Suggested talking points">
          <ul className="space-y-2">{talkingPoints.map((t, i) => <li key={i} className="flex gap-2 text-sm text-canvas-text"><span className="text-blue font-bold flex-shrink-0">→</span>{t}</li>)}</ul>
        </Section>
      )}

      <div className="text-right">
        <a href="#" onClick={(e) => { e.preventDefault(); window.print(); }} className="btn-secondary text-sm">🖨 Print / save as PDF</a>
      </div>
    </div>
  );
}

function renderAdminReportSection(title: string, content: string | undefined) {
  if (!content) return null;
  return <Section title={title}><p className="text-sm text-canvas-text leading-relaxed">{content}</p></Section>;
}

function PlanTab({ plan }: { plan: PlanAdmin | null }) {
  if (!plan) return <p className="text-canvas-text">No plan generated yet.</p>;
  const focusAreas: { area: string; name: string; whyItMatters: string }[] = (() => { try { return JSON.parse(plan.focusAreas); } catch { return []; } })();

  return (
    <div className="space-y-4">
      <Section title="AI readiness">
        <p className="font-bold text-canvas-text">{plan.aiReadinessLabel}</p>
        <p className="text-canvas-text text-sm mt-1">{plan.aiReadinessSummary}</p>
      </Section>
      <Section title="Focus areas">
        {focusAreas.map((a) => (
          <div key={a.area} className="mb-2 last:mb-0">
            <p className="font-semibold text-canvas-text text-sm">{a.name}</p>
            <p className="text-canvas-text text-xs">{a.whyItMatters}</p>
          </div>
        ))}
      </Section>
      <Section title="Recommended engagement">
        <p className="font-bold text-canvas-text capitalize">{plan.recommendedTier.replace("_", " ")}</p>
        <p className="text-canvas-text text-sm mt-1">{plan.tierRationale}</p>
      </Section>
      <p className="text-canvas-text text-xs">Source: {plan.source} · Created {new Date(plan.createdAt).toLocaleDateString()}</p>
    </div>
  );
}

function ConsultationsTab({ client, onRefresh }: { client: ClientDetail; onRefresh: () => void }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", scheduledAt: "", durationMin: 60, notes: "" });

  async function submit() {
    setCreating(true);
    await api.admin.createConsultation(client.id, form).catch(() => null);
    onRefresh();
    setCreating(false);
    setForm({ title: "", scheduledAt: "", durationMin: 60, notes: "" });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-5">
        <p className="font-bold text-canvas-text mb-3">Add consultation</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="rounded-xl border border-canvas-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue" />
          <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="rounded-xl border border-canvas-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue" />
        </div>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Session notes (markdown)" className="w-full mt-3 rounded-xl border border-canvas-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue resize-none" />
        <button onClick={submit} disabled={creating || !form.title} className="btn-primary text-sm mt-3">Add consultation</button>
      </div>
      {client.consultations.map((c) => (
        <div key={c.id} className="rounded-2xl border border-canvas-border bg-canvas-1 p-5">
          <p className="font-bold text-canvas-text">{c.title}</p>
          <p className="text-canvas-text text-sm">{c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString() : "No date"} · {c.status}</p>
        </div>
      ))}
    </div>
  );
}

function DocumentsTab({ client }: { client: ClientDetail }) {
  return (
    <div className="space-y-3">
      {client.documents.length === 0 ? <p className="text-canvas-text">No documents yet.</p> : client.documents.map((d) => (
        <div key={d.id} className="rounded-2xl border border-canvas-border bg-canvas-1 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-canvas-text text-sm">{d.title}</p>
            <p className="text-canvas-text text-xs">{d.type} · {new Date(d.createdAt).toLocaleDateString()} · {d.visibleToClient ? "Visible to client" : "Admin only"}</p>
          </div>
          <a href={`/api/documents/${d.id}/download`} className="btn-secondary text-xs py-1 px-3">Download</a>
        </div>
      ))}
    </div>
  );
}

function ReportsTab({ client }: { client: ClientDetail }) {
  const [reports, setReports] = useState(client.reports);

  async function publish(id: string) {
    const updated = await api.admin.publishReport(id).catch(() => null);
    if (updated) setReports((r) => r.map((x) => x.id === id ? updated : x));
  }

  return (
    <div className="space-y-3">
      {reports.length === 0 ? <p className="text-canvas-text">No reports yet. Run the daily cron to generate them.</p> : reports.map((r) => (
        <div key={r.id} className="rounded-2xl border border-canvas-border bg-canvas-1 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-canvas-text text-sm">{r.date}</p>
            <p className="text-canvas-text text-xs capitalize">{r.status.toLowerCase()}</p>
          </div>
          {r.status === "DRAFT" && <button onClick={() => publish(r.id)} className="btn-primary text-xs py-1 px-3">Publish</button>}
          {r.status === "PUBLISHED" && <span className="text-green-600 text-xs font-semibold">Published</span>}
        </div>
      ))}
    </div>
  );
}

const OUTPUT_TYPES = ["email_draft", "briefing", "lead_list", "social_post", "quote_followup", "review_request"] as const;

function OutputsTab({ client, onRefresh }: { client: ClientDetail; onRefresh: () => void }) {
  const workflows = client.workflows ?? [];
  const [workflowId, setWorkflowId] = useState(workflows[0]?.id ?? "new");
  const [name, setName] = useState("Follow-up drafts");
  const [description, setDescription] = useState("A follow-up email, ready for the client to review and copy.");
  const [area, setArea] = useState("sales");
  const [type, setType] = useState<(typeof OUTPUT_TYPES)[number]>("email_draft");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      let id = workflowId;
      if (id === "new") {
        const created = await api.admin.createWorkflow(client.id, { name, description, area, status: "live" });
        id = created.id;
      }
      await api.admin.postOutput(client.id, { workflowId: id, type, subject, content });
      setWorkflowId(id);
      setSubject("");
      setContent("");
      setMessage("Draft added to their Today list. Nothing was sent.");
      onRefresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not add that draft.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-canvas-border bg-canvas-1 p-5 space-y-3 max-w-xl">
      <p className="text-xs font-bold text-blue tracking-widest uppercase">Add a draft</p>
      <p className="text-sm text-canvas-text">The client reviews and copies it. This does not send email.</p>
      <label className="block text-sm font-semibold text-canvas-text">
        Workflow
        <select value={workflowId} onChange={(e) => setWorkflowId(e.target.value)} className="mt-1 w-full rounded-xl border border-canvas-border px-3 py-2 text-sm font-normal">
          {workflows.map((wf) => <option key={wf.id} value={wf.id}>{wf.name}</option>)}
          <option value="new">New workflow…</option>
        </select>
      </label>
      {workflowId === "new" && (
        <>
          <label className="block text-sm font-semibold text-canvas-text">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-xl border border-canvas-border px-3 py-2 text-sm font-normal" />
          </label>
          <label className="block text-sm font-semibold text-canvas-text">
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} required className="mt-1 w-full rounded-xl border border-canvas-border px-3 py-2 text-sm font-normal" />
          </label>
          <label className="block text-sm font-semibold text-canvas-text">
            Area
            <select value={area} onChange={(e) => setArea(e.target.value)} className="mt-1 w-full rounded-xl border border-canvas-border px-3 py-2 text-sm font-normal">
              <option value="sales">Sales</option>
              <option value="ea">Admin and ops</option>
              <option value="marketing">Marketing</option>
              <option value="cs">Customer replies</option>
            </select>
          </label>
        </>
      )}
      <label className="block text-sm font-semibold text-canvas-text">
        Type
        <select value={type} onChange={(e) => setType(e.target.value as (typeof OUTPUT_TYPES)[number])} className="mt-1 w-full rounded-xl border border-canvas-border px-3 py-2 text-sm font-normal">
          {OUTPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold text-canvas-text">
        Subject
        <input value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={200} className="mt-1 w-full rounded-xl border border-canvas-border px-3 py-2 text-sm font-normal" />
      </label>
      <label className="block text-sm font-semibold text-canvas-text">
        Draft
        <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={6} className="mt-1 w-full rounded-xl border border-canvas-border px-3 py-2 text-sm font-normal" />
      </label>
      {message && <p className="text-sm text-canvas-text">{message}</p>}
      <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? "Saving…" : "Add to Today"}</button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-canvas-border bg-canvas-1 p-5">
      <p className="text-xs font-bold text-blue tracking-widest uppercase mb-3">{title}</p>
      {children}
    </div>
  );
}

// ── Playbook wrapper ──────────────────────────────────────────────────────────
function PlaybookTabWrapper({ clientId, intakeId }: { clientId: string; intakeId?: string }) {
  return <PlaybookTab clientId={clientId} intakeId={intakeId} />;
}

// ── Client workflow settings tab ──────────────────────────────────────────────
function ClientWorkflowsTab({ clientId }: { clientId: string }) {
  const [settings, setSettings] = useState<{ slug: string; name: string; minTier: string; enabled: boolean; clientEnabled: boolean | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.workflowSettings?.(clientId).then((d) => setSettings(d as typeof settings)).catch(() => null).finally(() => setLoading(false));
  }, [clientId]);

  async function toggle(slug: string, current: boolean | null) {
    const next = current === null ? false : !current; // first toggle: disable (was using global=enabled)
    await api.admin.patchWorkflowSetting?.(clientId, slug, next).catch(() => null);
    setSettings((s) => s.map((x) => x.slug === slug ? { ...x, clientEnabled: next } : x));
  }

  const TIER_LABELS: Record<string, string> = { NONE: "All", SELF_SERVE: "Self-serve+", GUIDED: "Guided+", WHITE_GLOVE: "DFY" };

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: "var(--canvas-text-2)" }}>
        Override per-client workflow availability. <strong style={{ color: "var(--canvas-text)" }}>null</strong> = uses global enabled state.
      </p>
      {loading ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
      : settings.map((s) => {
        const effective = s.clientEnabled ?? s.enabled;
        return (
          <div key={s.slug} className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg mb-2" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--canvas-text)" }}>{s.name}</p>
              <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>{s.slug} · {TIER_LABELS[s.minTier] ?? s.minTier} · global: {s.enabled ? "on" : "off"} · client: {s.clientEnabled === null ? "default" : s.clientEnabled ? "on" : "off"}</p>
            </div>
            <div className="flex gap-2 items-center">
              <span className="font-mono text-2xs" style={{ color: effective ? "#16A34A" : "#DC2626" }}>{effective ? "ENABLED" : "DISABLED"}</span>
              <button
                onClick={() => toggle(s.slug, s.clientEnabled)}
                className="btn-ghost text-xs py-1 px-2"
              >
                {s.clientEnabled === null ? "Override" : "Reset to default"}
              </button>
              {s.clientEnabled !== null && (
                <button onClick={async () => {
                  await api.admin.patchWorkflowSetting?.(clientId, s.slug, !s.clientEnabled!).catch(() => null);
                  setSettings((x) => x.map((t) => t.slug === s.slug ? { ...t, clientEnabled: !t.clientEnabled } : t));
                }} className="btn-secondary text-xs py-1 px-2">{s.clientEnabled ? "Disable" : "Enable"}</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Personalize button ────────────────────────────────────────────────────────
function PersonalizeButton({ clientId }: { clientId: string }) {
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    const result = await api.admin.personalizeClient?.(clientId).catch(() => null);
    setMsg(result?.message ?? "Done.");
    setRunning(false);
    setTimeout(() => setMsg(null), 4000);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={running}
        className="btn-secondary text-xs py-1.5 px-3"
        title="Re-run workspace personalization from latest intake data"
      >
        {running ? "Personalizing…" : "Re-run personalization"}
      </button>
      {msg && <span className="text-xs" style={{ color: "var(--blue)" }}>{msg}</span>}
    </div>
  );
}
