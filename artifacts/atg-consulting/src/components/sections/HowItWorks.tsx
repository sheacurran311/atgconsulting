/**
 * How it works — terminal-style timeline.
 * Typewriter effect on scroll. Each step reveals when it enters the viewport.
 */
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    n: "01",
    cmd: "intake",
    desc: "Two minutes of questions about your role, where you lose the most time, and how you prefer to work. No tech background required.",
    note: "→ async · no call needed yet",
  },
  {
    n: "02",
    cmd: "snapshot",
    desc: "Shea reviews your intake and prepares a preliminary picture of your situation — where you are, and where AI can save the most time.",
    note: "→ human-reviewed · not generated and forgotten",
  },
  {
    n: "03",
    cmd: "design session",
    desc: "You and Shea map the exact workflow on a 1:1 call. She explains what she'll build, which tools, and what each step does.",
    note: "→ you stay in control of every decision",
  },
  {
    n: "04",
    cmd: "we build & run it",
    desc: "Shea sets up the system, tests it with real data, tunes it to your voice and clients, then walks you through it.",
    note: "→ 30-day tuning period included in White Glove",
  },
  {
    n: "05",
    cmd: "you review output",
    desc: "Every message is a draft you approve. Every workflow surfaces work for your 5-minute review. You keep full control.",
    note: "→ nothing sends without your sign-off by default",
  },
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
              Shea designs the workflow with you, then builds and runs it. You don&apos;t
              need to learn a tool, manage a vendor, or figure out a prompt. You
              review what comes out.
            </p>

            {/* Principles */}
            <div className="mt-8 space-y-3">
              {[
                ["You stay in control", "Every output is a draft you review before it goes anywhere."],
                ["We use what fits you", "Tools chosen for your stack, budget, and comfort level."],
                ["We tune it until it works", "30-day adjustment period. Not a handoff and goodbye."],
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
