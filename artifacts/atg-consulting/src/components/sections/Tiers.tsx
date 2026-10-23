import { Link } from "wouter";

const BOOKING_URL = typeof window !== "undefined"
  ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book")
  : "#book";

const FEATURES = [
  "Recorded seminar & workflow templates",
  "Setup checklists for common tools",
  "Live sessions with Shea",
  "Workflows built together on calls",
  "Q&A support between sessions",
  "Done-for-you setup (inbox, CRM, calendar)",
  "Tailored to your voice, market, and clients",
  "30-day tuning and check-ins",
  "Handoff walkthrough",
];

const TIERS = [
  {
    id: "self",
    mono: "SELF-SERVE",
    name: "Self-serve",
    price: "[$ placeholder]",
    tagline: "Learn it yourself at your pace.",
    cta: "Join the seminar",
    ctaHref: "/start",
    external: false,
    features: [true, true, false, false, false, false, false, false, false],
  },
  {
    id: "guided",
    mono: "GUIDED",
    name: "Guided",
    price: "[$ placeholder]",
    tagline: "Build it with Shea, live.",
    cta: "Save my spot",
    ctaHref: "/start",
    external: false,
    features: [true, true, true, true, true, false, false, false, false],
  },
  {
    id: "wg",
    mono: "WHITE GLOVE",
    name: "White glove",
    price: "[$ placeholder]",
    tagline: "Shea builds and runs it. You review the output.",
    cta: "Book a 1:1",
    ctaHref: BOOKING_URL,
    external: true,
    featured: true,
    features: [true, true, true, true, true, true, true, true, true],
  },
];

export default function Tiers() {
  return (
    <section
      id="tiers"
      className="py-16 sm:py-24"
      style={{ background: "var(--canvas-2)", borderTop: "1px solid var(--canvas-border)" }}
      aria-labelledby="tiers-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="eyebrow mb-3">Three ways to work together</p>
          <h2 id="tiers-heading" className="section-heading" style={{ color: "var(--canvas-text)" }}>
            Done for you — or as{" "}
            <span style={{ color: "var(--blue)" }}>hands-on as you want.</span>
          </h2>
          <p className="mt-3 text-base" style={{ color: "var(--canvas-text-2)" }}>
            Most clients choose White Glove. Shea handles the design, the build, and the tuning.
          </p>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--canvas-border)" }}>
          <table className="min-w-full" style={{ background: "var(--canvas-1)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--canvas-border)" }}>
                <th className="px-5 py-5 text-left w-2/5">
                  <span className="label-mono">Feature</span>
                </th>
                {TIERS.map((t) => (
                  <th key={t.id} className="px-4 py-5 text-center" style={{ background: t.featured ? "rgba(59,107,255,0.04)" : "transparent" }}>
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-mono text-2xs font-bold" style={{ color: t.featured ? "var(--blue)" : "var(--canvas-text-3)", letterSpacing: "0.08em" }}>
                        {t.mono}
                      </span>
                      <span className="font-extrabold text-base" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>{t.name}</span>
                      <span className="text-xs" style={{ color: "var(--canvas-text-3)" }}>{t.tagline}</span>
                      <span className="font-extrabold text-lg mt-1" style={{ color: t.featured ? "var(--blue)" : "var(--canvas-text)", letterSpacing: "-0.025em" }}>{t.price}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feat, fi) => (
                <tr key={feat} style={{ borderBottom: fi < FEATURES.length - 1 ? "1px solid var(--canvas-border)" : "none" }}>
                  <td className="px-5 py-3 text-sm font-medium" style={{ color: "var(--canvas-text)" }}>{feat}</td>
                  {TIERS.map((t) => (
                    <td key={t.id} className="px-4 py-3 text-center" style={{ background: t.featured ? "rgba(59,107,255,0.02)" : "transparent" }}>
                      {t.features[fi]
                        ? <svg className="w-4 h-4 mx-auto" style={{ color: "var(--blue)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Included"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        : <span className="text-sm" style={{ color: "var(--canvas-text-3)" }} aria-label="Not included">—</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}

              {/* CTA row */}
              <tr style={{ borderTop: "1px solid var(--canvas-border)" }}>
                <td className="px-5 py-4" />
                {TIERS.map((t) => (
                  <td key={t.id} className="px-4 py-4 text-center" style={{ background: t.featured ? "rgba(59,107,255,0.04)" : "transparent" }}>
                    {t.external ? (
                      <a
                        href={t.ctaHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={t.featured ? "btn-primary text-sm" : "btn-secondary text-sm"}
                        style={{ padding: "8px 16px" }}
                      >
                        {t.cta}
                      </a>
                    ) : (
                      <Link to={t.ctaHref}>
                        <span
                          className={t.featured ? "btn-primary text-sm" : "btn-secondary text-sm"}
                          style={{ padding: "8px 16px" }}
                        >
                          {t.cta}
                        </span>
                      </Link>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
