/**
 * Save work hours and a typical day. Account uses this on its own.
 * The dashboard passes a seed so it does not fetch twice.
 */
import { useEffect, useState } from "react";
import { api, type DayProfile } from "@/lib/api";
import { DayFields } from "@/components/day/DayFields";
import {
  dayAnswersError,
  defaultDayAnswers,
  formatMinutes,
  formatWorkDays,
  isDayBlockKey,
  type DayAnswers,
} from "@/lib/day";

export function profileToAnswers(profile: DayProfile): DayAnswers {
  return {
    timezone: profile.timezone,
    workDays: profile.workDays,
    startMin: profile.startMin,
    endMin: profile.endMin,
    typicalDay: profile.typicalDay.filter(isDayBlockKey),
    typicalNote: profile.typicalNote ?? "",
    dayScope: profile.scope,
    teamNote: profile.teamNote ?? "",
  };
}

export function DayForm({
  bizSize,
  initial,
  onSaved,
  onCancel,
}: {
  bizSize: string | null;
  initial: DayAnswers | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState<DayAnswers>(initial ?? defaultDayAnswers());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const problem = dayAnswersError(value, bizSize);
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError(null);
    try {
      await api.day.saveProfile({
        timezone: value.timezone,
        workDays: value.workDays,
        startMin: value.startMin,
        endMin: value.endMin,
        typicalDay: value.typicalDay,
        typicalNote: value.typicalNote.trim() || undefined,
        dayScope: bizSize === "2-10" ? value.dayScope : "individual",
        teamNote: bizSize === "2-10" && value.dayScope === "team" ? value.teamNote.trim() || undefined : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your day.");
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>YOUR DAY</p>
      <h2 className="font-extrabold text-xl mb-1" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>
        When do you work?
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--canvas-text-2)" }}>
        {bizSize === "solo"
          ? "This becomes your day on the dashboard."
          : bizSize === "2-10"
            ? "A small team can use one shared day, or just yours."
            : "This is your own work window. The dashboard plans around it."}
      </p>
      <DayFields value={value} bizSize={bizSize} onChange={setValue} />
      {error && (
        <p className="text-sm mt-4" role="alert" style={{ color: "#DC2626" }}>{error}</p>
      )}
      <div className="flex gap-3 mt-5">
        <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm" style={{ padding: "8px 14px" }}>
          {saving ? "Saving…" : "Save my day"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
        )}
      </div>
    </div>
  );
}

export default function DaySetup() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bizSize, setBizSize] = useState<string | null>(null);
  const [profile, setProfile] = useState<DayProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.day.get()
      .then((day) => {
        setBizSize(day.bizSize);
        setProfile(day.profile);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your day."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>;
  if (error) return <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>;
  if (!profile || editing) {
    return (
      <DayForm
        bizSize={bizSize}
        initial={profile ? profileToAnswers(profile) : null}
        onCancel={profile ? () => setEditing(false) : undefined}
        onSaved={() => { setEditing(false); load(); }}
      />
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--canvas-text)" }}>
          {profile.scope === "team" ? "Team day" : "Your day"} · {formatWorkDays(profile.workDays)}
        </p>
        <p className="text-sm mt-0.5" style={{ color: "var(--canvas-text-2)" }}>
          {formatMinutes(profile.startMin)}–{formatMinutes(profile.endMin)} · {profile.timezone.replace("_", " ")}
        </p>
        {profile.teamNote && (
          <p className="text-xs mt-1" style={{ color: "var(--canvas-text-3)" }}>{profile.teamNote}</p>
        )}
      </div>
      <button type="button" onClick={() => setEditing(true)} className="btn-secondary text-sm" style={{ padding: "8px 12px" }}>
        Edit
      </button>
    </div>
  );
}
