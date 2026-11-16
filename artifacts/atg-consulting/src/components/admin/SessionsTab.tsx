import { useState, useEffect, useRef } from "react";
import { api, type SessionRecord } from "@/lib/api";

const SESSION_TYPES = [
  { value: "discovery", label: "Discovery call" }, { value: "guided", label: "Guided session" },
  { value: "dfy_checkin", label: "DFY check-in" }, { value: "other", label: "Other" },
];
const emptyForm = () => ({ sessionDate: new Date().toISOString().split("T")[0]!, sessionType: "guided", sessionNumber: "", recordingUrl: "", consentGiven: false, transcript: "", adminNotes: "" });
const message = (err: unknown) => err instanceof Error ? err.message : "The request failed. Your text is still here. Try again.";
function summaryData(raw: string | null): Record<string, unknown> {
  try { const value: unknown = JSON.parse(raw ?? "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; } catch { return {}; }
}
const draftText = (s: SessionRecord) => { const text = summaryData(s.summaryJson).shortRecap; return typeof text === "string" ? text : ""; };

export default function SessionsTab({ clientId }: { clientId: string }) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const createLock = useRef(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setSessions([]);
    api.admin.sessions(clientId).then((rows) => { if (active) setSessions(rows); })
      .catch((err) => { if (active) setError(message(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clientId]);
  async function createSession() {
    if (createLock.current) return;
    createLock.current = true; setCreating(true); setError("");
    try {
      const saved = await api.admin.createSession(clientId, { ...form, sessionNumber: form.sessionNumber ? Number(form.sessionNumber) : undefined, recordingUrl: form.recordingUrl || undefined });
      setSessions((rows) => [saved, ...rows]); setForm(emptyForm());
    } catch (err) { setError(message(err)); }
    finally { createLock.current = false; setCreating(false); }
  }
  return <div>
    <div className="rounded-xl p-5 mb-6 space-y-3" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
      <p className="label-mono">ADD PRIVATE SESSION RECORD</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-xs">Date<input type="date" value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} className="field-input" disabled={creating} /></label>
        <label className="text-xs">Type<select value={form.sessionType} onChange={(e) => setForm({ ...form, sessionType: e.target.value })} className="field-input" disabled={creating}>{SESSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
        <label className="text-xs">Session # (optional)<input type="number" min={1} max={100} value={form.sessionNumber} onChange={(e) => setForm({ ...form, sessionNumber: e.target.value })} className="field-input" disabled={creating} /></label>
      </div>
      <label className="block text-xs">Recording URL (optional)<input type="url" value={form.recordingUrl} onChange={(e) => setForm({ ...form, recordingUrl: e.target.value })} className="field-input" disabled={creating} /></label>
      <label className="block text-xs">Transcript / source notes (private)<textarea value={form.transcript} onChange={(e) => setForm({ ...form, transcript: e.target.value })} rows={5} maxLength={120000} className="field-input text-xs" disabled={creating} /></label>
      <label className="block text-xs">Admin notes (private)<textarea value={form.adminNotes} onChange={(e) => setForm({ ...form, adminNotes: e.target.value })} rows={2} maxLength={20000} className="field-input text-xs" disabled={creating} /></label>
      <label className="flex gap-2 text-xs"><input type="checkbox" checked={form.consentGiven} onChange={(e) => setForm({ ...form, consentGiven: e.target.checked })} disabled={creating} />Customer authorized recording/transcription and processing this source for a reviewed recap.</label>
      <p className="text-xs">Source and admin notes remain private. Save, review, and publish a recap separately.</p>
      <button onClick={createSession} disabled={creating} className="btn-primary text-sm">{creating ? "Saving…" : "Add session"}</button>
    </div>
    {error && <p role="alert" className="text-sm mb-4">{error}</p>}
    {loading ? <p>Loading…</p> : sessions.length === 0 ? <p className="text-sm">No sessions recorded yet.</p> : sessions.map((session) =>
      <SessionCard key={`${clientId}:${session.id}`} clientId={clientId} session={session} update={(saved) => setSessions((rows) => rows.map((s) => s.id === saved.id ? saved : s))} />)}
  </div>;
}

function SessionCard({ clientId, session: s, update }: { clientId: string; session: SessionRecord; update: (s: SessionRecord) => void }) {
  const [expanded, setExpanded] = useState(new URLSearchParams(window.location.search).get("session") === s.id);
  const [text, setText] = useState(() => draftText(s));
  const [baseVersion, setBaseVersion] = useState(s.updatedAt);
  const [baseline, setBaseline] = useState(() => draftText(s));
  const [transcript, setTranscript] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const dirty = text !== baseline;
  const summary = summaryData(s.summaryJson);
  // A refreshed list must never silently replace an unsaved editor or its version.
  useEffect(() => { if (!dirty && !conflict) { setText(draftText(s)); setBaseline(draftText(s)); setBaseVersion(s.updatedAt); } }, [s.updatedAt, dirty, conflict]);
  function accept(saved: SessionRecord) {
    update(saved); setBaseVersion(saved.updatedAt); setBaseline(draftText(saved)); setText(draftText(saved)); setConflict(false);
  }
  async function act(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try { await work(); } catch (err) {
      setError(message(err));
      if ((err as { status?: number })?.status === 409) setConflict(true);
    } finally { lock.current = false; setBusy(false); }
  }
  const blocked = busy || conflict;
  const lists = Object.entries(summary).filter(([key, value]) => key !== "shortRecap" && Array.isArray(value));
  return <div className="mb-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
    <button className="w-full px-5 py-3 text-left" style={{ background: "var(--canvas-2)" }} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
      <span className="font-semibold text-sm">{SESSION_TYPES.find((t) => t.value === s.sessionType)?.label ?? s.sessionType}{s.sessionNumber ? ` #${s.sessionNumber}` : ""} · {new Date(s.sessionDate).toLocaleDateString()}</span>
      <span className="block text-xs mt-1">{s.shareRecap ? "Published recap available to customer" : "Private record"}{s.summarySource ? ` · Draft: ${s.summarySource}` : ""}</span>
    </button>
    {expanded && <div className="p-5 space-y-4">
      {error && <p role="alert" className="text-sm">{error}</p>}
      {notice && <p role="status" className="text-sm">{notice}</p>}
      {s.summarySource === "TEMPLATE" && <p className="text-xs">Template draft: review and edit before publishing.</p>}
      {typeof summary.sourceWarning === "string" && <p className="text-sm">{summary.sourceWarning}</p>}
      {conflict && <div className="text-sm space-y-2">
        <p>The saved record changed. Reload to compare the current saved draft below with your text, then review and save again.</p>
        <button className="btn-secondary text-xs" disabled={busy} onClick={() => act(async () => {
          const saved = await api.admin.session(clientId, s.id); update(saved); setBaseVersion(saved.updatedAt); setBaseline(draftText(saved)); setConflict(false);
          setNotice("Saved version reloaded. Your editor text was kept. Compare it with the saved draft before saving again.");
        })}>Reload saved version; keep my text</button>
      </div>}
      <label className="flex gap-2 text-xs"><input type="checkbox" checked={s.consentGiven} disabled={blocked || dirty} onChange={(e) => {
        const consentGiven = e.target.checked;
        void act(async () => { accept(await api.admin.patchSession(clientId, s.id, { expectedUpdatedAt: baseVersion, consentGiven })); });
      }} />Customer authorized recording/transcription and processing this source for a reviewed recap.</label>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary text-xs" disabled={blocked || dirty || !s.consentGiven} onClick={() => act(async () => {
          const result = await api.admin.summarizeSession(clientId, s.id, baseVersion); accept(result.session);
          setNotice([result.summary.source === "TEMPLATE" ? "Template draft created. Review and edit it before publishing." : "Private draft created. Review before publishing.", result.warning].filter(Boolean).join(" "));
        })}>{busy ? "Working…" : s.summaryJson ? "Regenerate private draft" : "Generate private draft"}</button>
        <button className="btn-ghost text-xs" disabled={busy} onClick={() => act(async () => { const detail = await api.admin.session(clientId, s.id); setTranscript(detail.transcript ?? "(no transcript)"); })}>Show private source</button>
        {s.shareRecap && <button className="btn-secondary text-xs" disabled={blocked || dirty} onClick={() => act(async () => { accept(await api.admin.patchSession(clientId, s.id, { expectedUpdatedAt: baseVersion, shareRecap: false })); setNotice("Recap is no longer shared."); })}>Unshare recap</button>}
      </div>
      {dirty && <p className="text-xs">Unsaved edits. Save the draft before generating, publishing, or changing authorization.</p>}
      <label className="block text-sm" htmlFor={`recap-${s.id}`}>Private recap draft (1–600 characters)</label>
      <textarea id={`recap-${s.id}`} className="field-input text-sm" rows={4} maxLength={600} value={text} disabled={busy} onChange={(e) => setText(e.target.value)} />
      <div className="flex gap-2 flex-wrap">
        <button className="btn-secondary text-xs" disabled={blocked || !dirty || !text.trim()} onClick={() => act(async () => { accept(await api.admin.saveRecapDraft(clientId, s.id, baseVersion, text)); setNotice("Private draft saved. Review it before publishing."); })}>Save recap draft</button>
        <button className="btn-primary text-xs" disabled={blocked || dirty || !baseline.trim()} onClick={() => act(async () => { accept(await api.admin.publishRecap(clientId, s.id, baseVersion)); setNotice("Reviewed recap published to the customer."); })}>Publish reviewed recap</button>
      </div>
      <div className="rounded-lg p-3 text-sm" style={{ background: "var(--canvas-2)" }}><p className="label-mono">CURRENT SAVED DRAFT (PRIVATE)</p><p className="whitespace-pre-wrap">{draftText(s) || "No saved draft yet."}</p></div>
      {s.recapText && <div className="rounded-lg p-3 text-sm" style={{ background: "var(--canvas-2)" }}><p className="label-mono">{s.shareRecap ? "PUBLISHED CUSTOMER RECAP" : "PREVIOUSLY PUBLISHED RECAP · UNSHARED"}</p><p className="whitespace-pre-wrap">{s.recapText}</p></div>}
      {lists.map(([key, values]) => <div key={key} className="text-xs"><p className="label-mono">{key.replace(/([A-Z])/g, " $1")}</p><ul>{(values as unknown[]).map((item, i) => <li key={i}>{typeof item === "string" ? item : item && typeof item === "object" && "item" in item ? `${String((item as { owner?: unknown }).owner ?? "")}: ${String(item.item)}` : ""}</li>)}</ul></div>)}
      {transcript !== null && <div><p className="label-mono">PRIVATE SOURCE</p><pre className="text-xs whitespace-pre-wrap max-h-64 overflow-auto">{transcript}</pre></div>}
      {s.adminNotes && <div><p className="label-mono">ADMIN NOTES · PRIVATE</p><p className="text-xs whitespace-pre-wrap">{s.adminNotes}</p></div>}
    </div>}
  </div>;
}
