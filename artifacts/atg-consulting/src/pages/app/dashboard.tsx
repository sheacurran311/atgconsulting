/**
 * Client Workbench dashboard — the product.
 * Tabs: Today (output inbox) · My Workflows · Hours Saved
 * Persistent operator panel in sidebar.
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import AppShell from "@/components/app/AppShell";
import TodayInbox from "@/components/workbench/TodayInbox";
import MyWorkflows from "@/components/workbench/MyWorkflows";
import EmptyWorkbench from "@/components/workbench/EmptyWorkbench";
import SupportForm from "@/components/workbench/SupportForm";
import SkillForm from "@/components/workbench/SkillsForms";
import SkillForm2 from "@/components/workbench/SkillsForms2";
import SkillLauncher from "@/components/workbench/SkillLauncher";
import RunHistory from "@/components/workbench/RunHistory";
import { api, type HoursSavedData } from "@/lib/api";
import { useAccount } from "@/lib/useAccount";
import { hasOperator } from "@/lib/tiers";

const BOOKING_URL = typeof window !== "undefined" ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book") : "#book";

function GuidedSessionsPanel() {
  const [sessions, setSessions] = useState<{ guidedSessionsTotal: number | null; guidedSessionsUsed: number } | null>(null);
  useEffect(() => { api.guidedSessions.get().then(setSessions).catch(() => null); }, []);
  if (!sessions?.guidedSessionsTotal) return null;
  const remaining = sessions.guidedSessionsTotal - sessions.guidedSessionsUsed;
  return (
    <div className="rounded-xl p-5 mb-6" style={{ border: "1px solid rgba(59,107,255,0.25)", background: "rgba(59,107,255,0.05)" }}>
      <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>YOUR SESSION PACKAGE</p>
      <p className="font-extrabold text-2xl mb-1" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em" }}>
        {remaining} / {sessions.guidedSessionsTotal}
      </p>
      <p className="text-sm mb-3" style={{ color: "var(--canvas-text-2)" }}>sessions remaining</p>
      {remaining > 0 && (
        <a href={BOOKING_URL} target={BOOKING_URL.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="btn-primary text-sm" style={{ padding: "8px 14px" }}>
          Book next session
        </a>
      )}
    </div>
  );
}

function HoursSavedTab({ tier, onDraft }: { tier: string; onDraft: () => void }) {
  const [data, setData] = useState<HoursSavedData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.workbench.hoursSaved().then(setData).catch(() => null).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <div className="mb-5">
        <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>LEDGER</p>
        <h2 className="font-extrabold text-xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>Hours saved</h2>
      </div>

      {loading ? <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
      : !data || (data.totalRuns === 0 && data.approved === 0) ? (
        <EmptyWorkbench tier={tier} onDraft={onDraft} />
      ) : (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>TOTAL RUNS</p>
              <p className="font-extrabold text-3xl" style={{ color: "var(--blue)", letterSpacing: "-0.04em" }}>{data.totalRuns}</p>
            </div>
            <div className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>OUTPUTS APPROVED</p>
              <p className="font-extrabold text-3xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.04em" }}>{data.approved}</p>
            </div>
          </div>
          {data.runs.slice(0, 10).map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
              <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>{r.summary ?? "Workflow run completed"}</p>
              <p className="font-mono text-2xs flex-shrink-0" style={{ color: "var(--canvas-text-3)" }}>{new Date(r.runAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: "today",     label: "Today" },
  { id: "workflows", label: "My workflows" },
  { id: "history",   label: "Run history" },
  { id: "hours",     label: "Hours saved" },
];

export default function DashboardPage() {
  const [tab, setTab] = useState("today");
  const [compose, setCompose] = useState(false);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const { account } = useAccount();
  const tier = account?.tier ?? "NONE";

  function openDraft() {
    setTab("today");
    setCompose(true);
  }

  return (
    <AppShell>
      <div className="max-w-content mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>ATG WORKBENCH</p>
            <h1 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>Your dashboard</h1>
          </div>
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm" style={{ padding: "8px 14px" }}>
            Book 1:1 with Shea
          </a>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 mb-6" style={{ borderBottom: "1px solid var(--canvas-border)" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{
                color: tab === t.id ? "var(--blue)" : "var(--canvas-text-2)",
                marginBottom: "-1px",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${tab === t.id ? "var(--blue)" : "transparent"}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "today" && tier === "GUIDED" && <GuidedSessionsPanel />}
        {/* Skill launcher (tier-aware, shows locked workflows with upgrade CTA) */}
        {tab === "today" && !activeSkill && (
          <SkillLauncher
            clientTier={tier}
            activeSkill={activeSkill}
            onSelectSkill={(slug) => setActiveSkill(slug)}
          />
        )}
        {/* Active skill form — Phase 1 */}
        {activeSkill && ["inbox-triage","review-request","social-calendar","seo-audit","follow-up"].includes(activeSkill) && (
          <div className="mb-6">
            <SkillForm
              skillKey={activeSkill as "inbox-triage"|"review-request"|"social-calendar"|"seo-audit"}
              onOutput={(item) => { setActiveSkill(null); }}
              onClose={() => setActiveSkill(null)}
            />
          </div>
        )}
        {/* Active skill form — Phase 2 */}
        {activeSkill && ["money-snapshot","booking-flow","quote-proposal","prospect-research"].includes(activeSkill) && (
          <div className="mb-6">
            <SkillForm2
              skillKey={activeSkill as "money-snapshot"|"booking-flow"|"quote-proposal"|"prospect-research"}
              onOutput={(item) => { setActiveSkill(null); }}
              onClose={() => setActiveSkill(null)}
            />
          </div>
        )}
        {tab === "today"     && <TodayInbox tier={tier} compose={compose} onCompose={setCompose} />}
        {tab === "workflows" && <MyWorkflows tier={tier} onDraft={openDraft} />}
        {tab === "history"   && <RunHistory />}
        {tab === "hours"     && <HoursSavedTab tier={tier} onDraft={openDraft} />}

        <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--canvas-border)" }}>
          {account ? (hasOperator(tier) ? <RequestWorkflowForm /> : <UpgradePrompt />) : null}
          {account && <div className="mt-6"><SupportForm tier={tier} /></div>}
        </div>
      </div>
    </AppShell>
  );
}

