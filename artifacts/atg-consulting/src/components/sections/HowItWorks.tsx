const steps = [
  {
    n: "01",
    title: "Tell Shea about your situation",
    detail: "A 2-minute intake captures your role, where you lose the most time, and how you prefer to work. No tech knowledge required.",
  },
  {
    n: "02",
    title: "Get a tailored plan on the call",
    detail: "Shea reviews your answers, prepares a personalised proposal, and walks you through it on a 1:1 call — what she'd build, which tools, and what it would save you.",
  },
  {
    n: "03",
    title: "She builds it, you run it",
    detail: "Shea sets up your system, tunes it to your voice and clients, and hands it off with a walkthrough. You stay in control of every message that goes out.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-20 sm:py-28"
      style={{ background: "var(--canvas-2)", borderTop: "1px solid var(--canvas-border)", borderBottom: "1px solid var(--canvas-border)" }}
      aria-labelledby="how-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="eyebrow mb-4">How it works</p>
          <h2 id="how-heading" className="section-heading" style={{ color: "var(--canvas-text)" }}>
            Human-led from start to finish.
          </h2>
          <p className="mt-4 text-base" style={{ color: "var(--canvas-text-2)" }}>
            Shea handles the design. You don&apos;t need to become an AI expert.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="relative p-6 rounded-xl"
              style={{
                background: "var(--canvas-1)",
                border: "1px solid var(--canvas-border)",
              }}
            >
              {/* Step indicator */}
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="font-mono text-xs font-bold px-2 py-1 rounded"
                  style={{
                    background: i === 1 ? "var(--blue-subtle-lt)" : "var(--canvas-2)",
                    color: i === 1 ? "var(--blue-btn)" : "var(--canvas-text-3)",
                    letterSpacing: "0.06em",
                  }}
                >
                  STEP {s.n}
                </span>
                {i < steps.length - 1 && (
                  <div
                    className="hidden md:block absolute top-8 -right-3 w-6 h-px"
                    style={{ background: "var(--canvas-border)", zIndex: 1 }}
                    aria-hidden="true"
                  />
                )}
              </div>
              <h3
                className="font-semibold text-base mb-2"
                style={{ color: "var(--canvas-text)", letterSpacing: "-0.015em" }}
              >
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
                {s.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
