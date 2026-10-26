/**
 * Run history — shows recent workflow runs for the signed-in client.
 * Recent workflow runs for the signed-in client.
 */
import { useState, useEffect } from "react";
import { skills2Api } from "@/lib/api";

interface RunRecord {
  id: string; runAt: string; summary: string | null;
  outputCount: number; status: string;
  workflow: { name: string };
  output: { id: string; type: string; subject: string; status: string; createdAt: string } | null;
}

const OUTPUT_STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending review", color: "var(--blue)" },
  approved:  { label: "Approved",       color: "#16A34A" },
  edited:    { label: "Edited",         color: "#16A34A" },
  dismissed: { label: "Dismissed",      color: "var(--canvas-text-3)" },
};

export default function RunHistory() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    skills2Api.runHistory(0, 30)
      .then((r) => setRuns(r as RunRecord[]))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>;
  if (runs.length === 0) return (
    <div className="rounded-xl p-6 text-center" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
      <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>NO RUNS YET</p>
      <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>Run a workflow from My workflows. Each run shows up here.</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const badge = OUTPUT_STATUS_BADGE[run.output?.status ?? ""] ?? null;
        return (
          <div key={run.id} className="flex items-start justify-between gap-3 rounded-lg px-4 py-3" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>
                {run.workflow.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--canvas-text-2)" }}>
                {run.output?.subject ?? run.summary ?? "Run completed"}
              </p>
              {badge && (
                <span className="font-mono text-2xs" style={{ color: badge.color, letterSpacing: "0.04em" }}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="font-mono text-2xs flex-shrink-0" style={{ color: "var(--canvas-text-3)" }}>
              {new Date(run.runAt).toLocaleDateString()}
            </p>
          </div>
        );
      })}
    </div>
  );
}
