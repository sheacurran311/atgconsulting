/**
 * AccessLogPanel — Admin-only panel for managing a DFY client's account access log.
 * Stores NO credentials or tokens — only metadata (account system, access type, dates).
 * Security note displayed prominently per product boundary rule.
 */
import { useState, useEffect } from "react";
import { accessLogApi, type ClientAccessLogEntry } from "@/lib/api";

interface Props { clientId: string; tier: string }

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const EMPTY: Omit<ClientAccessLogEntry, "id" | "clientId" | "createdAt" | "updatedAt"> = {
  accountSystem: "",
  accessType: "",
  grantedDate: new Date().toISOString().split("T")[0]!,
  revokedDate: null,
  notes: "",
};

export default function AccessLogPanel({ clientId, tier }: Props) {
  const [entries, setEntries] = useState<ClientAccessLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    accessLogApi.list(clientId)
      .then(setEntries)
      .catch(() => null)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [clientId]);

  async function create() {
    if (!form.accountSystem.trim() || !form.accessType.trim()) {
      setError("Account system and access type are required.");
      return;
    }
    setSaving(true);
    setError(null);
    await accessLogApi.create(clientId, form).catch((e: Error) => setError(e.message));
    setForm({ ...EMPTY });
    setSaving(false);
    load();
  }

  async function save(id: string) {
    setSaving(true);
    await accessLogApi.update(clientId, id, editForm).catch((e: Error) => setError(e.message));
    setEditingId(null);
    setSaving(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this access log entry?")) return;
    await accessLogApi.remove(clientId, id).catch(() => null);
    load();
  }

  if (tier !== "WHITE_GLOVE") {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
        <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
          Access log is only available for Done-for-you (WHITE_GLOVE) clients.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Security notice */}
      <div className="rounded-xl p-4" style={{ background: "rgba(59,107,255,0.06)", border: "1px solid rgba(59,107,255,0.2)" }}>
        <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>SECURITY NOTICE</p>
        <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
          This log stores <strong>no credentials, passwords, or tokens</strong> — only metadata (account name, access type, dates, notes).
          All actual access is granted through the client's own admin console or team invite.
          Never enter a password or token in the notes field.
        </p>
      </div>

      {/* Existing entries */}
      {loading ? (
        <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>No access log entries yet. Add one below when access is granted.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl p-4" style={{
              border: "1px solid var(--canvas-border)",
              background: e.revokedDate ? "var(--canvas-2)" : "var(--canvas-1)",
              opacity: e.revokedDate ? 0.7 : 1,
            }}>
              {editingId === e.id ? (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>ACCOUNT / SYSTEM</label>
                      <input className="field-input text-sm w-full" value={editForm.accountSystem} onChange={(e) => setEditForm((f) => ({ ...f, accountSystem: e.target.value }))} maxLength={200} />
                    </div>
                    <div>
                      <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>ACCESS TYPE</label>
                      <input className="field-input text-sm w-full" value={editForm.accessType} onChange={(e) => setEditForm((f) => ({ ...f, accessType: e.target.value }))} maxLength={200} />
                    </div>
                    <div>
                      <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>GRANTED DATE</label>
                      <input type="date" className="field-input text-sm w-full" value={editForm.grantedDate.split("T")[0]} onChange={(e) => setEditForm((f) => ({ ...f, grantedDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>REVOKED DATE (leave blank if active)</label>
                      <input type="date" className="field-input text-sm w-full" value={editForm.revokedDate?.split("T")[0] ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, revokedDate: e.target.value || null }))} />
                    </div>
                  </div>
                  <div>
                    <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>NOTES (no passwords or tokens)</label>
                    <textarea className="field-input text-sm w-full" rows={2} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} maxLength={1000} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => save(e.id)} disabled={saving} className="btn-primary text-sm" style={{ padding: "6px 14px" }}>{saving ? "Saving…" : "Save"}</button>
                    <button type="button" onClick={() => setEditingId(null)} className="btn-ghost text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{e.accountSystem}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--canvas-text-2)" }}>{e.accessType}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {e.revokedDate ? (
                        <span className="font-mono text-2xs px-2 py-0.5 rounded" style={{ background: "var(--canvas-2)", color: "var(--canvas-text-3)" }}>REVOKED {fmt(e.revokedDate)}</span>
                      ) : (
                        <span className="font-mono text-2xs px-2 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.08)", color: "#16A34A" }}>ACTIVE</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--canvas-text-3)" }}>
                    Granted: {fmt(e.grantedDate)}
                    {e.notes ? ` · ${e.notes}` : ""}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => { setEditingId(e.id); setEditForm({ accountSystem: e.accountSystem, accessType: e.accessType, grantedDate: e.grantedDate, revokedDate: e.revokedDate, notes: e.notes }); }}
                      className="text-xs underline"
                      style={{ color: "var(--blue)" }}
                    >Edit</button>
                    {!e.revokedDate && (
                      <button
                        type="button"
                        onClick={() => accessLogApi.update(clientId, e.id, { revokedDate: new Date().toISOString().split("T")[0] }).then(load).catch(() => null)}
                        className="text-xs underline"
                        style={{ color: "#D97706" }}
                      >Mark revoked (today)</button>
                    )}
                    <button type="button" onClick={() => remove(e.id)} className="text-xs underline" style={{ color: "#DC2626" }}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new entry */}
      <div className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
        <p className="font-mono text-2xs mb-3" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>LOG NEW ACCESS GRANT</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>ACCOUNT / SYSTEM *</label>
            <input className="field-input text-sm w-full" value={form.accountSystem} onChange={(e) => setForm((f) => ({ ...f, accountSystem: e.target.value }))} placeholder="e.g. Google Workspace" maxLength={200} />
          </div>
          <div>
            <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>ACCESS TYPE *</label>
            <input className="field-input text-sm w-full" value={form.accessType} onChange={(e) => setForm((f) => ({ ...f, accessType: e.target.value }))} placeholder="e.g. Invited admin user" maxLength={200} />
          </div>
          <div>
            <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>GRANTED DATE *</label>
            <input type="date" className="field-input text-sm w-full" value={form.grantedDate} onChange={(e) => setForm((f) => ({ ...f, grantedDate: e.target.value }))} />
          </div>
        </div>
        <div className="mb-3">
          <label className="font-mono text-2xs block mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>NOTES (no passwords or tokens)</label>
          <textarea className="field-input text-sm w-full" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. Invited via Google Workspace admin console. 2FA enabled on Shea's Google account." maxLength={1000} />
        </div>
        {error && <p className="text-xs mb-2" style={{ color: "#DC2626" }}>{error}</p>}
        <button type="button" onClick={create} disabled={saving} className="btn-primary text-sm" style={{ padding: "7px 14px" }}>
          {saving ? "Adding…" : "Log access grant"}
        </button>
      </div>
    </div>
  );
}
