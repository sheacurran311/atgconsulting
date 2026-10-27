/**
 * My Workflows — list with status, schedule, last run, and install tracking.
 * Install CTA is primary; "Try with sample" is secondary.
 */
import { useState, useEffect } from "react";
import { api, type WorkflowListItem as WFItem } from "@/lib/api";
import EmptyWorkbench from "@/components/workbench/EmptyWorkbench";
import SkillLauncher from "@/components/workbench/SkillLauncher";
import SkillRunner from "@/components/workbench/SkillRunner";
import InstallModal from "@/components/workbench/InstallModal";

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
  const [installSlug, setInstallSlug] = useState<string | null>(null);
  const [installStatus, setInstallStatus] = useState<Record<string, string>>({});
  const [verifyStatus, setVerifyStatus] = useState<Record<string, string>>({}); // slug → "marked"|"verified"

  useEffect(() => {
    api.workbench.workflows().then(setWorkflows).catch(() => null).finally(() => setLoading(false));
    api.install.status().then((items) => {
      const platformMap: Record<string, string> = {};
      const statusMap: Record<string, string> = {};
      items.forEach((i) => {
        if (i.installedPlatform) platformMap[i.slug] = i.installedPlatform;
        if (i.installStatus && i.installStatus !== "none") statusMap[i.slug] = i.installStatus;
      });
      setInstallStatus(platformMap);
      setVerifyStatus(statusMap);
    }).catch(() => null);
  }, []);

  const PLATFORM_LABELS: Record<string, string> = { grok_bot: "Grok Bot", claude: "Claude", chatgpt: "ChatGPT", other: "Other" };

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
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>{AREA_LABELS[wf.area] ?? wf.area}</span>
                  {wf.schedule && <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>↻ {wf.schedule}</span>}
                  {(wf.lastRun || wf.runs[0]?.runAt) && (
                    <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>
                      Last run {new Date(wf.lastRun || wf.runs[0]!.runAt).toLocaleDateString()}
                    </span>
                  )}
                  {(() => {
                    const slug = wf.name.toLowerCase().replace(/\s+/g, "-");
                    const platform = installStatus[slug];
                    const status = verifyStatus[slug];
                    if (!platform && !status) return null;
                    const isVerified = status === "verified";
                    return (
                      <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{
                        background: isVerified ? "rgba(34,197,94,0.08)" : "rgba(234,179,8,0.08)",
                        color: isVerified ? "#16A34A" : "#D97706",
                        letterSpacing: "0.06em",
                        border: `1px solid ${isVerified ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)"}`,
                      }}>
                        {isVerified ? "✓ VERIFIED" : "✓ MARKED"}{platform ? ` · ${PLATFORM_LABELS[platform] ?? platform}` : ""}
                      </span>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SkillLauncher install-first mode */}
      <div className="mt-6">
        <p className="font-mono text-2xs mb-3" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>READY-MADE WORKFLOWS — INSTALL IN YOUR AI PLATFORM</p>
        <SkillLauncher
          clientTier={tier}
          testMode={testMode}
          personalizedSlugs={personalizedSlugs}
          activeSkill={activeSkill}
          onSelectSkill={setActiveSkill}
          onInstall={(slug, name) => setInstallSlug(slug + "|" + name)}
          installStatus={verifyStatus}
        />
        {activeSkill && (
          <div className="mt-3">
            <SkillRunner skill={activeSkill} onClose={() => setActiveSkill(null)} onOutput={() => setActiveSkill(null)} />
          </div>
        )}
      </div>

      {installSlug && (() => {
        const [slug, ...rest] = installSlug.split("|");
        const name = rest.join("|");
        return (
          <InstallModal
            slug={slug!}
            name={name}
            onClose={() => setInstallSlug(null)}
            onMarkInstalled={(p) => {
              setInstallStatus((prev) => ({ ...prev, [slug!]: p }));
              setInstallSlug(null);
            }}
            onTrySample={() => { setInstallSlug(null); setActiveSkill(slug!); }}
          />
        );
      })()}
    </div>
  );
}
