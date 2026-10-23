import { Link } from "wouter";
import type { TailoredResponse } from "@/types/intake";
import { AREA_LABELS } from "@/types/intake";

const TIER_LABELS = {
  self_serve: "Self-serve",
  guided: "Guided — with Shea",
  done_for_you: "White Glove — done for you",
} as const;

interface Props { response: TailoredResponse; name: string }

export default function TailoredResponseView({ response, name }: Props) {
  const firstName = name.split(" ")[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--blue-subtle-lt)", border: "1px solid rgba(59,107,255,0.25)" }}
        >
          <svg className="w-8 h-8" style={{ color: "var(--blue)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>
          Here&apos;s your plan, {firstName}.
        </h2>
        {response.type === "fallback" && (
          <p className="mt-1 text-xs" style={{ color: "var(--canvas-text-3)" }}>
            Generated from your answers (no LLM key set)
          </p>
        )}
      </div>

      {/* AI level */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}
      >
        <p className="font-mono text-2xs font-bold mb-2" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
          WHERE YOU ARE NOW
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--canvas-text)" }}>
          {response.aiLevelSummary}
        </p>
      </div>

      {/* Workflows */}
      <div>
        <p className="font-mono text-2xs font-bold mb-3" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
          YOUR STARTER WORKFLOWS
        </p>
        <div className="space-y-3">
          {response.workflows.map((w, i) => (
            <div
              key={i}
              className="rounded-2xl p-5"
              style={{ background: "var(--canvas-1)", border: "1px solid var(--canvas-border)" }}
            >
              <p className="font-mono text-2xs font-bold mb-1.5" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>
                {AREA_LABELS[w.area].toUpperCase()}
              </p>
              <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>
                {w.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
                {w.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick win */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--blue-subtle-lt)", border: "1px solid rgba(59,107,255,0.2)" }}
      >
        <p className="font-mono text-2xs font-bold mb-2" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
          QUICK WIN — DO THIS WEEK
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--canvas-text)" }}>
          {response.quickWin}
        </p>
      </div>

      {/* Recommended tier */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--ink)", border: "1px solid var(--ink-border)" }}
      >
        <p className="font-mono text-2xs font-bold mb-2" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
          RECOMMENDED TIER
        </p>
        <p className="text-lg font-extrabold mb-1.5" style={{ color: "var(--ink-text)", letterSpacing: "-0.02em" }}>
          {TIER_LABELS[response.recommendedTier]}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-text-2)" }}>
          {response.tierRationale}
        </p>
      </div>

      {/* CTA */}
      <div className="text-center space-y-3 pt-2">
        <p className="text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
          {response.ctaText}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/#cta" className="btn-primary px-7 py-3">Book a free call</Link>
          <Link to="/" className="btn-ghost px-5 py-3">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
