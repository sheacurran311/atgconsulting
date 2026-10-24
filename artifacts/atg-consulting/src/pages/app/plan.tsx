/**
 * /app/plan — My Plan (tool plan) page.
 * Visible to SELF_SERVE and above when admin has approved the plan.
 * Self-serve can also request a plan if none exists yet.
 */
import { useState, useEffect } from "react";
import AppShell from "@/components/app/AppShell";
import { api, type ToolPlan } from "@/lib/api";
import { useAccount } from "@/lib/useAccount";

interface Tool { name: string; why: string; costNote: string }
interface Step  { order: number; title: string; detail: string }

function PlanView({ plan }: { plan: ToolPlan }) {
  const tools: Tool[] = (() => { try { return JSON.parse(plan.toolsJson) as Tool[]; } catch { return []; } })();
  const steps: Step[]  = (() => { try { return JSON.parse(plan.stepsJson) as Step[]; } catch { return []; } })();
  return (
    <div className="space-y-8">
      <div className="rounded-xl p-5" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
        <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>APPROVED BY SHEA · {plan.approvedAt ? new Date(plan.approvedAt).toLocaleDateString() : "—"}</p>
        <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
          This plan was personalised for your business. Tool pricing changes — always verify current pricing on the provider's site before purchasing.
        </p>
      </div>

      {/* Tools */}
      <div>
        <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>RECOMMENDED TOOLS</p>
        <div className="space-y-3">
          {tools.map((t) => (
            <div key={t.name} className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
              <p className="font-semibold text-sm mb-1" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>{t.name}</p>
              <p className="text-sm mb-2" style={{ color: "var(--canvas-text-2)" }}>{t.why}</p>
              <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>💰 {t.costNote}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div>
        <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>SETUP STEPS</p>
        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.order} className="flex gap-4 p-4 rounded-xl" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
              <span className="font-mono text-xs font-bold w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ background: "rgba(59,107,255,0.08)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.2)" }}>
                {s.order}
              </span>
              <div>
                <p className="font-semibold text-sm mb-0.5" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>{s.title}</p>
                <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function PlanPage() {
  const { account } = useAccount();
  const [plan, setPlan] = useState<ToolPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);

  useEffect(() => {
    api.toolPlan.get()
      .then(setPlan)
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, []);

  const tier = account?.tier ?? "NONE";
  const canAccess = tier === "SELF_SERVE" || tier === "GUIDED" || tier === "WHITE_GLOVE";

  async function requestPlan() {
    setGenerating(true);
    try {
      await api.toolPlan.generate();
      setPendingMsg("Your plan has been sent to Shea for review. She'll approve it within 2 business days.");
    } catch {
      setPendingMsg("Something went wrong. Contact support.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-content mx-auto">
        <div className="mb-8">
          <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>SELF-SERVE · PERSONALISED</p>
          <h1 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>My plan</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--canvas-text-2)" }}>Your personalised tool recommendations and setup guide.</p>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
        ) : !canAccess ? (
          <div className="rounded-xl p-8 text-center" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
            <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>SELF-SERVE AND ABOVE</p>
            <p className="font-semibold text-sm mb-1" style={{ color: "var(--canvas-text)" }}>Upgrade to access your personalised plan.</p>
            <p className="text-xs mb-4" style={{ color: "var(--canvas-text-3)" }}>The Self-serve tier includes a tool plan and setup guide written for your specific business.</p>
            <a href="/#tiers" className="btn-primary text-sm">View plans</a>
          </div>
        ) : plan ? (
          <PlanView plan={plan} />
        ) : pendingMsg ? (
          <div className="rounded-xl p-6" style={{ background: "rgba(59,107,255,0.06)", border: "1px solid rgba(59,107,255,0.2)" }}>
            <p className="font-semibold text-sm mb-1" style={{ color: "var(--canvas-text)" }}>Plan requested</p>
            <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>{pendingMsg}</p>
          </div>
        ) : (
          <div className="rounded-xl p-8 text-center" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
            <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>NO PLAN YET</p>
            <p className="font-semibold text-sm mb-1" style={{ color: "var(--canvas-text)" }}>Your personalised plan is on the way.</p>
            <p className="text-xs mb-4" style={{ color: "var(--canvas-text-3)" }}>Shea will review your intake and prepare your tool plan. You can also request it now.</p>
            <button onClick={requestPlan} disabled={generating} className="btn-primary text-sm">
              {generating ? "Requesting…" : "Request my plan"}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
