/**
 * How it works — terminal-style timeline.
 * Typewriter effect on scroll. Each step reveals when it enters the viewport.
 */
import { useEffect, useRef, useState } from "react";

const STEPS = [
  { n: "01", cmd: "tell us your goals", desc: "Share what you want to improve: a website, logo, business process, sales and marketing workflow, custom application or personal routine.", note: "→ free initial assessment" },
  { n: "02", cmd: "discovery", desc: "We discuss your current systems, priorities, constraints and what an achievable first result should look like.", note: "→ short introductory consultation" },
  { n: "03", cmd: "proposal", desc: "ATG prepares a tailored scope, deliverables, timeline and quoted fee. You decide whether to proceed before any paid work begins.", note: "→ explicit agreement and authorization" },
  { n: "04", cmd: "build and verify", desc: "We implement the agreed website, integration or AI workflow, testing important behavior and keeping you involved in approvals.", note: "→ milestones and acceptance checks" },
  { n: "05", cmd: "train and hand off", desc: "You receive the agreed documentation and guidance to use what was built. Optional ongoing help is quoted separately.", note: "→ ownership and control stay with you" },
];

function Step({ step, index }: { step: typeof STEPS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) { setVisible(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { setTimeout(() => setVisible(true), index * 100); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [index, reduced]);

  return (
    <div
      ref={ref}
      className="flex gap-4 sm:gap-6 transition-all"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(12px)",
        transitionDuration: "400ms",
        transitionTimingFunction: "cubic-bezier(0.2,0,0,1)",
      }}
    >
      {/* Gutter */}
      <div className="flex flex-col items-center flex-shrink-0 w-8">
        <div
          className="w-6 h-6 rounded flex items-center justify-center font-mono text-2xs font-bold"
          style={{ background: visible ? "rgba(59,107,255,0.12)" : "var(--canvas-2)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.25)", letterSpacing: "0.04em" }}
        >
          {step.n}
        </div>
        {index < STEPS.length - 1 && (
          <div className="flex-1 mt-2" style={{ width: "1px", background: "var(--canvas-border)", minHeight: "32px" }} aria-hidden="true" />
        )}
      </div>

      {/* Content */}
      <div className="pb-8">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="font-mono text-2xs" style={{ color: "var(--blue)", opacity: 0.6 }}>$</span>
          <span className="font-mono font-bold text-sm" style={{ color: "var(--canvas-text)" }}>atg {step.cmd}</span>
        </div>
        <p className="text-sm leading-relaxed mb-1.5" style={{ color: "var(--canvas-text-2)" }}>{step.desc}</p>
        <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>{step.note}</p>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-16 sm:py-24"
      style={{ background: "var(--canvas-2)", borderTop: "1px solid var(--canvas-border)", borderBottom: "1px solid var(--canvas-border)" }}
      aria-labelledby="how-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1fr_520px] gap-10 lg:gap-20 items-start">

          {/* Left */}
          <div>
            <p className="eyebrow mb-4">How it works</p>
            <h2 id="how-heading" className="section-heading mb-4" style={{ color: "var(--canvas-text)" }}>
              Human-led,{" "}
              <span style={{ color: "var(--blue)" }}>start to finish.</span>
            </h2>
            <p className="text-base leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
              ATG starts with your goals, then recommends, builds and tests what makes sense. You get a clearly defined engagement, practical guidance, and ownership of your systems.
            </p>

            {/* Principles */}
            <div className="mt-8 space-y-3">
              {[
                ["You stay in control", "We establish appropriate permissions, review points and ownership before implementation."],
                ["We use what fits you", "The right website platform, application or AI tool depends on your needs, budget and existing systems."],
                ["We define what done means", "Testing, revisions, acceptance and any ongoing support are agreed in the project scope."],
              ].map(([title, body]) => (
                <div key={title} className="flex gap-3">
                  <span className="font-mono text-xs mt-0.5 flex-shrink-0" style={{ color: "var(--blue)" }}>›</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>{title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--canvas-text-2)" }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: terminal */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
              {[0,1,2].map(i => <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--canvas-border)" }} aria-hidden="true" />)}
              <span className="font-mono text-2xs ml-2" style={{ color: "var(--canvas-text-3)" }}>atg — engagement timeline</span>
            </div>
            <div className="p-5 sm:p-6">
              {STEPS.map((step, i) => <Step key={step.n} step={step} index={i} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
