/**
 * Done-for-you application status.
 * Applying does not change the client's tier. Shea accepts that in admin.
 */
import { useEffect, useState } from "react";
import { api, type DfyApplication } from "@/lib/api";

const STATUS_COPY: Record<string, string> = {
  applied: "Application received. Shea has not accepted it yet.",
  waitlisted: "You are on the waitlist. Shea has not accepted it yet.",
  accepted: "Shea accepted this application.",
  declined: "Shea declined this application.",
};

export default function DfyApplyCard({ visible }: { visible: boolean }) {
  const [app, setApp] = useState<DfyApplication | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    api.dfy.status().then(setApp).catch(() => setApp(null));
  }, [visible]);

  if (!visible) return null;
  if (app === undefined) return <p className="text-sm mb-6" style={{ color: "var(--canvas-text-3)" }}>Loading Done-for-you status…</p>;

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const next = await api.dfy.apply();
      setApp(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the application.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl p-5 mb-6" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>DONE-FOR-YOU</p>
      {!app ? (
        <>
          <p className="text-sm mb-3" style={{ color: "var(--canvas-text-2)" }}>No application yet. Applying does not change your plan until Shea accepts it.</p>
          {error && <p className="text-sm mb-2" style={{ color: "#B91C1C" }}>{error}</p>}
          <button type="button" onClick={() => { void apply(); }} disabled={busy} className="btn-primary text-sm" style={{ padding: "8px 14px" }}>
            {busy ? "Submitting…" : "Apply for Done-for-you"}
          </button>
        </>
      ) : (
        <>
          <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{app.status}</p>
          <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>{STATUS_COPY[app.status] ?? "Application on file."}</p>
        </>
      )}
    </div>
  );
}
