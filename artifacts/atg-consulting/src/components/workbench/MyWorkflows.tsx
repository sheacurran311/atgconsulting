/**
 * My Workflows — list with status, schedule, last run.
 */
import { useState, useEffect } from "react";
import { api, type WorkflowListItem as WFItem } from "@/lib/api";
import EmptyWorkbench from "@/components/workbench/EmptyWorkbench";
import SkillLauncher from "@/components/workbench/SkillLauncher";
import SkillRunner from "@/components/workbench/SkillRunner";

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  designing: { label: "Designing", color: "var(--canvas-text-3)", bg: "var(--canvas-2)" },
  building:  { label: "Building",  color: "var(--blue-btn)",      bg: "rgba(59,107,255,0.08)" },
  live:      { label: "Live",       color: "#16A34A",              bg: "rgba(22,163,74,0.08)" },
  paused:    { label: "Paused",     color: "var(--canvas-text-3)", bg: "var(--canvas-2)" },
};

const AREA_LABELS: Record<string, string> = { ea: "Admin & ops", marketing: "Marketing", sales: "Sales", cs: "Customer replies" };

export default function MyWorkflows({
  tier,
  testMode,
  personalizedSlugs,
}: {
  tier: string;
  testMode: boolean;
  personalizedSlugs: string[];
}) {
  const [workflows, setWorkflows] = useState<WFItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);

  useEffect(() => {
    api.workbench.workflows().then(setWorkflows).catch(() => null).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>WORKBENCH</p>
          <h2 className="font-extrabold text-xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>My workflows</h2>
        </div>
      </div>

      <SkillLauncher
        clientTier={tier}
        testMode={testMode}
        personalizedSlugs={personalizedSlugs}
        activeSkill={activeSkill}
        onSelectSkill={setActiveSkill}
      />
      {activeSkill && (
        <div className="mb-6">
          <SkillRunner skill={activeSkill} onClose={() => setActiveSkill(null)} onOutput={() => setActiveSkill(null)} />
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
      ) : workflows.length === 0 ? (
        <EmptyWorkbench tier={tier} message="Workflows Shea sets up for you show up here. You can run one from the buttons above." />
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => {
            const st = STATUS_STYLES[wf.status] ?? STATUS_STYLES.designing!;
            return (
              <div key={wf.id} className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>{wf.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--canvas-text-2)" }}>{wf.description}</p>
                  </div>
                  <span className="font-mono text-2xs px-2 py-0.5 rounded flex-shrink-0" style={{ background: st.bg, color: st.color, letterSpacing: "0.06em" }}>
                    {st.label.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <span className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>{AREA_LABELS[wf.area] ?? wf.area}</span>
                  {wf.schedule && <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>↻ {wf.schedule}</span>}
                  {(wf.lastRun || wf.runs[0]?.runAt) && (
                    <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>
                      Last run {new Date(wf.lastRun || wf.runs[0]!.runAt).toLocaleDateString()}
                    </span>
                  )}
                  {wf.setupNote && <span className="font-mono text-2xs ml-auto" style={{ color: "var(--canvas-text-3)" }}>{wf.setupNote}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
