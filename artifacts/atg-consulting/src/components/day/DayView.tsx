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

  useEffect(() => { load(); }, []);

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
        Suggestions stay on this day until you add them. Nothing is written to a real calendar yet.
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
          {formatMinutes(block.startMin)}–{formatMinutes(block.endMin)}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xs" style={{ color: block.realm === "personal" ? "#7C3AED" : "var(--blue)", letterSpacing: "0.06em" }}>
            {block.realm === "personal" ? "PERSONAL" : "PROFESSIONAL"}
          </span>
          <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>
            {done ? "DONE" : scheduled ? "ON YOUR DAY" : "SUGGESTED"}
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
            <button type="button" disabled={busy} onClick={() => onAct(block.id, "schedule")} className="btn-primary text-sm" style={{ padding: "6px 12px" }}>
              Add to my day
            </button>
          )}
          {scheduled && (
            <button type="button" disabled={busy} onClick={() => onAct(block.id, "done")} className="btn-primary text-sm" style={{ padding: "6px 12px" }}>
              Done
            </button>
          )}
          <button type="button" onClick={onHelp} className="btn-secondary text-sm" style={{ padding: "6px 12px" }}>
            Help
          </button>
          <button type="button" disabled={busy} onClick={() => onAct(block.id, "dismiss")} className="btn-ghost text-sm">
            Not today
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
      <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>ACCOUNTS</p>
      <p className="text-xs mb-3" style={{ color: "var(--canvas-text-3)" }}>
        Work and personal stay apart. These are not connected yet.
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
                    {ACCOUNT_PROVIDER_LABELS[account.provider] ?? account.provider} · {ACCOUNT_KIND_LABELS[account.kind] ?? account.kind} · Not connected yet
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
  useEffect(() => { setDrafts(day.reminders.drafts); }, [day]);

  async function review(id: string, action: "approve" | "dismiss") {
    try {
      const updated = await api.workbench.reviewOutput(id, action);
      if (action === "dismiss") setDrafts((prev) => prev.filter((item) => item.id !== id));
      else setDrafts((prev) => prev.map((item) => item.id === id ? { ...item, ...updated, status: updated.status } : item));
      onChanged();
    } catch {
      /* keep the list as it was */
    }
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
    } catch {
      setCopied(null);
    }
  }

  const { consultations, actionItems } = day.reminders;
  const quiet = consultations.length === 0 && actionItems.length === 0 && drafts.length === 0;

  return (
    <section className="rounded-xl p-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>REMINDERS</p>
      {quiet && <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>Nothing else is due today.</p>}
      {consultations.map((item) => (
        <p key={item.id} className="text-sm mb-2" style={{ color: "var(--canvas-text)" }}>
          {item.title}
          <span className="block text-xs" style={{ color: "var(--canvas-text-3)" }}>{item.durationMin} min on your calendar</span>
        </p>
      ))}
      {actionItems.map((item) => (
        <p key={item.id} className="text-sm mb-2" style={{ color: "var(--canvas-text)" }}>{item.text}</p>
      ))}
      {drafts.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--canvas-border)" }}>
          <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>WAITING ON YOU</p>
          {drafts.map((draft) => {
            const ready = draft.status === "approved" || draft.status === "edited";
            return (
              <div key={draft.id} className="mb-3">
                <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>{DRAFT_LABELS[draft.type] ?? draft.type}</p>
                <p className="text-sm font-medium" style={{ color: "var(--canvas-text)" }}>{draft.subject || draft.workflowName}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {!ready && (
                    <button type="button" onClick={() => review(draft.id, "approve")} className="text-xs font-semibold underline" style={{ color: "var(--blue)" }}>Approve</button>
                  )}
                  {ready && (
                    <button type="button" onClick={() => copy(draft.id, `${draft.subject}\n\n${draft.content}`)} className="text-xs font-semibold underline" style={{ color: "var(--blue)" }}>
                      {copied === draft.id ? "Copied" : "Copy"}
                    </button>
                  )}
                  <button type="button" onClick={() => review(draft.id, "dismiss")} className="text-xs underline" style={{ color: "var(--canvas-text-3)" }}>Dismiss</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
