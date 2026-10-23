const steps = [
  { n: "01", label: "Find",        detail: "Each week, a workflow builds a list of new taprooms, brewery openings, and team events in their territory." },
  { n: "02", label: "Research",    detail: "It pulls together a short brief on each one: recent releases, events, and who to contact." },
  { n: "03", label: "Draft",       detail: "It writes a first-touch email in the rep's voice for them to review and send." },
  { n: "04", label: "Follow up",   detail: "It flags who hasn't replied and drafts a friendly nudge." },
  { n: "05", label: "Keep records",detail: "It logs every touch in the CRM so nothing slips." },
];

export default function Example() {
  return (
    <section
      id="example"
      className="py-20 sm:py-28"
      style={{ background: "var(--canvas-2)", borderTop: "1px solid var(--canvas-border)", borderBottom: "1px solid var(--canvas-border)" }}
      aria-labelledby="example-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div
            className="flex gap-3 items-start mb-10 p-4 rounded-lg"
            role="note"
            style={{ background: "var(--blue-subtle-lt)", border: "1px solid rgba(249,115,22,0.2)" }}
          >
            <svg className="flex-shrink-0 w-4 h-4 mt-0.5" style={{ color: "var(--blue)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
              <strong style={{ color: "var(--canvas-text)" }}>Illustrative example, not a testimonial.</strong>{" "}
              Made-up scenario to show what a workflow looks like. Not a client result.
            </p>
          </div>

          <p className="eyebrow mb-4">Example walkthrough</p>
          <h2 id="example-heading" className="section-heading mb-5" style={{ color: "var(--canvas-text)" }}>
            What a workflow actually looks like
          </h2>
          <p className="text-base leading-relaxed mb-10" style={{ color: "var(--canvas-text-2)" }}>
            An independent rep selling large-format printing to craft breweries and sports teams.
            Great on the phone, but finding new accounts keeps getting pushed to &ldquo;later.&rdquo;
          </p>

          <ol className="space-y-0" role="list">
            {steps.map((s, i) => (
              <li key={s.n} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold"
                    style={{
                      background: i === 0 ? "var(--blue-btn)" : "var(--canvas-2)",
                      color: i === 0 ? "#fff" : "var(--canvas-text-2)",
                      border: `1px solid ${i === 0 ? "var(--blue-btn)" : "var(--canvas-border)"}`,
                    }}
                  >
                    {s.n}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px flex-1 my-1.5" style={{ background: "var(--canvas-border)" }} aria-hidden="true" />
                  )}
                </div>
                <div className="pb-6">
                  <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>
                    {s.label}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
