// Displays the LLM-generated (or fallback) tailored response after form submission.

import Link from "next/link";
import type { TailoredResponse } from "@/types/intake";
import { AREA_LABELS } from "@/types/intake";

const TIER_LABELS = {
  self_serve: "Self-serve",
  guided: "Guided",
  done_for_you: "White glove",
} as const;

interface Props {
  response: TailoredResponse;
  name: string;
}

export default function TailoredResponseView({ response, name }: Props) {
  const firstName = name.split(" ")[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-orange/10 border-2 border-orange/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold text-navy">
          Here&apos;s your plan, {firstName}.
        </h2>
        {response.type === "fallback" && (
          <p className="mt-1 text-xs text-navy/40">
            Generated from your answers (AI key not configured — full personalisation available with LLM key).
          </p>
        )}
      </div>

      {/* AI level summary */}
      <div className="bg-navy/[0.03] rounded-2xl p-5 border border-navy/10">
        <p className="text-xs font-bold text-orange tracking-widest uppercase mb-2">Where you are now</p>
        <p className="text-navy leading-relaxed">{response.aiLevelSummary}</p>
      </div>

      {/* Starter workflows */}
      <div>
        <p className="text-xs font-bold text-orange tracking-widest uppercase mb-3">Your starter workflows</p>
        <div className="space-y-3">
          {response.workflows.map((w, i) => (
            <div key={i} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-orange/80 tracking-widest uppercase">
                  {AREA_LABELS[w.area]}
                </span>
              </div>
              <h3 className="font-bold text-navy text-base">{w.title}</h3>
              <p className="text-navy/65 text-sm mt-1.5 leading-relaxed">{w.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick win */}
      <div className="rounded-2xl bg-orange/10 border border-orange/25 p-5">
        <p className="text-xs font-bold text-orange tracking-widest uppercase mb-2">Quick win — do this week</p>
        <p className="text-navy leading-relaxed">{response.quickWin}</p>
      </div>

      {/* Recommended tier */}
      <div className="rounded-2xl border-2 border-navy bg-navy text-white p-5">
        <p className="text-xs font-bold text-orange tracking-widest uppercase mb-2">Recommended tier</p>
        <p className="text-xl font-extrabold">{TIER_LABELS[response.recommendedTier]}</p>
        <p className="text-white/70 text-sm mt-1.5 leading-relaxed">{response.tierRationale}</p>
      </div>

      {/* CTA */}
      <div className="text-center space-y-3 pt-2">
        <p className="text-navy/70 leading-relaxed">{response.ctaText}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/#cta" className="btn-primary px-7 py-3">
            Book a free call
          </Link>
          <Link href="/" className="btn-ghost px-5 py-3">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
