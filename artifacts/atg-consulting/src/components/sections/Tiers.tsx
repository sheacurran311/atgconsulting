import { Link } from "wouter";

const BOOKING_URL = typeof window !== "undefined"
  ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book")
  : "#book";

const tiers = [
  {
    id: "white-glove",
    mono: "WHITE GLOVE",
    name: "White glove",
    tagline: "Shea designs, builds, and tunes your AI system for you.",
    price: "[$ placeholder]",
    cta: "Book your 1:1 with Shea",
    ctaHref: BOOKING_URL,
    external: true,
    featured: true,
    badge: "Flagship",
    features: [
      "1:1 consultation to map your specific situation",
      "Done-for-you setup: inbox, CRM, calendar, and workflows",
      "Tailored to your voice, market, and clients",
      "30 days of tuning and check-ins with Shea",
      "Walkthrough handoff so you know exactly how it works",
    ],
  },
  {
    id: "guided",
    mono: "GUIDED",
    name: "Guided",
    tagline: "Build it together with Shea in live sessions.",
    price: "[$ placeholder]",
    cta: "Save my spot",
    ctaHref: "/start",
    external: false,
    featured: false,
    badge: null,
    features: [
      "Live 1:1 or cohort sessions with Shea",
      "Prospecting and follow-up workflows built on the calls",
      "Everything in Self-serve included",
      "Q&A support between sessions: [channel and window]",
    ],
  },
  {
    id: "self-serve",
    mono: "SELF-SERVE",
    name: "Self-serve",
    tagline: "Learn the framework and build it yourself.",
    price: "[$ placeholder]",
    cta: "Join the free seminar",
    ctaHref: "/start",
    external: false,
    featured: false,
    badge: "Start here free",
    features: [
      "Recorded seminar: your first AI system in an afternoon",
      "Prompt and workflow templates for prospecting and outreach",
      "Setup checklists for common inboxes and CRMs",
    ],
  },
];

export default function Tiers() {
  return (
    <section
      id="tiers"
      className="py-20 sm:py-28"
      style={{ background: "var(--canvas-2)", borderTop: "1px solid var(--canvas-border)", borderBottom: "1px solid var(--canvas-border)" }}
      aria-labelledby="tiers-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="eyebrow mb-4">Three ways to work with Shea</p>
          <h2 id="tiers-heading" className="section-heading" style={{ color: "var(--canvas-text)" }}>
            Done for you — or as hands-on as you want.
          </h2>
          <p className="mt-4 text-base" style={{ color: "var(--canvas-text-2)" }}>
            Most clients want a human to handle it. That&apos;s why White Glove is the flagship.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {tiers.map((t) => (
            <div
              key={t.id}
              className="relative flex flex-col rounded-xl overflow-hidden"
              style={
                t.featured
                  ? { background: "var(--ink)", border: "1px solid var(--ink-border)", boxShadow: "0 0 0 1px rgba(249,115,22,0.15), 0 24px 48px rgba(0,0,0,0.3)" }
                  : { background: "var(--canvas-1)", border: "1px solid var(--canvas-border)" }
              }
            >
              {t.badge && (
                <div className="absolute top-4 right-4">
                  <span
                    className="font-mono text-2xs font-bold px-2 py-1 rounded"
                    style={t.featured
                      ? { background: "var(--blue-subtle-dk)", color: "var(--blue)", letterSpacing: "0.08em" }
                      : { background: "var(--canvas-2)", color: "var(--canvas-text-3)", letterSpacing: "0.08em" }
                    }
                  >
                    {t.badge.toUpperCase()}
                  </span>
                </div>
              )}

              <div className="flex flex-col flex-1 p-6">
                <span
                  className="font-mono text-2xs font-bold mb-3"
                  style={{ color: t.featured ? "var(--blue)" : "var(--canvas-text-3)", letterSpacing: "0.1em" }}
                >
                  {t.mono}
                </span>

                <h3
                  className="font-extrabold text-xl mb-2"
                  style={{ color: t.featured ? "var(--ink-text)" : "var(--canvas-text)", letterSpacing: "-0.025em" }}
                >
                  {t.name}
                </h3>
                <p
                  className="text-sm mb-5"
                  style={{ color: t.featured ? "var(--ink-text-2)" : "var(--canvas-text-2)" }}
                >
                  {t.tagline}
                </p>

                <p
                  className="font-extrabold text-2xl mb-5"
                  style={{ color: t.featured ? "var(--blue)" : "var(--canvas-text)", letterSpacing: "-0.03em" }}
                >
                  {t.price}
                </p>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm">
                      <svg
                        className="flex-shrink-0 w-4 h-4 mt-0.5"
                        style={{ color: "var(--blue)" }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span style={{ color: t.featured ? "var(--ink-text-2)" : "var(--canvas-text-2)" }}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                {t.external ? (
                  <a
                    href={t.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full justify-center"
                    style={{ fontSize: "14px" }}
                  >
                    {t.cta}
                  </a>
                ) : (
                  <Link to={t.ctaHref}>
                    <span
                      className="w-full justify-center flex items-center"
                      style={{
                        background: t.featured ? "transparent" : "var(--canvas-text)",
                        color: t.featured ? "var(--ink-text-2)" : "var(--canvas-1)",
                        border: `1px solid ${t.featured ? "var(--ink-border)" : "var(--canvas-text)"}`,
                        borderRadius: "var(--radius-md)",
                        padding: "10px 18px",
                        fontSize: "14px",
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        cursor: "pointer",
                      }}
                    >
                      {t.cta}
                    </span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