function UpgradePrompt() {
  return (
    <div className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
      <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>WANT SHEA INVOLVED?</p>
      <p className="text-sm mb-3" style={{ color: "var(--canvas-text-2)" }}>
        Want Shea to set this up for you? Guided and white-glove plans include tuning, 1:1 consults, and a message thread with Shea.
      </p>
      <Link to="/app/consultations" className="text-sm font-semibold underline" style={{ color: "var(--blue)" }}>
        See consultations
      </Link>
    </div>
  );
}

function RequestWorkflowForm() {
  const [desc, setDesc] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!desc.trim()) return;
    setSending(true);
    await api.workbench.requestWorkflow(desc.trim()).catch(() => null);
    setSending(false);
    setSent(true);
    setDesc("");
  }

  return (
    <div className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
      <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>REQUEST A NEW WORKFLOW</p>
      <p className="text-sm mb-3" style={{ color: "var(--canvas-text-2)" }}>
        Tell Shea what you&apos;d like automated next. She&apos;ll review it and add it to your design queue.
      </p>
      {sent ? (
        <p className="text-sm font-semibold" style={{ color: "#16A34A" }}>✓ Request sent to Shea</p>
      ) : (
        <div className="flex gap-3">
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Send a thank-you after every completed job"
            className="field-input flex-1 text-sm"
          />
          <button onClick={submit} disabled={sending || !desc.trim()} className="btn-primary text-sm" style={{ padding: "10px 16px" }}>
            {sending ? "Sending…" : "Request"}
          </button>
        </div>
      )}
    </div>
  );
}
