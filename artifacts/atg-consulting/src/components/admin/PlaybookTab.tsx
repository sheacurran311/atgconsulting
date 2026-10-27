/**
 * Playbook tab — admin-only operator playbook for a client.
 * Generate, view, inline-edit, mark final, and view version history.
 * Print-friendly: a "Copy / Print" button copies the rendered Markdown.
 * Never shown to clients.
 */
import { useState, useEffect, useCallback } from "react";
import { api, type ClientPlaybook } from "@/lib/api";

// ── Types matching server PlaybookContent ─────────────────────────────────────

interface ToolEntry  { category: string; tool: string; why: string; costNote: string }
interface Workflow   { name: string; area: string; whyFirst: string; steps: string[] }
interface AgendaItem { duration: string; topic: string; questions: string[] }

interface AccessItem { accountSystem: string; accessType: string; reason: string }
interface AccountAccess {
  isDFY: true;
  accessChecklist: AccessItem[];
  accessAgreement: string[];
  buildWorkflow: string[];
  offboarding: string[];
}

interface InstallGuidePlatform {
  platform: string;
  platformLabel: string;
  readyMadeAlternative: { name: string; url: string; note: string } | null;
  routinePrompt: string;
  operatorKeySteps: string[];
  operatorNotes: string[];
  confirmationNote: string;
}

interface InstallGuideEntry {
  workflowSlug: string;
  workflowName: string;
  connectorsNeeded: string[];
  platforms: InstallGuidePlatform[];
  dfyBuildNotes?: string[];
}

interface PlaybookInstallGuides {
  applicableTier: string;
  preInstallChecklist: string[];
  entries: InstallGuideEntry[];
}

interface PlaybookContent {
  clientSummary: string;
  risksAndClarifications: string[];
  tierRationale: { recommendedTier: string; why: string; expectationsToSet: string[] };
  discoveryAgenda: AgendaItem[];
  toolStack: ToolEntry[];
  workflows: Workflow[];
  tierPlan: { selfServeNotes?: string; guidedSessionPlan?: string[]; dfyBuildPlan?: string[] };
  milestones: { day30: string; day60: string; day90: string; ongoingCadence: string };
  kpisAndUpsell: { kpis: string[]; upgradesTriggers: string[]; scopeCreepWatchOuts: string[] };
  accountAccess?: AccountAccess;
  installGuides?: PlaybookInstallGuides;
}

function parseContent(raw: string): PlaybookContent | null {
  try { return JSON.parse(raw) as PlaybookContent; } catch { return null; }
}

// ── Rendered playbook view ────────────────────────────────────────────────────

