/**
 * /start/result/:intakeId — Client-facing plan snapshot.
 * Short, no implementation details, no tool lists, no step-by-step.
 */
import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useUser } from "@clerk/react";
import { api, type PlanResult } from "@/lib/api";
import LogoMark from "@/components/LogoMark";

const AREA_ICONS: Record<string, string> = {
  sales: "◈",
  marketing: "◉",
  executive_assistant: "◷",
  customer_support: "◎",
};

const TIER_LABELS: Record<string, string> = {
  self_serve: "Self-serve",
  guided: "Guided — with Shea",
  done_for_you: "White Glove — done for you",
};

const BOOKING_URL = typeof window !== "undefined"
  ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book")
  : "#book";

export default function PlanResultPage() {
  const [, params] = useRoute("/start/result/:intakeId");
  const intakeId = params?.intakeId ?? "";
  const { isSignedIn } = useUser();

  const [result, setResult] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!intakeId) return;
    api.plan.get(intakeId)
      .then((r) => { setResult(r); setClaimed(r.claimed); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [intakeId]);

  async function handleClaim() {
    setClaiming(true);
    try { await api.plan.claim(intakeId); setClaimed(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to save."); }
    finally { setClaiming(false); }
  }

  if (loading) return <Shell><Spinner /></Shell>;
  if (error) return <Shell><ErrorState message={error} /></Shell>;
  if (!result?.plan) return <Shell><ErrorState message="Plan not found." /></Shell>;

  const { plan, name } = result;
  const firstName = name.split(" ")[0];

  return (
    <Shell>
      <div className="max-w-content mx-auto">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <LogoMark variant="light" size={44} />
          </div>
          <p className="font-mono text-xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.1em" }}>
            YOUR SNAPSHOT
          </p>
          <h1
            className="mt-3 font-extrabold text-2xl"
            style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}
          >
            Here&apos;s where you are, {firstName}.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--canvas-text-3)" }}>
            A preliminary read from your intake. Shea will refine this with you on your call.
          </p>
        </div>

        {/* AI Readiness */}
        <div
          className="rounded-xl p-5 mb-4"
          style={{ background: "var(--ink)", border: "1px solid var(--ink-border)" }}
        >
          <span
            className="font-mono text-2xs font-bold block mb-2"
            style={{ color: "var(--blue)", letterSpacing: "0.1em" }}
          >
            AI READINESS LEVEL
          </span>
          <p className="font-extrabold text-xl mb-2" style={{ color: "var(--ink-text)", letterSpacing: "-0.025em" }}>
            {plan.aiReadinessLabel}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-text-2)" }}>
            {plan.aiReadinessSummary}
          </p>
        </div>

        {/* Focus areas */}
        <div className="mb-4">
          <p
            className="font-mono text-2xs font-bold mb-3"
            style={{ color: "var(--canvas-text-3)", letterSpacing: "0.1em" }}
          >
            WHERE TAILORED HELP WOULD SAVE YOU THE MOST TIME
          </p>
          <div className="space-y-2.5">
            {plan.focusAreas.map((area, i) => (
              <div
                key={i}
                className="rounded-xl p-4 flex gap-3"
                style={{ background: "var(--canvas-1)", border: "1px solid var(--canvas-border)" }}
              >
                <span className="font-mono text-lg flex-shrink-0 mt-0.5" style={{ color: "var(--blue)" }}>
                  {AREA_ICONS[area.area] ?? "◆"}
                </span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>
                    {area.name}
                  </p>
                  <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
                    {area.whyItMatters}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended engagement */}
        <div
          className="rounded-xl p-5 mb-5"
          style={{ background: "var(--canvas-1)", border: `1px solid var(--canvas-border)` }}
        >
          <p className="font-mono text-2xs font-bold mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.1em" }}>
            RECOMMENDED ENGAGEMENT
          </p>
          <p className="font-extrabold text-lg mb-1.5" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>
            {TIER_LABELS[plan.recommendedTier] ?? plan.recommendedTier}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
            {plan.tierRationale}
          </p>
        </div>

        {/* Preliminary note */}
        <div
          className="flex gap-3 items-start p-4 rounded-lg mb-7"
          style={{ background: "var(--blue-subtle-lt)", border: "1px solid rgba(249,115,22,0.2)" }}
          role="note"
        >
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--blue)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
            <strong style={{ color: "var(--canvas-text)" }}>This is a preliminary snapshot.</strong>{" "}
            On your 1:1 call, Shea will review your specific situation in depth and build a tailored plan just for you.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="text-center space-y-4">
          <p className="font-medium text-base" style={{ color: "var(--canvas-text)" }}>
            {plan.ctaText}
          </p>
          <a
            href={BOOKING_URL}
            target={BOOKING_URL.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="btn-primary w-full sm:w-auto"
            style={{ fontSize: "15px", padding: "13px 28px", justifyContent: "center" }}
          >
            Book your 1:1 with Shea
          </a>

          {/* Save / Sign up */}
          {!claimed && isSignedIn && (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="btn-ghost w-full sm:w-auto text-sm"
            >
              {claiming ? "Saving…" : "Save this to my account"}
            </button>
          )}
          {!claimed && !isSignedIn && (
            <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>
              <Link to="/sign-up">
                <span className="underline cursor-pointer" style={{ color: "var(--canvas-text-2)" }}>
                  Create a free account
                </span>
              </Link>{" "}
              to save this snapshot and access your client dashboard.
            </p>
          )}
          {claimed && (
            <p className="text-sm font-medium" style={{ color: "#16A34A" }}>
              ✓ Saved to your account —{" "}
              <Link to="/app">
                <span className="underline cursor-pointer">view your dashboard</span>
              </Link>
            </p>
          )}
        </div>

        {plan.source === "TEMPLATE" && (
          <p className="mt-8 text-center font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.04em" }}>
            GENERATED FROM YOUR ANSWERS · FULL PERSONALISATION ON YOUR FREE 1:1 CALL
          </p>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-screen py-14 sm:py-20"
      style={{ background: "var(--canvas)" }}
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <LogoMark variant="light" size={36} aria-hidden style={{ opacity: 0.4 }} />
      <p className="font-mono text-xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>
        PREPARING YOUR SNAPSHOT…
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center max-w-md mx-auto py-20">
      <p className="font-semibold text-base mb-2" style={{ color: "var(--canvas-text)" }}>
        Couldn&apos;t load your plan
      </p>
      <p className="text-sm mb-6" style={{ color: "var(--canvas-text-2)" }}>{message}</p>
      <Link to="/intake">
        <span className="btn-primary">Start over</span>
      </Link>
    </div>
  );
}
