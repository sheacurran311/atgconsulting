const audiences = [
  { mono: "IND", title: "Independent contractor salespeople", detail: "Commission reps who need a steady stream of new leads — and no time to find them manually." },
  { mono: "SMB", title: "Small business owners",              detail: "Owners who are also the sales department, marketer, and support team." },
  { mono: "SVC", title: "Solo service providers",             detail: "Consultants, trades, and agencies with no time to prospect or follow up consistently." },
];

export default function WhoItsFor() {
  return (
    <section
      id="who"
      className="py-20 sm:py-28"
      style={{ background: "var(--canvas-2)", borderTop: "1px solid var(--canvas-border)", borderBottom: "1px solid var(--canvas-border)" }}
      aria-labelledby="who-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mb-12">
          <p className="eyebrow mb-4">Who it's for</p>
          <h2 id="who-heading" className="section-heading" style={{ color: "var(--canvas-text)" }}>
            Built for people who sell for a living, but don&apos;t have a sales team.
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {audiences.map((a) => (
            <div key={a.mono} className="card">
              <span
                className="font-mono text-2xs font-bold block mb-3"
                style={{ color: "var(--blue)", letterSpacing: "0.1em" }}
              >
                {a.mono}
              </span>
              <h3 className="font-semibold text-base mb-2" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>
                {a.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
                {a.detail}
              </p>
            </div>
          ))}
        </div>

        <div
          className="mt-6 rounded-xl p-5"
          style={{ background: "var(--canvas-1)", border: "1px solid var(--canvas-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
            <strong style={{ color: "var(--canvas-text)" }}>Probably not a fit</strong> if you already have a full sales ops team, or if you want AI to send messages for you with no review. Shea builds systems where you stay in control.
          </p>
        </div>
      </div>
    </section>
  );
}
