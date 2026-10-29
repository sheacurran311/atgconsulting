/**
 * ImpersonationBanner — shown across the portal when admin is viewing as a client.
 * Shows client name, tier, exit button, and allow-edits toggle.
 * Blocks the viewport top; the rest of the portal scrolls below it.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

interface BannerState {
  active: boolean;
  clientName: string;
  clientTier: string;
  allowEdits: boolean;
  expiresAt: string;
}

const TIER_LABELS: Record<string, string> = {
  NONE: "No plan", SELF_SERVE: "Self-serve", GUIDED: "Guided", WHITE_GLOVE: "Done-for-you",
};

export default function ImpersonationBanner() {
  const [state, setState] = useState<BannerState | null>(null);
  const [togglingEdits, setTogglingEdits] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch("/api/admin/impersonate/status", { credentials: "include" })
      .then((r) => r.json() as Promise<BannerState & { active?: boolean }>)
      .then((d) => { if (d.active) setState(d as BannerState); })
      .catch(() => null);
  }, []);

  if (!state?.active) return null;

  async function exit() {
    setExiting(true);
    await fetch("/api/admin/impersonate", { method: "DELETE", credentials: "include" });
    window.location.href = "/admin/clients";
  }

  async function toggleEdits() {
    const next = !state!.allowEdits;
    if (next && !confirm("Allow edits while viewing as this client? All edits will be audit-logged.")) return;
    setTogglingEdits(true);
    await fetch("/api/admin/impersonate", {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowEdits: next }),
    });
    setState((s) => s ? { ...s, allowEdits: next } : s);
    setTogglingEdits(false);
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 text-sm flex-wrap"
      style={{
        background: state.allowEdits ? "rgba(220,38,38,0.9)" : "rgba(37,87,232,0.92)",
        backdropFilter: "blur(8px)",
        color: "#fff",
        position: "sticky", top: 0, zIndex: 100,
        borderBottom: `2px solid ${state.allowEdits ? "rgba(220,38,38,0.5)" : "rgba(59,107,255,0.4)"}`,
      }}
    >
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", opacity: 0.8 }}>
        ADMIN VIEW
      </span>
      <span className="font-semibold">
        Viewing as {state.clientName}
      </span>
      <span className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>
        {TIER_LABELS[state.clientTier] ?? state.clientTier}
      </span>

      {state.allowEdits && (
        <span className="text-xs font-bold" style={{ color: "#fed7aa" }}>⚠ EDITS ALLOWED</span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={toggleEdits}
          disabled={togglingEdits}
          className="text-xs font-medium px-2.5 py-1 rounded"
          style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", cursor: "pointer" }}
        >
          {togglingEdits ? "…" : state.allowEdits ? "Disable edits" : "Allow edits"}
        </button>
        <button
          type="button"
          onClick={exit}
          disabled={exiting}
          className="text-xs font-semibold px-2.5 py-1 rounded"
          style={{ background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", cursor: "pointer" }}
        >
          {exiting ? "Exiting…" : "Exit to admin →"}
        </button>
      </div>
    </div>
  );
}
