/**
 * Who We Help — vertical selector with 3 concrete workflows per business type.
 * Content driven by src/content/verticals.ts — edit that file to update.
 */
import { useState } from "react";
import { Link } from "wouter";
import { VERTICALS, AREA_LABELS_SIMPLE, type Vertical } from "@/content/verticals";

const AREA_COLOR: Record<string, string> = {
  ea:        "rgba(59,107,255,0.08)",
  marketing: "rgba(59,107,255,0.12)",
  sales:     "rgba(59,107,255,0.06)",
  cs:        "rgba(59,107,255,0.10)",
};

function VerticalCard({ v }: { v: Vertical }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium" style={{ color: "var(--canvas-text-3)" }}>{v.tagline}</p>
      {v.workflows.map((wf) => (
        <div
          key={wf.name}
          className="rounded-lg p-4"
          style={{ background: AREA_COLOR[wf.area] ?? "var(--canvas-2)", border: "1px solid rgba(59,107,255,0.15)" }}
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="font-semibold text-sm leading-tight" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>
              {wf.name}
            </p>
            <span
              className="font-mono text-2xs px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: "rgba(59,107,255,0.1)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.2)", letterSpacing: "0.06em" }}
            >
              {AREA_LABELS_SIMPLE[wf.area]}
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>{wf.what}</p>
        </div>
      ))}
    </div>
  );
}

export default function WhoWeHelp() {
  const [activeId, setActiveId] = useState(VERTICALS[0]!.id);
  const active = VERTICALS.find((v) => v.id === activeId) ?? VERTICALS[0]!;

  return (
    <section
      id="who-we-help"
      className="py-16 sm:py-24"
      style={{ background: "var(--canvas-2)", borderTop: "1px solid var(--canvas-border)", borderBottom: "1px solid var(--canvas-border)" }}
      aria-labelledby="who-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <p className="eyebrow mb-3">Who we help</p>
          <h2 id="who-heading" className="section-heading mb-3" style={{ color: "var(--canvas-text)" }}>
            Built for any business owner{" "}
            <span style={{ color: "var(--blue)" }}>who has more to do than time to do it.</span>
          </h2>
          <p className="text-base" style={{ color: "var(--canvas-text-2)" }}>
            You don&apos;t need to know anything about AI. Shea handles the setup. You handle the business.
          </p>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          {/* Vertical selector */}
          <div>
            <p className="font-mono text-2xs mb-3" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>
              YOUR BUSINESS TYPE
            </p>
            <div className="flex flex-col gap-1.5">
              {VERTICALS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveId(v.id)}
                  className="text-left px-4 py-3 rounded-lg transition-all"
                  style={{
                    background: activeId === v.id ? "var(--canvas-1)" : "transparent",
                    border: `1px solid ${activeId === v.id ? "var(--blue)" : "transparent"}`,
                    color: activeId === v.id ? "var(--canvas-text)" : "var(--canvas-text-2)",
                    boxShadow: activeId === v.id ? "0 0 0 1px rgba(59,107,255,0.08)" : "none",
                    transitionDuration: "120ms",
                  }}
                >
                  <span className="text-sm font-medium">{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Workflow cards */}
          <div
            className="rounded-xl p-6"
            style={{ background: "var(--canvas-1)", border: "1px solid var(--canvas-border)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>
                {active.label}
              </h3>
              <Link to="/start">
                <span className="btn-primary text-sm" style={{ padding: "8px 14px" }}>
                  Map my workflow →
                </span>
              </Link>
            </div>
            <VerticalCard v={active} />
          </div>
        </div>

        <p className="mt-6 text-xs" style={{ color: "var(--canvas-text-3)" }}>
          Don&apos;t see your type? Every business is different. Shea will map yours on your first call.
        </p>
      </div>
    </section>
  );
}
