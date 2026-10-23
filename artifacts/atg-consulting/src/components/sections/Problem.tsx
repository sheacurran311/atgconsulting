const painPoints = [
  {
    key: "hats",
    label: "01",
    title: "You're wearing too many hats",
    detail: "Owner, salesperson, marketer, scheduler, and follow-up machine. Something always slips.",
  },
  {
    key: "leads",
    label: "02",
    title: "Good leads go cold",
    detail: "Not because you don't care — because there's no system keeping them warm.",
  },
  {
    key: "tools",
    label: "03",
    title: '"AI can help" isn\'t a plan',
    detail: "ChatGPT, Claude, and Grok can connect to apps and do a lot. The hard part is designing a system that fits your specific business, clients, and life. That's what Shea does.",
  },
  {
    key: "time",
    label: "04",
    title: "Your time is the bottleneck",
    detail: "The repetitive work — prospecting, follow-ups, scheduling, inbox — eats the hours that should go to clients.",
  },
];

export default function Problem() {
  return (
    <section
      id="problem"
      className="py-20 sm:py-28"
      style={{ background: "var(--canvas)" }}
      aria-labelledby="problem-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-14">
          <p className="eyebrow mb-4">The real problem</p>
          <h2 id="problem-heading" className="section-heading" style={{ color: "var(--canvas-text)" }}>
            You don&apos;t need another tool.{" "}
            <span style={{ color: "var(--blue)" }}>You need a solution built for you.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
            The tools are powerful. The problem is design — figuring out exactly which ones
            to use, how to connect them, and how to tune them to sound like you.
            That&apos;s a human job, and it&apos;s Shea&apos;s.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {painPoints.map((p) => (
            <div key={p.key} className="card-hover flex gap-4">
              <span
                className="font-mono text-xs font-medium mt-0.5 flex-shrink-0"
                style={{ color: "var(--blue)", letterSpacing: "0.06em" }}
              >
                {p.label}
              </span>
              <div>
                <h3 className="font-semibold text-base" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>
                  {p.title}
                </h3>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
                  {p.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
