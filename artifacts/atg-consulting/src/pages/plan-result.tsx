/**
 * /start/result/:intakeId — Client-facing plan result.
 * Shows the SHORT snapshot only: readiness level, 2-3 focus areas, CTA.
 * No implementation details, no tool lists, no step-by-step instructions.
 */

import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useUser } from "@clerk/react";
import { api, type PlanResult } from "@/lib/api";

const AREA_ICONS: Record<string, string> = {
  sales: "📈",
  marketing: "📣",
  executive_assistant: "🗓️",
  customer_support: "💬",
};

const TIER_LABELS: Record<string, string> = {
  self_serve: "Self-serve",
  guided: "Guided (with Shea)",
  done_for_you: "White Glove — done for you",
};

const BOOKING_URL = typeof window !== "undefined" ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book") : "#book";

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
    if (!intakeId) return;
    setClaiming(true);
    try {
      await api.plan.claim(intakeId);
      setClaimed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save plan.");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!result?.plan) return <ErrorState message="Plan not found." />;

  const { plan, name } = result;
  const firstName = name.split(" ")[0];

  return (
    <main className="min-h-screen bg-gradient-to-b from-navy/[0.04] to-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 sm:py-20">

        {/* Header */}
        <div className="text-center mb-10">
          <img src="/brand/logos/svg/optionA_icon.svg" alt="ATG Consulting" className="h-10 w-auto mx-auto mb-5" />
          <p className="section-eyebrow mb-2">Your snapshot</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy">
            Here&apos;s where you are, {firstName}.
          </h1>
          <p className="mt-3 text-navy/55 text-sm">
            This is a preliminary read based on your answers. Shea will refine it with you on your call.
          </p>
        </div>

        {/* AI Readiness */}
        <div className="bg-navy rounded-2xl p-6 text-white mb-5">
          <p className="text-orange font-bold text-xs tracking-widest uppercase mb-2">AI readiness level</p>
          <p className="text-xl font-extrabold">{plan.aiReadinessLabel}</p>
          <p className="mt-2 text-white/70 leading-relaxed">{plan.aiReadinessSummary}</p>
        </div>

        {/* Focus areas */}
        <div className="mb-5">
          <p className="text-xs font-bold text-orange tracking-widest uppercase mb-3">Where tailored help would save you the most time</p>
          <div className="space-y-3">
            {plan.focusAreas.map((area, i) => (
              <div key={i} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm flex gap-4">
                <span className="text-2xl flex-shrink-0">{AREA_ICONS[area.area] ?? "⚡"}</span>
                <div>
                  <h3 className="font-bold text-navy">{area.name}</h3>
                  <p className="text-navy/65 text-sm mt-1 leading-relaxed">{area.whyItMatters}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended engagement */}
        <div className="rounded-2xl border-2 border-navy/15 bg-white p-5 mb-6">
          <p className="text-xs font-bold text-orange tracking-widest uppercase mb-2">Recommended engagement</p>
          <p className="text-lg font-extrabold text-navy">{TIER_LABELS[plan.recommendedTier] ?? plan.recommendedTier}</p>
          <p className="text-navy/65 text-sm mt-1 leading-relaxed">{plan.tierRationale}</p>
        </div>

        {/* Preliminary plan note */}
        <div className="rounded-xl bg-orange/8 border border-orange/20 p-4 mb-7 flex gap-3">
          <svg className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-navy/70 leading-relaxed">
            <strong className="text-navy">This is a preliminary snapshot.</strong> On your 1:1 call, Shea will review your
            specific situation in depth and build a tailored plan just for you.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="text-center space-y-4">
          <p className="text-navy font-semibold text-lg">{plan.ctaText}</p>
          <a
            href={BOOKING_URL}
            target={BOOKING_URL.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="btn-primary w-full sm:w-auto px-8 py-4 text-base"
          >
            Book your 1:1 with Shea
          </a>

          {/* Save plan */}
          {!claimed && isSignedIn && (
            <div>
              <button onClick={handleClaim} disabled={claiming} className="btn-ghost text-sm">
                {claiming ? "Saving…" : "Save this to my account"}
              </button>
            </div>
          )}
          {!claimed && !isSignedIn && (
            <p className="text-navy/45 text-sm">
              <Link to="/sign-up" className="underline text-navy/60 hover:text-navy">Create a free account</Link> to save this plan and access your client dashboard.
            </p>
          )}
          {claimed && (
            <p className="text-green-600 text-sm font-medium">
              ✓ Saved to your account — <Link to="/app" className="underline">view your dashboard</Link>
            </p>
          )}
        </div>

        {plan.source === "TEMPLATE" && (
          <p className="mt-8 text-center text-navy/30 text-xs">
            Generated from your answers · Full personalisation available with your free 1:1 call
          </p>
        )}
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <img src="/brand/logos/svg/optionA_icon.svg" alt="ATG Consulting" className="h-10 w-auto mx-auto mb-4 animate-pulse" />
        <p className="text-navy/60">Preparing your snapshot…</p>
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-navy font-semibold mb-3">We couldn&apos;t load your plan</p>
        <p className="text-navy/60 text-sm mb-6">{message}</p>
        <Link to="/start" className="btn-primary">Start over</Link>
      </div>
    </main>
  );
}
