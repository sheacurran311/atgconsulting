/**
 * Hero — "We build the AI workflows. You get the hours back."
 * Shows the shipped product: 10 workflows across all business types.
 * Grouped by business need; approval-first; portable as skills.
 * Shea is visibly the operator. No invented stats or testimonials.
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import LogoMark from "@/components/LogoMark";
import { VERTICALS } from "@/content/verticals";

const BOOKING_URL = typeof window !== "undefined"
  ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book")
  : "#book";

// One representative workflow per vertical for the hero demo
const VERTICAL_DEMOS = VERTICALS.map((v) => ({
  id: v.id,
  label: v.label,
  workflowName: v.workflows[0]?.name ?? "Workflow",
  what: v.workflows[0]?.what ?? "",
  area: v.workflows[0]?.area ?? "sales",
}));

export default function Hero() {
  const [activeIdx, setActiveIdx] = useState(0);
  const demo = VERTICAL_DEMOS[activeIdx]!;

  useEffect(() => {
    const id = setInterval(() => setActiveIdx((i) => (i + 1) % VERTICAL_DEMOS.length), 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--ink)", minHeight: "88vh" }}
      aria-labelledby="hero-heading"
    >
      <div className="absolute inset-0 bg-dot-dark pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,107,255,0.07) 0%, transparent 70%)" }} aria-hidden="true" />

      <div className="relative max-w-wide mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 sm:pt-20">
        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-8">
          <LogoMark variant="dark" size={18} aria-hidden blink />
          <span className="font-mono text-2xs" style={{ color: "var(--ink-text-3)", letterSpacing: "0.08em" }}>ATG CONSULTING · CO · USA</span>
          <span className="w-px h-3" style={{ background: "var(--ink-border)" }} aria-hidden="true" />
          <span className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>10 WORKFLOWS · DONE FOR YOU</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: headline + CTA */}
          <div>
            <h1 id="hero-heading" className="display-xl mb-5" style={{ color: "var(--ink-text)" }}>
              We build the AI workflows.{" "}
              <span style={{ color: "var(--blue)" }}>You get the hours back.</span>
            </h1>

            <p className="text-md leading-relaxed mb-4" style={{ color: "var(--ink-text-2)", maxWidth: "480px" }}>
              Shea designs and runs AI workflows tailored to your specific business — across admin,
              marketing, sales, and customer support. You review and approve the output.
              Nothing is sent automatically.
            </p>

            <div className="space-y-2 mb-7">
              {[
                "Approval-first — every output lands in your inbox for review",
                "Portable — take any workflow as a skill into Grok Bot or Claude",
                "Human-led — Shea designs, tunes, and runs it",
              ].map((point) => (
                <p key={point} className="flex gap-2 text-sm" style={{ color: "var(--ink-text-2)" }}>
                  <span style={{ color: "var(--blue)" }}>›</span>
                  {point}
                </p>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/start">
                <span className="btn-primary" style={{ fontSize: "15px", padding: "12px 22px" }}>
                  Map my workflow →
                </span>
              </Link>
              <a
                href={BOOKING_URL}
                target={BOOKING_URL.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="btn-secondary-white"
                style={{ fontSize: "15px", padding: "12px 22px" }}
              >
                Book a 1:1 with Shea
              </a>
            </div>

            <p className="font-mono text-2xs mt-5" style={{ color: "var(--ink-text-3)" }}>
              No tech background needed · Works with tools you already use ·{" "}
              <kbd className="px-1 py-0.5 rounded" style={{ background: "var(--ink-3)", border: "1px solid var(--ink-border)" }}>⌘K</kbd>
              {" "}to navigate
            </p>
          </div>

          {/* Right: vertical selector + workflow preview */}
          <div>
            <p className="font-mono text-2xs mb-2" style={{ color: "var(--ink-text-3)", letterSpacing: "0.08em" }}>
              PICK YOUR BUSINESS TYPE
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {VERTICAL_DEMOS.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-md transition-all"
                  style={{
                    background: i === activeIdx ? "rgba(59,107,255,0.15)" : "var(--ink-2)",
                    border: `1px solid ${i === activeIdx ? "var(--blue)" : "var(--ink-border)"}`,
                    color: i === activeIdx ? "var(--blue)" : "var(--ink-text-2)",
                    transitionDuration: "120ms",
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Workflow preview card */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--ink-border)", background: "var(--ink-1)" }}>
              <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ background: "var(--ink-2)", borderBottom: "1px solid var(--ink-border)" }}>
                <LogoMark variant="dark" size={14} aria-hidden blink />
                <span className="font-mono text-2xs ml-1" style={{ color: "var(--ink-text-3)" }}>
                  {demo.label.toLowerCase().replace(/ /g, "-")}.workflow
                </span>
                <span className="ml-auto font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: "rgba(59,107,255,0.1)", color: "var(--blue)", letterSpacing: "0.06em" }}>EXAMPLE</span>
              </div>
              <div className="p-5">
                <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>
                  {demo.area.replace("_", " ").toUpperCase()} · APPROVAL REQUIRED
                </p>
                <p className="font-extrabold text-base mb-2" style={{ color: "var(--ink-text)", letterSpacing: "-0.02em" }}>
                  {demo.workflowName}
                </p>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--ink-text-2)" }}>
                  {demo.what}
                </p>
                <div className="rounded-lg p-3 font-mono text-xs" style={{ background: "var(--ink-3)", border: "1px solid var(--ink-border)" }}>
                  <p className="mb-1" style={{ color: "var(--blue)", opacity: 0.6, fontSize: "10px", letterSpacing: "0.06em" }}>RUN LOG · EXAMPLE</p>
                  <p style={{ color: "var(--ink-text-2)" }}>› Workflow triggered on schedule</p>
                  <p style={{ color: "var(--ink-text-2)" }}>› Output prepared for your review</p>
                  <p style={{ color: "var(--blue)", fontWeight: 600 }}>✓ Reviewed by Shea</p>
                  <p style={{ color: "var(--ink-text-2)" }}>› Landed in your inbox · awaiting approval</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
