/**
 * UsageMeter — compact indicator of AI Assist token usage.
 * Shows used / cap with a colour-coded bar.
 */
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Usage { used: number; cap: number; month: string; enabled: boolean }

export default function UsageMeter() {
  const [u, setU] = useState<Usage | null>(null);

  useEffect(() => {
    api.aiAssist.usage().then(setU).catch(() => null);
  }, []);

  if (!u || !u.enabled) return null;

  const pct = u.cap > 0 ? Math.min((u.used / u.cap) * 100, 100) : 0;
  const color = pct < 60 ? "#16A34A" : pct < 85 ? "#D97706" : "#DC2626";

  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>
          AI ASSIST · {u.month}
        </p>
        <p className="font-mono text-2xs" style={{ color, letterSpacing: "0.04em" }}>
          {u.used.toLocaleString()} / {u.cap.toLocaleString()} tokens
        </p>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--canvas-border)" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", transition: "width 600ms" }} />
      </div>
    </div>
  );
}
