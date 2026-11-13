import { useCallback, useEffect, useState } from "react";

type Phase = { id: string; label: string; owner: string; status: string; deliverable: string; evidence: string; dueDate: string };
type Workflow = { id: string; name: string; realm: string; owner: string; role: string; trigger: string; inputs: string; actions: string; approval: string; recovery: string; success: string; platform: string; status: string; evidence: string; checkedAt: string; lastSuccessAt: string; baselineMinutes: number | null; currentMinutes: number | null };
type Integration = { name: string; purpose: string; accountOwner: string; permissions: string; status: string; evidence: string; checkedAt: string; cost: string };
type Content = { audience: string; summary: string; desiredOutcome: string; boundaries: string; approvalPolicy: string; budget: string; phases: Phase[]; workflows: Workflow[]; integrations: Integration[]; care: { scope: string; cadence: string; responseExpectation: string; nextReview: string; monthlyCost: string; offboarding: string } };
type Event = { id: string; kind: string; note: string; createdAt: string; resolvedAt: string | null };
type Plan = { id: string; version?: number; content?: string; internalNotes?: string; publishedContent: string | null; publishedVersion: number | null; acceptedVersion: number | null; publishedAt: string | null; acceptedAt: string | null; events?: Event[] };
const label = (value: string) => value.replace(/_/g, " ");
const card = { background: "var(--canvas-1)", border: "1px solid var(--canvas-border)", borderRadius: 16, padding: 20 };
const control = { width: "100%", padding: "10px 12px", border: "1px solid var(--canvas-border)", borderRadius: 8, background: "var(--canvas-1)", color: "var(--canvas-text)", fontSize: 14 };
async function call(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`/api${path}`, { method, credentials: "include", ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Unable to complete this request. Please try again.");
  return data;
}
function Field({ title, value, edit, change, choices, date = false }: { title: string; value: string; edit: boolean; change: (s: string) => void; choices?: string[]; date?: boolean }) {
  return <label className="block text-sm"><span className="block font-semibold mb-1">{title}</span>{edit ? choices ? <select style={control} value={value} onChange={(e) => change(e.target.value)}>{choices.map((c) => <option key={c} value={c}>{label(c)}</option>)}</select> : date ? <input type="date" value={value} onChange={(e) => change(e.target.value)} style={control} /> : <textarea rows={2} value={value} maxLength={2000} onChange={(e) => change(e.target.value)} style={control} /> : <span className="block whitespace-pre-wrap" style={{ color: "var(--canvas-text-2)" }}>{value ? label(value) : "Not recorded"}</span>}</label>;
}

export default function OperatingGuide({ clientId }: { clientId?: string }) {
  const admin = !!clientId;
  const path = admin ? `/admin/clients/${clientId}/operations` : "/client/operations";
  const [plan, setPlan] = useState<Plan | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState("feedback");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const load = useCallback(async () => {
    const data = await call(path);
    const p = data.plan as Plan | null;
    const raw = admin ? p?.content : p?.publishedContent;
    setContent(raw ? JSON.parse(raw) as Content : null);
    setPlan(p); setNotes(p?.internalNotes ?? ""); setDirty(false); setConfirmed(false);
  }, [path, admin]);
  useEffect(() => { setLoading(true); load().catch((e: Error) => setError(e.message)).finally(() => setLoading(false)); }, [load]);
  async function action(fn: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try { await fn(); await load(); setMessage(success); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function change(next: Content) { setContent(next); setDirty(true); }
  if (loading) return <p role="status">Loading your operating guide…</p>;
  if (!content || !plan) return <section style={card}>
    <h2 className="text-xl font-bold mb-2">{admin ? "Audit & delivery playbook" : "Your AI operating guide"}</h2>
    <p className="mb-4">{admin ? "Create a draft from the latest submitted assessment. Review scope, workflow contracts, acceptance tests, and care before publishing." : "Your assessment is the starting point. Once Shea reviews your plan, your milestones, workflow instructions, and care details will appear here."}</p>
    {error && <p role="alert" className="text-red-700 mb-3">{error}</p>}
    {admin && <button className="btn-primary" disabled={busy} onClick={() => action(() => call(path, "POST", {}), "Draft created from the assessment.")}>{busy ? "Creating…" : "Create draft from assessment"}</button>}
    {!admin && <a href="/intake?edit=true" className="btn-secondary">Review your assessment</a>}
  </section>;
  const setWorkflow = (index: number, key: keyof Workflow, value: string | number | null) => change({ ...content, workflows: content.workflows.map((w, i) => i === index ? { ...w, [key]: value } : w) });
  const fields: [keyof Workflow, string][] = [["name", "Workflow"], ["role", "Role in your team"], ["owner", "Human owner"], ["trigger", "What starts the work"], ["inputs", "Allowed information"], ["actions", "What it does"], ["approval", "When it needs approval"], ["recovery", "How to pause and recover"], ["success", "Acceptance criteria"], ["platform", "Where it runs"], ["evidence", "Test evidence / source"]];
  return <div className="space-y-5" style={{ color: "var(--canvas-text)" }}>
    <section style={card}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="font-mono text-xs mb-2" style={{ color: "var(--blue-btn)" }}>{admin ? "OPERATOR PLAYBOOK" : "YOUR OPERATING GUIDE"} · {content.audience.toUpperCase()}</p><h2 className="text-2xl font-bold">A plan you can put to work.</h2><p className="text-sm mt-2">{admin ? `Draft v${plan.version} · Published ${plan.publishedVersion ? `v${plan.publishedVersion}` : "not yet"}${dirty ? " · Unsaved changes" : ""}` : `Reviewed version ${plan.publishedVersion}`}</p></div>
        <div className="flex flex-wrap gap-2">{admin ? <>
          <button className="btn-primary" disabled={busy || !dirty} onClick={() => action(() => call(path, "PUT", { version: plan.version, content, internalNotes: notes }), "Draft saved. Published guide is unchanged.")}>Save draft</button>
          <button className="btn-secondary" disabled={busy || dirty} onClick={() => action(() => call(`${path}/publish`, "POST", { version: plan.version }), "Reviewed guide published to the customer.")}>Publish reviewed guide</button>
        </> : <a className="btn-secondary" href="/api/client/operations/download">Download guide</a>}</div>
      </div>
      <p className="text-sm mt-4" style={{ color: "var(--canvas-text-2)" }}>Live actions run in your own connected platforms. ATG stores this guide and reported evidence; it does not read your inbox or monitor your calendar.</p>
      {error && <p role="alert" className="text-red-700 mt-3">{error}</p>}{message && <p role="status" className="text-green-800 mt-3">{message}</p>}
    </section>
    <section style={card} className="grid md:grid-cols-2 gap-4">
      {([ ["summary", "Your priorities"], ["desiredOutcome", "What success looks like"], ["boundaries", "Information boundaries"], ["approvalPolicy", "Approval policy"], ["budget", "Budget and recurring costs"] ] as const).map(([key, title]) => <Field key={key} title={title} value={content[key]} edit={admin} change={(v) => change({ ...content, [key]: v })} />)}
    </section>
    <section style={card}><h3 className="text-lg font-bold mb-4">Your delivery milestones</h3><div className="space-y-4">{content.phases.map((s, i) => <details key={s.id} open={s.status === "in_progress"} className="border-b pb-3" style={{ borderColor: "var(--canvas-border)" }}><summary className="cursor-pointer font-semibold">{i + 1}. {s.label} <span className="text-xs ml-2">{label(s.status)}</span></summary><div className="grid md:grid-cols-2 gap-3 mt-3">{([ ["owner", "Owner"], ["deliverable", "Deliverable"], ["evidence", "Evidence / notes"], ["dueDate", "Due date"], ["status", "Status"] ] as const).map(([key, title]) => <Field key={key} title={title} value={s[key]} edit={admin} date={key === "dueDate"} choices={key === "status" ? ["not_started", "in_progress", "complete"] : undefined} change={(v) => change({ ...content, phases: content.phases.map((p, n) => n === i ? { ...p, [key]: v } : p) })} />)}</div></details>)}</div></section>
    <section><h3 className="text-lg font-bold mb-3">Your workflow team</h3><p className="text-sm mb-4">Roles become operational only after configuration and testing. Statuses below are operator-reported, not live monitoring.</p><div className="grid lg:grid-cols-2 gap-4">{content.workflows.map((w, i) => <article key={w.id} style={card}>
      <div className="flex justify-between gap-2 mb-3"><h4 className="font-bold text-lg">{w.name}</h4><span className="text-xs rounded px-2 py-1 h-fit" style={{ background: "var(--canvas-2)" }}>{label(w.status)}</span></div>
      <p className="text-sm mb-3">{w.realm === "personal" ? "Personal & family" : "Business"} · {w.role}</p>
      <details open={admin}><summary className="cursor-pointer text-sm font-semibold">Workflow contract & evidence</summary><div className="space-y-3 mt-3">{fields.map(([key, title]) => <Field key={key} title={title} value={String(w[key] ?? "")} edit={admin} change={(v) => setWorkflow(i, key, v)} />)}
      <Field title="Status" value={w.status} edit={admin} choices={["planned", "configured", "tested", "live", "paused"]} change={(v) => setWorkflow(i, "status", v)} />
      <Field title="Information context" value={w.realm} edit={admin} choices={["business", "personal"]} change={(v) => setWorkflow(i, "realm", v)} />
      <Field title="Test checked on" value={w.checkedAt} edit={admin} date change={(v) => setWorkflow(i, "checkedAt", v)} />
      <Field title="Last successful run reported" value={w.lastSuccessAt} edit={admin} date change={(v) => setWorkflow(i, "lastSuccessAt", v)} />
      <div className="grid grid-cols-2 gap-3">{([ ["baselineMinutes", "Weekly minutes before"], ["currentMinutes", "Weekly minutes now"] ] as const).map(([key, title]) => <label key={key} className="text-sm">{title}{admin ? <input style={control} type="number" min={0} max={10080} value={w[key] ?? ""} onChange={(e) => setWorkflow(i, key, e.target.value === "" ? null : Number(e.target.value))} /> : <p className="font-semibold">{w[key] ?? "Not measured"}</p>}</label>)}</div>
      {w.baselineMinutes !== null && w.currentMinutes !== null && <p className="text-sm">Reported change: {w.baselineMinutes - w.currentMinutes} minutes/week. Confirm comparable periods; this is not an independently verified saving.</p>}
      </div></details>
      {!admin && <a className="inline-block mt-4 text-sm underline" href={`/api/client/operations/download?workflow=${encodeURIComponent(w.id)}`}>Download this workflow's setup brief</a>}
      {admin && <div className="flex flex-wrap gap-2 mt-4">{i > 0 && <button className="btn-secondary text-sm" onClick={() => change({ ...content, workflows: [w, ...content.workflows.filter((_, n) => n !== i)] })}>Prioritize first</button>}{content.workflows.length > 1 && <button className="btn-secondary text-sm" onClick={() => change({ ...content, workflows: content.workflows.filter((_, n) => n !== i) })}>Remove from scope</button>}</div>}
    </article>)}</div>{admin && content.workflows.length < 8 && <button className="btn-secondary mt-4" onClick={() => change({ ...content, workflows: [...content.workflows, { id: `custom-${Date.now()}`, name: "New workflow", realm: "business", owner: "Confirm with customer", role: "", trigger: "Define the trigger", inputs: "", actions: "", approval: "Customer approval required", recovery: "Pause and contact the owner", success: "Define acceptance tests", platform: "", status: "planned", evidence: "", checkedAt: "", lastSuccessAt: "", baselineMinutes: null, currentMinutes: null }] })}>Add workflow to scope</button>}</section>
    <section style={card}><h3 className="text-lg font-bold mb-3">Integration register</h3><p className="text-sm mb-4">Record the actual platform, account owner, allowed actions, costs, and date of the last capability check. A recommendation is not a verified connection.</p>{content.integrations.map((item, i) => <details key={i} open={admin} className="mb-4"><summary className="font-semibold cursor-pointer">{item.name} · {label(item.status)}</summary><div className="grid md:grid-cols-2 gap-3 mt-3">{Object.entries(item).map(([key, value]) => <Field key={key} title={label(key.replace(/([A-Z])/g, " $1"))} value={value} edit={admin} date={key === "checkedAt"} choices={key === "status" ? ["not_assessed", "available", "connected", "verified", "blocked"] : undefined} change={(v) => change({ ...content, integrations: content.integrations.map((row, n) => n === i ? { ...row, [key]: v } : row) })} />)}</div></details>)}{admin && content.integrations.length < 12 && <button className="btn-secondary" onClick={() => change({ ...content, integrations: [...content.integrations, { name: "New integration", purpose: "", accountOwner: "Customer", permissions: "", status: "not_assessed", evidence: "", checkedAt: "", cost: "Confirm before installation" }] })}>Add integration</button>}</section>
    <section style={card}><h3 className="text-lg font-bold mb-4">Care, support & handoff</h3><div className="grid md:grid-cols-2 gap-4">{Object.entries(content.care).map(([key, value]) => <Field key={key} title={label(key.replace(/([A-Z])/g, " $1"))} value={value} edit={admin} date={key === "nextReview"} change={(v) => change({ ...content, care: { ...content.care, [key]: v } })} />)}</div></section>
    {admin && <section style={card}><label className="block font-semibold mb-2">Private operator notes — never published</label><textarea style={control} rows={4} maxLength={10000} value={notes} onChange={(e) => { setNotes(e.target.value); setDirty(true); }} /><p className="text-sm mt-2">Do not enter credentials or private inbox/calendar contents.</p></section>}
    {!admin && <section style={card}><h3 className="font-bold mb-2">Review and acceptance</h3>{plan.acceptedVersion === plan.publishedVersion ? <p>You confirmed this version on {plan.acceptedAt ? new Date(plan.acceptedAt).toLocaleDateString() : "the recorded date"}.</p> : <><label className="flex gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />I reviewed this guide, understand the approval boundaries, and know how to pause or request help. This does not authorize new account access or purchases.</label><button disabled={busy || !confirmed} className="btn-primary mt-4" onClick={() => action(() => call(`${path}/accept`, "POST", { version: plan.publishedVersion, confirmed: true }), "Your review was recorded.")}>Confirm reviewed version</button></>}</section>}
    <section style={card}><h3 className="font-bold mb-3">Reports & exceptions</h3><p className="text-sm mb-4">Human-reported evidence. For an urgent failure, pause the workflow in its own platform and contact your agreed support channel.</p>{!admin && <div className="space-y-3 mb-5"><label className="block text-sm">Report type<select style={control} value={kind} onChange={(e) => setKind(e.target.value)}>{["feedback", "test_result", "incident", "successful_run", "measurement"].map((k) => <option key={k}>{k}</option>)}</select></label><label className="block text-sm">What happened? No passwords, private messages, or children's names.<textarea style={control} value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} /></label><button className="btn-primary" disabled={busy || note.trim().length < 5} onClick={() => action(async () => { await call(`${path}/events`, "POST", { kind, note }); setNote(""); }, "Report saved for review.")}>Send report</button></div>}{!plan.events?.length && <p className="text-sm">No reports recorded yet.</p>}{plan.events?.map((event) => <article key={event.id} className="border-t py-3" style={{ borderColor: "var(--canvas-border)" }}><p className="font-semibold text-sm">{label(event.kind)} · {event.resolvedAt ? "Reviewed / resolved" : "Awaiting review"} · {new Date(event.createdAt).toLocaleDateString()}</p><p className="text-sm whitespace-pre-wrap my-2">{event.note}</p>{admin && <button className="btn-secondary text-sm" disabled={busy || dirty} onClick={() => action(() => call(`${path}/events/${event.id}`, "PATCH", { resolved: !event.resolvedAt }), "Report status updated.")}>{event.resolvedAt ? "Reopen" : "Mark reviewed / resolved"}</button>}</article>)}</section>
  </div>;
}
