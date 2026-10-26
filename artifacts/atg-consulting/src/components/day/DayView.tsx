/**
 * Today: a full view of the work day, split into professional and personal.
 * Suggested blocks can be pinned on this day. Live mail and calendar are not connected.
 */
import { useEffect, useState } from "react";
import { api, type DayBlock, type DayPayload, type DeclaredAccount } from "@/lib/api";
import { DayForm, profileToAnswers } from "@/components/day/DaySetup";
import SkillRunner from "@/components/workbench/SkillRunner";
import { skillUnlocked } from "@/components/workbench/SkillLauncher";
import {
  ACCOUNT_KIND_LABELS,
  ACCOUNT_PROVIDER_LABELS,
  formatDayHeading,
  formatMinutes,
  formatWorkDays,
} from "@/lib/day";

const DRAFT_LABELS: Record<string, string> = {
  briefing: "Morning briefing",
  email_draft: "Email draft",
  lead_list: "Lead list",
  social_post: "Social post",
  quote_followup: "Quote follow-up",
  review_request: "Review request",
};

export default function DayView({ tier, testMode }: { tier: string; testMode: boolean }) {
  const [day, setDay] = useState<DayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [helpId, setHelpId] = useState<string | null>(null);
  const [explainId, setExplainId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.day.get()
      .then((payload) => { setDay(payload); setError(null); })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your day."))
      .finally(() => { setLoading(false); setBusyId(null); });
  }

  // On first mount: refresh suggestions (writes DayBlocks) then load. Subsequent
  // navigations just use GET (read-only). This avoids P2002 on concurrent GETs.
  useEffect(() => {
    setLoading(true);
    api.day.refresh()
      .then((payload) => { setDay(payload); setError(null); })
      .catch(() => {
        // Fallback to read-only GET if refresh fails
        api.day.get()
          .then((payload) => { setDay(payload); setError(null); })
          .catch((err) => setError(err instanceof Error ? err.message : "Could not load your day."));
      })
      .finally(() => { setLoading(false); setBusyId(null); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !day) return <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading your day…</p>;
  if (error && !day) return <p className="text-sm" role="alert" style={{ color: "#DC2626" }}>{error}</p>;
  if (!day) return null;

  if (!day.profile || editing) {
    return (
      <DayForm
        bizSize={day.bizSize}
        initial={day.profile ? profileToAnswers(day.profile) : null}
        onCancel={day.profile ? () => setEditing(false) : undefined}
        onSaved={() => { setEditing(false); load(); }}
      />
    );
  }

  const profile = day.profile;
  const heading = formatDayHeading(day.date, profile.timezone);

  async function act(id: string, action: "schedule" | "done" | "dismiss") {
    setBusyId(id);
    setActionError(null);
    try {
      await api.day.updateBlock(id, action);
      if (helpId === id) setHelpId(null);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update that block.");
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
            {profile.scope === "team" ? "TEAM DAY" : "YOUR DAY"}
          </p>
          <h2 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em" }}>{heading}</h2>
          <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>
            {formatMinutes(profile.startMin)}–{formatMinutes(profile.endMin)} · {formatWorkDays(profile.workDays)}
          </p>
          {profile.scope === "team" && profile.teamNote && (
            <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>{profile.teamNote}</p>
          )}
          {!day.isWorkDay && (
            <p className="text-sm mt-2" style={{ color: "var(--canvas-text-2)" }}>
              Today is outside the days you usually work. Personal items are still here.
            </p>
          )}
        </div>
        <button type="button" onClick={() => setEditing(true)} className="btn-secondary text-sm flex-shrink-0" style={{ padding: "8px 12px" }}>
          Edit my day
        </button>
      </div>

      <p className="text-xs mb-4" style={{ color: "var(--canvas-text-3)" }}>
        Suggestions help you plan your day. When you're ready, install a workflow routine in your AI platform to run on a schedule.
      </p>

      {actionError && <p className="text-sm mb-3" role="alert" style={{ color: "#DC2626" }}>{actionError}</p>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <div className="space-y-3">
          {day.blocks.length === 0 ? (
            <div className="rounded-xl p-6" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
              <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
                Nothing is suggested for this day. Add an account, or edit the day to include the work you actually do.
              </p>
            </div>
          ) : day.blocks.map((block) => (
            <div key={block.id} className="space-y-2">
              <BlockCard
                block={block}
                busy={busyId === block.id}
                open={explainId === block.id}
                onAct={act}
                onHelp={() => {
                  if (block.skillSlug && skillUnlocked(block.skillSlug, tier, testMode)) {
                    setExplainId(null);
                    setHelpId(block.id);
                  } else {
                    setHelpId(null);
                    setExplainId(explainId === block.id ? null : block.id);
                  }
                }}
              />
              {helpId === block.id && block.skillSlug && (
                <SkillRunner
                  skill={block.skillSlug}
                  onClose={() => setHelpId(null)}
                  onOutput={() => { setHelpId(null); load(); }}
                />
              )}
            </div>
          ))}
        </div>

        <aside className="space-y-4">
          <AccountRail
            accounts={day.accounts}
            onChanged={() => load()}
          />
          <ReminderRail day={day} onChanged={() => load()} />
        </aside>
      </div>
    </div>
  );
}

function BlockCard({
  block,
  busy,
  open,
  onAct,
  onHelp,
}: {
  block: DayBlock;
  busy: boolean;
  open: boolean;
  onAct: (id: string, action: "schedule" | "done" | "dismiss") => void;
  onHelp: () => void;
}) {
  const done = block.status === "done";
  const scheduled = block.status === "scheduled";
  return (
    <article
      className="rounded-xl p-4"
      style={{
        border: "1px solid var(--canvas-border)",
        background: done ? "var(--canvas-2)" : "var(--canvas-1)",
        opacity: done ? 0.72 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>
          {block.skillSlug ? "WORKFLOW ROUTINE" : `${formatMinutes(block.startMin)}–${formatMinutes(block.endMin)}`}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xs" style={{ color: block.realm === "personal" ? "#7C3AED" : "var(--blue)", letterSpacing: "0.06em" }}>
            {block.realm === "personal" ? "PERSONAL" : "PROFESSIONAL"}
          </span>
          <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>
            {done ? "DONE" : scheduled ? "SETTING UP" : "SUGGESTED"}
          </span>
        </div>
      </div>
      <h3 className="font-semibold text-sm" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>{block.title}</h3>
      <p className="text-xs mt-1" style={{ color: "var(--canvas-text-2)" }}>{block.efficiency}</p>
      {open && (
        <p className="text-sm mt-2" style={{ color: "var(--canvas-text)" }}>{block.detail}</p>
      )}
      {!done && (
        <div className="flex flex-wrap gap-2 mt-3">
          {!scheduled && (
            <button type="button" disabled={busy} onClick={() => onAct(block.id, "schedule")} className="btn-secondary text-sm" style={{ padding: "6px 12px" }}>
              Set up this routine
            </button>
          )}
          {scheduled && (
            <button type="button" disabled={busy} onClick={() => onAct(block.id, "done")} className="btn-primary text-sm" style={{ padding: "6px 12px" }}>
              Mark done
            </button>
          )}
          <button type="button" onClick={onHelp} className="btn-ghost text-sm" style={{ padding: "6px 12px" }}>
            How to install
          </button>
          <button type="button" disabled={busy} onClick={() => onAct(block.id, "dismiss")} className="btn-ghost text-sm">
            Skip
          </button>
        </div>
      )}
    </article>
  );
}

function AccountRail({ accounts, onChanged }: { accounts: DeclaredAccount[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [realm, setRealm] = useState<"professional" | "personal">("professional");
  const [kind, setKind] = useState<"email" | "calendar" | "other">("email");
  const [provider, setProvider] = useState<"gmail" | "outlook" | "apple" | "other">("gmail");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!label.trim()) { setError("Name the account."); return; }
    setSaving(true);
    setError(null);
    try {
      await api.day.addAccount({ realm, kind, provider, label: label.trim() });
      setLabel("");
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that account.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await api.day.removeAccount(id).catch(() => null);
    onChanged();
  }

  const groups = [
    { id: "professional", label: "Professional" },
    { id: "personal", label: "Personal" },
  ] as const;

  return (
    <section className="rounded-xl p-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>YOUR ASSISTANT'S CONNECTIONS</p>
      <p className="text-xs mb-3" style={{ color: "var(--canvas-text-3)" }}>
        Tell your AI platform (Grok Bot, Claude, etc.) which accounts to connect. ATG never accesses these directly.
      </p>
      {groups.map((group) => {
        const rows = accounts.filter((account) => account.realm === group.id);
        return (
          <div key={group.id} className="mb-3">
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>{group.label.toUpperCase()}</p>
            {rows.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>None yet</p>
            ) : rows.map((account) => (
              <div key={account.id} className="flex items-start justify-between gap-2 py-1.5">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--canvas-text)" }}>{account.label}</p>
                  <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
                    {ACCOUNT_PROVIDER_LABELS[account.provider] ?? account.provider} · {ACCOUNT_KIND_LABELS[account.kind] ?? account.kind}
                    <span className="ml-1 px-1 py-0.5 rounded text-2xs font-mono" style={{ background: "rgba(59,107,255,0.08)", color: "var(--blue)" }}>Add to your AI platform</span>
                  </p>
                </div>
                <button type="button" onClick={() => remove(account.id)} className="text-xs underline" style={{ color: "var(--canvas-text-3)" }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        );
      })}
      {open ? (
        <div className="space-y-2 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <select className="field-input text-xs" value={realm} onChange={(e) => setRealm(e.target.value as typeof realm)}>
              <option value="professional">Professional</option>
              <option value="personal">Personal</option>
            </select>
            <select className="field-input text-xs" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="email">Email</option>
              <option value="calendar">Calendar</option>
              <option value="other">Other</option>
            </select>
          </div>
          <select className="field-input text-xs" value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)}>
            <option value="gmail">Gmail</option>
            <option value="outlook">Outlook</option>
            <option value="apple">Apple</option>
            <option value="other">Other</option>
          </select>
          <input className="field-input text-sm" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Work Gmail" maxLength={80} />
          {error && <p className="text-xs" style={{ color: "#DC2626" }}>{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={add} disabled={saving} className="btn-primary text-xs" style={{ padding: "6px 10px" }}>{saving ? "Adding…" : "Add account"}</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold underline" style={{ color: "var(--blue)" }}>
          Add an account
        </button>
      )}
    </section>
  );
}

function ReminderRail({ day, onChanged }: { day: DayPayload; onChanged: () => void }) {
  const [drafts, setDrafts] = useState(day.reminders.drafts);
  const [copied, setCopied] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  useEffect(() => { setDrafts(day.reminders.drafts); }, [day]);

  async function approveDraft(id: string) {
    try {
      const updated = await api.workbench.reviewOutput(id, "approve");
      setDrafts((prev) => prev.map((item) => item.id === id ? { ...item, status: updated.status } : item));
      onChanged();
    } catch { /* keep list */ }
  }

  async function saveDraftEdit(id: string) {
    try {
      const updated = await api.workbench.reviewOutput(id, "edit", editContent);
      setDrafts((prev) => prev.map((item) => item.id === id ? { ...item, content: editContent, status: updated.status } : item));
      setEditingId(null);
      onChanged();
    } catch { /* keep list */ }
  }

  async function dismissDraft(id: string) {
    try {
      await api.workbench.reviewOutput(id, "dismiss");
      setDrafts((prev) => prev.filter((item) => item.id !== id));
      onChanged();
    } catch { /* keep list */ }
  }

  async function copyToClipboard(id: string, subject: string | null, content: string) {
    const text = subject ? `${subject}\n\n${content}` : content;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((prev) => prev === id ? null : prev), 2000);
    } catch { setCopied(null); }
  }

  const { consultations, actionItems } = day.reminders;
  const quiet = consultations.length === 0 && actionItems.length === 0 && drafts.length === 0;

  return (
    <section className="rounded-xl p-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>WAITING ON YOU</p>
      {quiet && <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>Nothing due today.</p>}
      {consultations.map((item) => (
        <p key={item.id} className="text-sm mb-2" style={{ color: "var(--canvas-text)" }}>
          {item.title}
          <span className="block text-xs" style={{ color: "var(--canvas-text-3)" }}>Scheduled session · {item.durationMin} min</span>
        </p>
      ))}
      {actionItems.map((item) => (
        <p key={item.id} className="text-sm mb-2" style={{ color: "var(--canvas-text)" }}>{item.text}</p>
      ))}
      {drafts.map((draft) => {
        const approved = draft.status === "approved" || draft.status === "edited";
        const isEditing = editingId === draft.id;
        return (
          <div key={draft.id} className="mb-4 last:mb-0 pt-3" style={{ borderTop: "1px solid var(--canvas-border)" }}>
            <p className="font-mono text-2xs mb-0.5" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>
              {DRAFT_LABELS[draft.type] ?? draft.type}
              {approved && <span className="ml-2 text-green-600">✓ APPROVED</span>}
            </p>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--canvas-text)" }}>
              {draft.subject || draft.workflowName}
            </p>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  className="field-input text-xs w-full"
                  rows={6}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  style={{ fontFamily: "var(--font-mono)", resize: "vertical" }}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => saveDraftEdit(draft.id)} className="btn-primary text-xs" style={{ padding: "5px 10px" }}>Save edit</button>
                  <button type="button" onClick={() => setEditingId(null)} className="btn-ghost text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {!approved && (
                  <button type="button" onClick={() => approveDraft(draft.id)} className="text-xs font-semibold underline" style={{ color: "var(--blue)" }}>
                    Approve
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => copyToClipboard(draft.id, draft.subject, draft.content)}
                  className="text-xs font-semibold underline"
                  style={{ color: "var(--blue)" }}
                >
                  {copied === draft.id ? "Copied ✓" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingId(draft.id); setEditContent(draft.content); }}
                  className="text-xs underline"
                  style={{ color: "var(--canvas-text-2)" }}
                >
                  Edit
                </button>
                <button type="button" onClick={() => dismissDraft(draft.id)} className="text-xs underline" style={{ color: "var(--canvas-text-3)" }}>
                  Dismiss
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
