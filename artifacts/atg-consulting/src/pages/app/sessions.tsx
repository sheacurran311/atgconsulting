/**
 * /app/sessions — Client-facing session recaps.
 * Guided and Done-for-you clients only. Shows approved short recaps.
 * Full transcript is never shown to clients.
 */
import { useState, useEffect } from "react";
import AppShell from "@/components/app/AppShell";
import { api, type SessionRecord } from "@/lib/api";
import { useAccount } from "@/lib/useAccount";
import { hasOperator } from "@/lib/tiers";

const SESSION_LABELS: Record<string, string> = {
  discovery: "Discovery call",
  guided: "Guided session",
  dfy_checkin: "Check-in",
  other: "Session",
};

export default function SessionsPage() {
  const { account } = useAccount();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const tier = account?.tier ?? "NONE";
  const canView = hasOperator(tier);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    api.client.sessions?.()
      .then(setSessions)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [canView]);

  return (
    <AppShell>
      <div className="max-w-content mx-auto">
        <div className="mb-8">
          <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>SESSION RECAPS</p>
          <h1 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>Your sessions</h1>
          <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>
            Short recaps from your Guided and check-in sessions with Shea.
          </p>
        </div>

        {!canView ? (
          <div className="rounded-xl p-8 text-center" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
            <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>GUIDED &amp; DONE-FOR-YOU</p>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--canvas-text)" }}>Session recaps are available for Guided and Done-for-you clients.</p>
            <a href="/#tiers" className="btn-primary text-sm mt-4 inline-flex">View plans</a>
          </div>
        ) : loading ? (
          <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
            <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>NO RECAPS YET</p>
            <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
              Shea will share a short recap after each session.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((s) => (
              <div key={s.id} className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>
                      {SESSION_LABELS[s.sessionType] ?? s.sessionType}
                      {s.sessionNumber ? ` #${s.sessionNumber}` : ""}
                    </p>
                    <p className="font-mono text-2xs mt-0.5" style={{ color: "var(--canvas-text-3)" }}>
                      {new Date(s.sessionDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                  </div>
                  {s.recordingUrl && (
                    <a href={s.recordingUrl} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary text-xs py-1 px-2 flex-shrink-0">
                      ▶ Recording
                    </a>
                  )}
                </div>
                {s.recapText ? (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>{s.recapText}</p>
                ) : (
                  <p className="text-xs italic" style={{ color: "var(--canvas-text-3)" }}>Recap coming soon.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