function PlaybookView({ content, pb }: { content: PlaybookContent; pb: ClientPlaybook }) {
  const Section = ({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <p className="font-mono text-2xs font-bold" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>{title.toUpperCase()}</p>
        {badge && <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: "rgba(59,107,255,0.08)", color: "var(--blue)", letterSpacing: "0.05em" }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
  const BulletList = ({ items }: { items: string[] }) => (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--canvas-text-2)" }}>
          <span className="flex-shrink-0" style={{ color: "var(--blue)" }}>›</span>
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-0 text-sm" style={{ color: "var(--canvas-text)" }}>
      <div className="flex items-center gap-3 mb-6 p-3 rounded-lg" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
        <span className="font-mono text-2xs px-2 py-0.5 rounded" style={{ background: pb.source === "LLM" ? "rgba(59,107,255,0.1)" : "var(--canvas-border)", color: pb.source === "LLM" ? "var(--blue)" : "var(--canvas-text-3)", letterSpacing: "0.06em" }}>
          {pb.source}
        </span>
        <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>v{pb.version} · {pb.status.toUpperCase()} · {new Date(pb.createdAt).toLocaleDateString()}</span>
      </div>

      <Section title="Client summary">
        <p className="text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>{content.clientSummary}</p>
      </Section>

      <Section title="Risks and things to clarify">
        <BulletList items={content.risksAndClarifications} />
      </Section>

      <Section title={`Tier: ${content.tierRationale.recommendedTier}`}>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>{content.tierRationale.why}</p>
        <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>EXPECTATIONS TO SET IN WRITING</p>
        <BulletList items={content.tierRationale.expectationsToSet} />
      </Section>

      <Section title="Discovery call agenda">
        <div className="space-y-3">
          {content.discoveryAgenda.map((item, i) => (
            <div key={i} className="rounded-lg p-3" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-2xs font-bold" style={{ color: "var(--blue)" }}>{item.duration}</span>
                <span className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{item.topic}</span>
              </div>
              <ul className="space-y-1">
                {item.questions.map((q, qi) => (
                  <li key={qi} className="text-xs" style={{ color: "var(--canvas-text-2)" }}>→ {q}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Recommended tool stack">
        <div className="space-y-2">
          {content.toolStack.map((t) => (
            <div key={t.tool} className="rounded-lg p-3" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="font-mono text-2xs mr-2" style={{ color: "var(--canvas-text-3)" }}>{t.category}</span>
                  <span className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{t.tool}</span>
                </div>
              </div>
              <p className="text-xs mb-1" style={{ color: "var(--canvas-text-2)" }}>{t.why}</p>
              <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>💰 {t.costNote}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="First workflows">
        {content.workflows.map((wf) => (
          <div key={wf.name} className="mb-3 rounded-lg p-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
            <p className="font-semibold text-sm mb-1" style={{ color: "var(--canvas-text)" }}>{wf.name}</p>
            <p className="text-xs mb-2" style={{ color: "var(--canvas-text-2)" }}>{wf.whyFirst}</p>
            <ul className="space-y-1">
              {wf.steps.map((s, i) => <li key={i} className="text-xs" style={{ color: "var(--canvas-text-3)" }}>{i + 1}. {s}</li>)}
            </ul>
          </div>
        ))}
      </Section>

      {(content.tierPlan.selfServeNotes || content.tierPlan.guidedSessionPlan || content.tierPlan.dfyBuildPlan) && (
        <Section title="Tier execution plan">
          {content.tierPlan.selfServeNotes && <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>{content.tierPlan.selfServeNotes}</p>}
          {content.tierPlan.guidedSessionPlan && <BulletList items={content.tierPlan.guidedSessionPlan} />}
          {content.tierPlan.dfyBuildPlan && <BulletList items={content.tierPlan.dfyBuildPlan} />}
        </Section>
      )}

      <Section title="30 / 60 / 90 day milestones">
        <div className="grid sm:grid-cols-3 gap-3">
          {([["Day 30", content.milestones.day30], ["Day 60", content.milestones.day60], ["Day 90", content.milestones.day90]] as [string, string][]).map(([label, text]) => (
            <div key={label} className="rounded-lg p-3" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>{label.toUpperCase()}</p>
              <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>{text}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--canvas-text-3)" }}><strong>Ongoing:</strong> {content.milestones.ongoingCadence}</p>
      </Section>

      <Section title="KPIs, upgrades and scope creep watch-outs">
        <div className="grid sm:grid-cols-3 gap-4">
          {([["KPIs to track", content.kpisAndUpsell.kpis], ["Upgrade triggers", content.kpisAndUpsell.upgradesTriggers], ["Scope-creep watch-outs", content.kpisAndUpsell.scopeCreepWatchOuts]] as [string, string[]][]).map(([label, items]) => (
            <div key={label}>
              <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>{(label as string).toUpperCase()}</p>
              <BulletList items={items as string[]} />
            </div>
          ))}
        </div>
      </Section>

      {/* Account access & build workflow — DFY only */}
      {content.accountAccess && (
        <Section title="Account access & build workflow" badge="DONE-FOR-YOU · ADMIN ONLY">
          <div className="mb-4 rounded-xl p-3" style={{ background: "rgba(59,107,255,0.06)", border: "1px solid rgba(59,107,255,0.18)" }}>
            <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>
              ATG app stores <strong>no credentials or tokens</strong>. This section guides Shea through access requests, agreement confirmation, build steps, and offboarding. All actual access is granted through the client's own admin console.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>ACCESS CHECKLIST</p>
              <div className="space-y-2">
                {content.accountAccess.accessChecklist.map((item, i) => (
                  <div key={i} className="rounded-lg p-3" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{item.accountSystem}</p>
                      <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: "rgba(59,107,255,0.08)", color: "var(--blue)", letterSpacing: "0.04em" }}>{item.accessType}</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>ACCESS AGREEMENT CHECKPOINT</p>
              <p className="text-xs mb-2" style={{ color: "var(--canvas-text-3)" }}>Confirm these points in writing before any build work begins:</p>
              <BulletList items={content.accountAccess.accessAgreement} />
            </div>

            <div>
              <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>BUILD WORKFLOW</p>
              <ol className="space-y-2">
                {content.accountAccess.buildWorkflow.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 font-mono text-2xs w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(59,107,255,0.1)", color: "var(--blue)", marginTop: "1px" }}>{i + 1}</span>
                    <span style={{ color: "var(--canvas-text-2)" }}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <p className="font-mono text-2xs mb-2" style={{ color: "#D97706", letterSpacing: "0.08em" }}>OFFBOARDING</p>
              <BulletList items={content.accountAccess.offboarding} />
            </div>
          </div>
        </Section>
      )}

      {/* Install guides — GUIDED and DFY */}
      {content.installGuides && (
        <Section title="Install guides" badge={`${content.installGuides.applicableTier === "WHITE_GLOVE" ? "DONE-FOR-YOU" : "GUIDED"} · OPERATOR REFERENCE`}>
          <div className="mb-4 rounded-xl p-3" style={{ background: "rgba(59,107,255,0.06)", border: "1px solid rgba(59,107,255,0.18)" }}>
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>PRE-INSTALL CHECKLIST</p>
            <BulletList items={content.installGuides.preInstallChecklist} />
          </div>

          <div className="space-y-6">
            {content.installGuides.entries.map((entry) => (
              <div key={entry.workflowSlug} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
                {/* Workflow header */}
                <div className="px-4 py-3 flex items-center gap-3" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
                  <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{entry.workflowName}</p>
                  <code className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--canvas-1)", color: "var(--canvas-text-3)", border: "1px solid var(--canvas-border)" }}>
                    {entry.workflowSlug}
                  </code>
                </div>

                <div className="p-4 space-y-4">
                  {/* Connectors */}
                  {entry.connectorsNeeded.length > 0 && (
                    <div>
                      <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>CONNECTORS NEEDED</p>
                      <BulletList items={entry.connectorsNeeded} />
                    </div>
                  )}

                  {/* DFY build notes */}
                  {entry.dfyBuildNotes && entry.dfyBuildNotes.length > 0 && (
                    <div className="rounded-lg p-3" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)" }}>
                      <p className="font-mono text-2xs mb-1" style={{ color: "#D97706", letterSpacing: "0.06em" }}>DFY BUILD NOTES</p>
                      <BulletList items={entry.dfyBuildNotes} />
                    </div>
                  )}

                  {/* Per-platform entries */}
                  {entry.platforms.map((p) => (
                    <div key={p.platform} className="rounded-lg p-3" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
                      <p className="font-mono text-2xs font-bold mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>
                        {p.platformLabel.toUpperCase()}
                      </p>

                      {/* Ready-made alternative */}
                      {p.readyMadeAlternative && (
                        <div className="mb-3 rounded px-2 py-1.5" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                          <p className="text-xs font-semibold" style={{ color: "#16A34A" }}>
                            Ready-made: {p.readyMadeAlternative.name}
                          </p>
                          <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>{p.readyMadeAlternative.note}</p>
                          <a href={p.readyMadeAlternative.url} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: "var(--blue)" }}>
                            {p.readyMadeAlternative.url} ↗
                          </a>
                        </div>
                      )}

                      {/* Operator key steps */}
                      {p.operatorKeySteps.length > 0 && (
                        <div className="mb-3">
                          <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.04em" }}>INSTALL STEPS (SHEA)</p>
                          <ol className="space-y-1">
                            {p.operatorKeySteps.map((step, i) => (
                              <li key={i} className="flex gap-2 text-xs">
                                <span className="flex-shrink-0 font-mono w-4 text-right" style={{ color: "var(--blue)" }}>{i + 1}.</span>
                                <span style={{ color: "var(--canvas-text-2)" }}>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Routine prompt */}
                      {p.routinePrompt && (
                        <div className="mb-3">
                          <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.04em" }}>ROUTINE PROMPT (COPY-PASTE)</p>
                          <div className="rounded p-2 font-mono text-xs" style={{ background: "var(--canvas-1)", border: "1px solid var(--canvas-border)", whiteSpace: "pre-wrap", color: "var(--canvas-text-2)" }}>
                            {p.routinePrompt}
                          </div>
                        </div>
                      )}

                      {/* Operator notes */}
                      <div className="mb-2">
                        <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.04em" }}>OPERATOR NOTES</p>
                        <BulletList items={p.operatorNotes} />
                      </div>

                      {/* Confirmation code */}
                      <div className="rounded px-2 py-1.5 text-xs" style={{ background: "rgba(59,107,255,0.06)", border: "1px solid rgba(59,107,255,0.15)", color: "var(--canvas-text-2)" }}>
                        <strong style={{ color: "var(--blue)" }}>Verification: </strong>{p.confirmationNote}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

interface Props { clientId: string; intakeId?: string }

export default function PlaybookTab({ clientId, intakeId }: Props) {
  const [playbook, setPlaybook] = useState<ClientPlaybook | null>(null);
  const [versions, setVersions] = useState<ClientPlaybook[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [finalising, setFinalising] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [selectedVer, setSelectedVer] = useState<ClientPlaybook | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.admin.getPlaybook(clientId).catch(() => null),
      api.admin.listPlaybooks(clientId).catch(() => []),
    ]).then(([pb, vlist]) => {
      setPlaybook(pb);
      setVersions(vlist as ClientPlaybook[]);
      setSelectedVer(null);
      if (pb) setEditNotes(pb.adminNotes ?? "");
    }).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setGenerating(true);
    try {
      const pb = await api.admin.generatePlaybook(clientId, intakeId);
      setPlaybook(pb);
      setVersions((v) => [pb, ...v]);
      setEditNotes(pb.adminNotes ?? "");
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  async function saveNotes() {
    if (!playbook) return;
    setSavingNotes(true);
    const updated = await api.admin.patchPlaybook(clientId, playbook.id, { adminNotes: editNotes }).catch(() => null);
    if (updated) setPlaybook(updated);
    setSavingNotes(false);
  }

  async function markFinal() {
    if (!playbook || playbook.status === "final") return;
    setFinalising(true);
    const updated = await api.admin.finalisePlaybook(clientId, playbook.id).catch(() => null);
    if (updated) setPlaybook(updated);
    setFinalising(false);
  }

  function copyForPrint() {
    const pb = selectedVer ?? playbook;
    if (!pb) return;
    const content = parseContent(pb.content);
    if (!content) return;
    const text = `ATG CONSULTING — CLIENT PLAYBOOK (v${pb.version}, ${pb.status.toUpperCase()})

CLIENT SUMMARY
${content.clientSummary}

RISKS AND CLARIFICATIONS
${content.risksAndClarifications.map((r) => `• ${r}`).join("\n")}

TIER: ${content.tierRationale.recommendedTier}
${content.tierRationale.why}
Expectations to set:
${content.tierRationale.expectationsToSet.map((e) => `• ${e}`).join("\n")}

TOOL STACK
${content.toolStack.map((t) => `• ${t.tool} (${t.category}) — ${t.why} [${t.costNote}]`).join("\n")}

FIRST WORKFLOWS
${content.workflows.map((w) => `${w.name}:\n${w.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`).join("\n\n")}

30/60/90 MILESTONES
Day 30: ${content.milestones.day30}
Day 60: ${content.milestones.day60}
Day 90: ${content.milestones.day90}
Ongoing: ${content.milestones.ongoingCadence}

KPIs: ${content.kpisAndUpsell.kpis.join(" · ")}`;
    navigator.clipboard.writeText(text).then(() => alert("Playbook copied to clipboard")).catch(() => null);
  }

  const displayPb = selectedVer ?? playbook;
  const displayContent = displayPb ? parseContent(displayPb.content) : null;

  return (
    <div>
      {/* Header / actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>ADMIN ONLY · NOT SHOWN TO CLIENT</p>
          <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>Client Playbook</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {versions.length > 0 && (
            <select
              value={selectedVer?.id ?? ""}
              onChange={(e) => setSelectedVer(versions.find((v) => v.id === e.target.value) ?? null)}
              className="rounded-lg border text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue"
              style={{ borderColor: "var(--canvas-border)", background: "var(--canvas-1)", color: "var(--canvas-text)", fontFamily: "var(--font-mono)" }}
            >
              <option value="">Latest (v{playbook?.version})</option>
              {versions.slice(1).map((v) => (
                <option key={v.id} value={v.id}>v{v.version} · {v.status} · {new Date(v.createdAt).toLocaleDateString()}</option>
              ))}
            </select>
          )}
          {displayPb && <button onClick={copyForPrint} className="btn-ghost text-xs py-1.5 px-3">📋 Copy / print</button>}
          {playbook && playbook.status === "draft" && (
            <button onClick={markFinal} disabled={finalising} className="btn-secondary text-xs py-1.5 px-3">
              {finalising ? "…" : "Mark final"}
            </button>
          )}
          <button onClick={generate} disabled={generating} className="btn-primary text-xs py-1.5 px-3">
            {generating ? "Generating…" : playbook ? "Regenerate" : "Generate playbook"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
      ) : !displayPb ? (
        <div className="rounded-xl p-8 text-center" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
          <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>NO PLAYBOOK YET</p>
          <p className="text-sm mb-4" style={{ color: "var(--canvas-text-2)" }}>Generate a tailored operator playbook from this client's intake data.</p>
          <button onClick={generate} disabled={generating} className="btn-primary text-sm">
            {generating ? "Generating…" : "Generate playbook"}
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
          {/* Main content */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
            <div className="p-6">
              {displayContent
                ? <PlaybookView content={displayContent} pb={displayPb} />
                : <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Could not parse playbook content.</p>}
            </div>
          </div>

          {/* Right sidebar: admin notes */}
          <div className="space-y-4 sticky top-4">
            <div className="rounded-xl p-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
              <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>SHEA'S NOTES</p>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={6}
                placeholder="Private notes on this playbook…"
                className="field-input resize-none text-xs w-full"
                disabled={displayPb?.status === "final"}
              />
              {displayPb?.status !== "final" && (
                <button onClick={saveNotes} disabled={savingNotes} className="btn-primary text-xs mt-2">
                  {savingNotes ? "Saving…" : "Save notes"}
                </button>
              )}
            </div>

            <div className="rounded-xl p-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
              <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>VERSION HISTORY</p>
              <ul className="space-y-1.5">
                {versions.map((v) => (
                  <li key={v.id}>
                    <button
                      onClick={() => setSelectedVer(v.id === playbook?.id ? null : v)}
                      className="w-full text-left text-xs py-1 px-2 rounded transition-colors"
                      style={{
                        background: (selectedVer?.id ?? playbook?.id) === v.id ? "rgba(59,107,255,0.08)" : "transparent",
                        color: "var(--canvas-text-2)",
                      }}
                    >
                      v{v.version} · <span className="capitalize">{v.status}</span> · {new Date(v.createdAt).toLocaleDateString()}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
