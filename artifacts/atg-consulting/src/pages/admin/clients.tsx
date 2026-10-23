import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import AdminShell from "@/components/admin/AdminShell";
import { api, type ClientAdmin, type ClientDetail, type PrepView, type PlanAdmin } from "@/lib/api";

// ── Clients list ─────────────────────────────────────────────────────────────

export default function AdminClientsPage() {
  const [, params] = useRoute("/admin/clients/:id/:tab?");
  if (params?.id) return <AdminClientDetail id={params.id} tab={params.tab ?? "overview"} />;
  return <ClientList />;
}

const TIER_OPTIONS = ["", "NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];
const STATUS_OPTIONS = ["", "PROSPECT", "ACTIVE", "PAUSED", "CHURNED"];
const TIER_LABELS: Record<string, string> = { NONE: "No plan", SELF_SERVE: "Self-serve", GUIDED: "Guided", WHITE_GLOVE: "White Glove" };
const STATUS_COLORS: Record<string, string> = { PROSPECT: "text-orange bg-orange/10", ACTIVE: "text-green-700 bg-green-50", PAUSED: "text-navy/60 bg-navy/8", CHURNED: "text-red-600 bg-red-50" };

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
          <h1 className="text-2xl font-extrabold text-navy">Clients</h1>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search name, email, company…" className="flex-1 min-w-48 rounded-xl border border-navy/20 px-4 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange" />
          <select value={tier} onChange={(e) => setTier(e.target.value)} className="rounded-xl border border-navy/20 px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange">
            {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t ? TIER_LABELS[t] ?? t : "All tiers"}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-navy/20 px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
          </select>
          <button onClick={load} className="btn-primary text-sm py-2.5">Search</button>
        </div>

        {loading ? <p className="text-navy/50">Loading…</p> : (
          <div className="rounded-2xl border border-navy/10 overflow-hidden">
            <table className="min-w-full bg-white text-sm">
              <thead className="border-b border-navy/10 bg-navy/[0.02]">
                <tr>
                  {["Name", "Tier", "Status", "Industry", "AI Level", "Sessions", "Docs", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-navy/50 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {clients.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-navy/40">No clients found.</td></tr>
                ) : clients.map((c) => (
                  <tr key={c.id} className="hover:bg-navy/[0.015]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{c.user.name ?? "—"}</p>
                      <p className="text-navy/45 text-xs">{c.user.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-navy/70">{TIER_LABELS[c.tier] ?? c.tier}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[c.status] ?? "text-navy"}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-navy/60">{c.industry ?? "—"}</td>
                    <td className="px-4 py-3 text-navy/60">{c.aiLevel}/4</td>
                    <td className="px-4 py-3 text-navy/60">{c._count?.consultations ?? 0}</td>
                    <td className="px-4 py-3 text-navy/60">{c._count?.documents ?? 0}</td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/clients/${c.id}`}><span className="text-orange text-xs font-semibold hover:underline cursor-pointer">View →</span></Link>
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

const TABS = ["overview", "prep", "plan", "consultations", "documents", "reports"];

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

  if (loading) return <AdminShell><p className="text-navy/50">Loading…</p></AdminShell>;
  if (!client) return <AdminShell><p className="text-red-500">Client not found.</p></AdminShell>;

  return (
    <AdminShell>
      <div className="max-w-4xl mx-auto">
        <Link to="/admin/clients"><span className="btn-ghost mb-4 inline-flex text-sm">← Clients</span></Link>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">{client.user.name ?? "Unnamed"}</h1>
            <p className="text-navy/55 text-sm">{client.user.email ?? "—"} · {client.industry ?? "—"}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={client.tier} disabled={saving} onChange={(e) => updateField("tier", e.target.value)}
              className="rounded-xl border border-navy/20 px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange">
              {["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"].map((t) => <option key={t} value={t}>{TIER_LABELS[t] ?? t}</option>)}
            </select>
            <select value={client.status} disabled={saving} onChange={(e) => updateField("status", e.target.value)}
              className="rounded-xl border border-navy/20 px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange">
              {["PROSPECT", "ACTIVE", "PAUSED", "CHURNED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-navy/10 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <Link key={t} to={`/admin/clients/${id}/${t}`}>
              <span className={`px-4 py-2.5 text-sm font-semibold capitalize whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t ? "border-orange text-orange" : "border-transparent text-navy/50 hover:text-navy"}`}>{t}</span>
            </Link>
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && <OverviewTab client={client} editNotes={editNotes} setEditNotes={setEditNotes} saveNotes={saveNotes} savingNotes={savingNotes} />}
        {tab === "prep" && <PrepTab prep={prep} />}
        {tab === "plan" && <PlanTab plan={client.plans[0] ?? null} />}
        {tab === "consultations" && <ConsultationsTab client={client} onRefresh={() => api.admin.client(id).then(setClient)} />}
        {tab === "documents" && <DocumentsTab client={client} />}
        {tab === "reports" && <ReportsTab client={client} />}
      </div>
    </AdminShell>
  );
}

function OverviewTab({ client, editNotes, setEditNotes, saveNotes, savingNotes }: { client: ClientDetail; editNotes: string; setEditNotes: (v: string) => void; saveNotes: () => void; savingNotes: boolean }) {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="AI level" value={`${client.aiLevel}/4`} />
        <Stat label="Consultations" value={String(client.consultations.length)} />
        <Stat label="Documents" value={String(client.documents.length)} />
      </div>
      <div className="rounded-2xl border border-navy/10 bg-white p-5">
        <p className="text-xs font-bold text-orange tracking-widest uppercase mb-2">Admin notes</p>
        <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={5}
          className="w-full rounded-xl border border-navy/20 px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange resize-none" placeholder="Private notes about this client…" />
        <button onClick={saveNotes} disabled={savingNotes} className="btn-primary text-sm mt-2">{savingNotes ? "Saving…" : "Save notes"}</button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-4">
      <p className="text-xs text-navy/50 mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-navy">{value}</p>
    </div>
  );
}

function PrepTab({ prep }: { prep: PrepView | null }) {
  if (!prep) return <p className="text-navy/50">No intake data yet.</p>;
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
            {(["Role", "Industry", "Business size", "Hours/week lost", "Preferred help", "Automate first"] as const).map((label, i) => {
              const keys = ["role", "industry", "bizSize", "hoursLost", "preferredHelp", "automateFirst"];
              const v = (answers as Record<string, unknown>)[keys[i]!];
              return v ? <div key={label}><span className="font-semibold text-navy">{label}:</span> <span className="text-navy/70">{String(v)}</span></div> : null;
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
                <div key={i} className="mb-4 last:mb-0 border-b border-navy/8 pb-4 last:border-0">
                  <p className="font-bold text-navy">{i + 1}. {o.title} <span className="text-orange text-xs">~{o.estimatedTimeSavedHrsPerWeek}h/wk</span></p>
                  <p className="text-navy/60 text-sm mt-1">Ideas: {o.solutionIdeas?.join(" · ")}</p>
                  <p className="text-navy/45 text-xs mt-0.5">Tools: {o.toolOptions?.join(", ")}</p>
                </div>
              ))}
            </Section>
          )}
          {Array.isArray(adminReport.callAgenda) && <Section title="Call agenda"><ul className="space-y-1 text-sm text-navy/70">{(adminReport.callAgenda as string[]).map((a, i) => <li key={i} className="flex gap-2"><span className="text-orange font-bold">{i + 1}.</span>{a}</li>)}</ul></Section>}
          {Array.isArray(adminReport.discoveryQuestions) && <Section title="Discovery questions"><ul className="space-y-1.5 text-sm text-navy/70">{(adminReport.discoveryQuestions as string[]).map((q, i) => <li key={i} className="flex gap-2"><span className="text-orange">→</span>{q}</li>)}</ul></Section>}
          {Array.isArray(adminReport.likelyObjections) && <Section title="Likely objections"><ul className="space-y-1.5 text-sm text-navy/70">{(adminReport.likelyObjections as string[]).map((o, i) => <li key={i} className="flex gap-2"><span className="text-red-400">⚠</span>{o}</li>)}</ul></Section>}
          {renderAdminReportSection("Recommended scope", adminReport.recommendedScope as string)}
          {Array.isArray(adminReport.risks) && <Section title="Risks & red flags"><ul className="space-y-1.5 text-sm text-navy/70">{(adminReport.risks as string[]).map((r, i) => <li key={i} className="flex gap-2"><span className="text-red-500">🔴</span>{r}</li>)}</ul></Section>}
          {Array.isArray(adminReport.nextSteps) && <Section title="Next steps"><ul className="space-y-1.5 text-sm text-navy/70">{(adminReport.nextSteps as string[]).map((s, i) => <li key={i} className="flex gap-2"><span className="text-green-600">✓</span>{s}</li>)}</ul></Section>}
        </>
      ) : (
        <Section title="Suggested talking points">
          <ul className="space-y-2">{talkingPoints.map((t, i) => <li key={i} className="flex gap-2 text-sm text-navy/70"><span className="text-orange font-bold flex-shrink-0">→</span>{t}</li>)}</ul>
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
  return <Section title={title}><p className="text-sm text-navy/70 leading-relaxed">{content}</p></Section>;
}

function PlanTab({ plan }: { plan: PlanAdmin | null }) {
  if (!plan) return <p className="text-navy/50">No plan generated yet.</p>;
  const focusAreas: { area: string; name: string; whyItMatters: string }[] = (() => { try { return JSON.parse(plan.focusAreas); } catch { return []; } })();

  return (
    <div className="space-y-4">
      <Section title="AI readiness">
        <p className="font-bold text-navy">{plan.aiReadinessLabel}</p>
        <p className="text-navy/65 text-sm mt-1">{plan.aiReadinessSummary}</p>
      </Section>
      <Section title="Focus areas">
        {focusAreas.map((a) => (
          <div key={a.area} className="mb-2 last:mb-0">
            <p className="font-semibold text-navy text-sm">{a.name}</p>
            <p className="text-navy/60 text-xs">{a.whyItMatters}</p>
          </div>
        ))}
      </Section>
      <Section title="Recommended engagement">
        <p className="font-bold text-navy capitalize">{plan.recommendedTier.replace("_", " ")}</p>
        <p className="text-navy/65 text-sm mt-1">{plan.tierRationale}</p>
      </Section>
      <p className="text-navy/35 text-xs">Source: {plan.source} · Created {new Date(plan.createdAt).toLocaleDateString()}</p>
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
      <div className="rounded-2xl border border-navy/10 bg-white p-5">
        <p className="font-bold text-navy mb-3">Add consultation</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="rounded-xl border border-navy/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange" />
          <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="rounded-xl border border-navy/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange" />
        </div>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Session notes (markdown)" className="w-full mt-3 rounded-xl border border-navy/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange resize-none" />
        <button onClick={submit} disabled={creating || !form.title} className="btn-primary text-sm mt-3">Add consultation</button>
      </div>
      {client.consultations.map((c) => (
        <div key={c.id} className="rounded-2xl border border-navy/10 bg-white p-5">
          <p className="font-bold text-navy">{c.title}</p>
          <p className="text-navy/50 text-sm">{c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString() : "No date"} · {c.status}</p>
        </div>
      ))}
    </div>
  );
}

function DocumentsTab({ client }: { client: ClientDetail }) {
  return (
    <div className="space-y-3">
      {client.documents.length === 0 ? <p className="text-navy/50">No documents yet.</p> : client.documents.map((d) => (
        <div key={d.id} className="rounded-2xl border border-navy/10 bg-white p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-navy text-sm">{d.title}</p>
            <p className="text-navy/45 text-xs">{d.type} · {new Date(d.createdAt).toLocaleDateString()} · {d.visibleToClient ? "Visible to client" : "Admin only"}</p>
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
      {reports.length === 0 ? <p className="text-navy/50">No reports yet. Run the daily cron to generate them.</p> : reports.map((r) => (
        <div key={r.id} className="rounded-2xl border border-navy/10 bg-white p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-navy text-sm">{r.date}</p>
            <p className="text-navy/45 text-xs capitalize">{r.status.toLowerCase()}</p>
          </div>
          {r.status === "DRAFT" && <button onClick={() => publish(r.id)} className="btn-primary text-xs py-1 px-3">Publish</button>}
          {r.status === "PUBLISHED" && <span className="text-green-600 text-xs font-semibold">Published</span>}
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5">
      <p className="text-xs font-bold text-orange tracking-widest uppercase mb-3">{title}</p>
      {children}
    </div>
  );
}
