/**
 * Sessions tab — admin-only. Create/view/summarize session records.
 * Full transcript is admin-only; client sees short recap only if admin toggles shareRecap.
 * Includes consent checkbox on each record.
 */
import { useState, useEffect } from "react";
import { api, type SessionRecord, type SessionSummary } from "@/lib/api";

const SESSION_TYPES = [
  { value: "discovery",    label: "Discovery call" },
  { value: "guided",       label: "Guided session" },
  { value: "dfy_checkin",  label: "DFY check-in" },
  { value: "other",        label: "Other" },
];

interface Props { clientId: string }

export default function SessionsTab({ clientId }: Props) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [summarizing, setSummarizing] = useState<string | null>(null);

  const [form, setForm] = useState({
    sessionDate: new Date().toISOString().split("T")[0]!,
    sessionType: "guided" as string,
    sessionNumber: "" as string,
    recordingUrl: "",
    consentGiven: false,
    transcript: "",
    adminNotes: "",
  });

  function load() {
    setLoading(true);
    api.admin.sessions(clientId).then(setSessions).catch(() => null).finally(() => setLoading(false));
  }
  useEffect(load, [clientId]);

  async function createSession() {
    setCreating(true);
    const body = {
      ...form,
      sessionNumber: form.sessionNumber ? parseInt(form.sessionNumber, 10) : undefined,
      recordingUrl: form.recordingUrl || undefined,
    };
    const s = await api.admin.createSession(clientId, body).catch(() => null);
    if (s) setSessions((p) => [s, ...p]);
    setForm({ sessionDate: new Date().toISOString().split("T")[0]!, sessionType: "guided", sessionNumber: "", recordingUrl: "", consentGiven: false, transcript: "", adminNotes: "" });
    setCreating(false);
  }

  async function toggleShare(s: SessionRecord) {
    const updated = await api.admin.patchSession(clientId, s.id, { shareRecap: !s.shareRecap }).catch(() => null);
    if (updated) setSessions((p) => p.map((x) => x.id === s.id ? updated : x));
  }

  async function summarize(s: SessionRecord) {
    setSummarizing(s.id);
    const result = await api.admin.summarizeSession(clientId, s.id).catch(() => null);
    if (result) {
      setSessions((p) => p.map((x) => x.id === s.id ? result.session : x));
    }
    setSummarizing(null);
  }

  async function loadTranscript(sid: string) {
    const detail = await api.admin.session(clientId, sid).catch(() => null);
    setTranscript(detail?.transcript ?? "(no transcript)");
  }

  function parseSummary(raw: string | null): SessionSummary | null {
    if (!raw) return null;
    try { return JSON.parse(raw) as SessionSummary; } catch { return null; }
  }

  return (
    <div>
      {/* Create form */}
      <div className="rounded-xl p-5 mb-6" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
        <p className="font-mono text-2xs font-bold mb-4" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>ADD SESSION</p>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="label-mono block mb-1">DATE</label>
            <input type="date" value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} className="field-input text-sm" />
          </div>
          <div>
            <label className="label-mono block mb-1">TYPE</label>
            <select value={form.sessionType} onChange={(e) => setForm({ ...form, sessionType: e.target.value })} className="field-input text-sm">
              {SESSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label-mono block mb-1">SESSION # (optional)</label>
            <input type="number" min={1} value={form.sessionNumber} onChange={(e) => setForm({ ...form, sessionNumber: e.target.value })} placeholder="e.g. 2" className="field-input text-sm" />
          </div>
        </div>
        <div className="mb-3">
          <label className="label-mono block mb-1">RECORDING URL (optional)</label>
          <input type="url" value={form.recordingUrl} onChange={(e) => setForm({ ...form, recordingUrl: e.target.value })} placeholder="https://…" className="field-input text-sm" />
        </div>
        <div className="mb-3">
          <label className="label-mono block mb-1">TRANSCRIPT / NOTES (paste .txt, .vtt, .srt, .md)</label>
          <textarea value={form.transcript} onChange={(e) => setForm({ ...form, transcript: e.target.value })} rows={5} className="field-input resize-none text-xs" placeholder="Paste transcript or notes here…" />
        </div>
        <div className="mb-3">
          <label className="label-mono block mb-1">ADMIN NOTES</label>
          <textarea value={form.adminNotes} onChange={(e) => setForm({ ...form, adminNotes: e.target.value })} rows={2} className="field-input resize-none text-xs" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input type="checkbox" checked={form.consentGiven} onChange={(e) => setForm({ ...form, consentGiven: e.target.checked })} style={{ accentColor: "var(--blue)", width: "16px", height: "16px" }} />
          <span className="text-xs" style={{ color: "var(--canvas-text-2)" }}>
            Client has consented to this session being recorded and/or transcribed
          </span>
        </label>
        <button onClick={createSession} disabled={creating} className="btn-primary text-sm">
          {creating ? "Saving…" : "Add session"}
        </button>
      </div>

      {/* Session list */}
      {loading ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
      : sessions.length === 0 ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>No sessions recorded yet.</p>
      : sessions.map((s) => {
        const summary = parseSummary(s.summaryJson);
        const isExpanded = expanded === s.id;
        return (
          <div key={s.id} className="mb-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
            {/* Header row */}
            <button
              type="button"
              className="w-full flex items-center justify-between gap-4 px-5 py-3 text-left"
              style={{ background: "var(--canvas-2)", cursor: "pointer", border: "none" }}
              onClick={() => { setExpanded(isExpanded ? null : s.id); if (!isExpanded) { setTranscript(null); } }}
            >
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>
                  {SESSION_TYPES.find((t) => t.value === s.sessionType)?.label ?? s.sessionType}
                  {s.sessionNumber ? ` #${s.sessionNumber}` : ""}
                  <span className="ml-2 font-normal" style={{ color: "var(--canvas-text-3)" }}>
                    {new Date(s.sessionDate).toLocaleDateString()}
                  </span>
                </p>
                <div className="flex gap-2 mt-0.5 flex-wrap">
                  {s.consentGiven && <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: "rgba(22,163,74,0.08)", color: "#16A34A", letterSpacing: "0.06em" }}>CONSENT ✓</span>}
                  {s.summaryJson && <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: "var(--blue-subtle-lt)", color: "var(--blue)", letterSpacing: "0.06em" }}>SUMMARISED · {s.summarySource}</span>}
                  {s.shareRecap && <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: "rgba(22,163,74,0.08)", color: "#16A34A", letterSpacing: "0.06em" }}>RECAP SHARED</span>}
                </div>
              </div>
              <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: "var(--canvas-text-3)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="p-5 space-y-4" style={{ background: "var(--canvas-1)" }}>
                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => summarize(s)} disabled={summarizing === s.id || !s.summaryJson && false} className="btn-secondary text-xs py-1.5 px-3">
                    {summarizing === s.id ? "Summarising…" : s.summaryJson ? "Re-summarise" : "Summarise"}
                  </button>
                  <button onClick={() => toggleShare(s)} className="btn-secondary text-xs py-1.5 px-3">
                    {s.shareRecap ? "Unshare recap" : "Share recap with client"}
                  </button>
                  {s.recordingUrl && (
                    <a href={s.recordingUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs py-1.5 px-3">▶ Recording</a>
                  )}
                  <button onClick={() => { loadTranscript(s.id); }} className="btn-ghost text-xs py-1.5 px-3">Show transcript</button>
                </div>

                {/* Recap text */}
                {s.recapText && (
                  <div className="rounded-lg p-3" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
                    <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>CLIENT RECAP{s.shareRecap ? " · SHARED" : " · NOT SHARED"}</p>
                    <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>{s.recapText}</p>
                  </div>
                )}

                {/* Summary */}
                {summary && (
                  <div className="space-y-3">
                    {[
                      ["Decisions", summary.decisions],
                      ["Action items (Shea)", summary.actionItems.filter((a) => a.owner === "Shea").map((a) => a.item)],
                      ["Action items (Client)", summary.actionItems.filter((a) => a.owner === "Client").map((a) => a.item)],
                      ["Workflows built/changed", summary.workflowsBuiltOrChanged],
                      ["Open questions", summary.openQuestions],
                      ["Risks", summary.risks],
                      ["Next session agenda", summary.nextSessionAgenda],
                    ].map(([label, items]) => (items as string[]).length > 0 ? (
                      <div key={label as string}>
                        <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>{(label as string).toUpperCase()}</p>
                        <ul className="space-y-0.5">
                          {(items as string[]).map((item, i) => (
                            <li key={i} className="flex gap-2 text-xs" style={{ color: "var(--canvas-text-2)" }}>
                              <span style={{ color: "var(--blue)" }}>›</span>{item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null)}
                  </div>
                )}

                {/* Transcript (loaded on demand) */}
                {transcript !== null && (
                  <div>
                    <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>TRANSCRIPT (ADMIN ONLY)</p>
                    <pre className="text-xs rounded-lg p-3 overflow-auto max-h-64" style={{ background: "var(--canvas-2)", color: "var(--canvas-text-2)", border: "1px solid var(--canvas-border)", whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)" }}>
                      {transcript}
                    </pre>
                  </div>
                )}

                {/* Admin notes */}
                {s.adminNotes && (
                  <div>
                    <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>ADMIN NOTES</p>
                    <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>{s.adminNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
