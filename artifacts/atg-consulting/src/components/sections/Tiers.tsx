import { Link } from "wouter";

const BOOKING_URL = typeof window !== "undefined"
  ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book")
  : "#book";

// Tiers described by how much of Shea's time and involvement you get
const TIERS = [
  {
    id: "self",
    mono: "SELF-SERVE",
    name: "Self-serve",
    shea: "Templates and guidance only",
    sheaDetail: "You get Shea's workflow templates, setup checklists, and a recorded seminar. You build it yourself.",
    price: "[$ placeholder]",
    cta: "Join the seminar",
    ctaHref: "/start",
    external: false,
    includes: [
      "Recorded seminar — your first workflow in an afternoon",
      "Prompt and workflow templates",
      "Setup checklists for common tools",
      "Community Q&A",
    ],
  },
  {
    id: "guided",
    mono: "GUIDED",
    name: "Guided",
    shea: "Shea builds it with you, live",
    sheaDetail: "Live sessions where you and Shea build your workflows together. You own the skills when you're done.",
    price: "[$ placeholder]",
    cta: "Save my spot",
    ctaHref: "/start",
    external: false,
    featured: true,
    includes: [
      "Everything in Self-serve",
      "Live 1:1 or cohort build sessions with Shea",
      "Your workflows built on the calls",
      "Q&A support between sessions",
    ],
  },
  {
    id: "wg",
    mono: "WHITE GLOVE",
    name: "White glove",
    shea: "Shea builds and runs it for you",
    sheaDetail: "Shea handles everything — design, setup, tuning, and ongoing operation. You review and approve output.",
    price: "[$ placeholder]",
    cta: "Book a 1:1 with Shea",
    ctaHref: BOOKING_URL,
    external: true,
    includes: [
      "Everything in Guided",
      "Done-for-you setup in your existing tools",
      "Tailored to your voice, clients, and business",
      "30-day tuning period with Shea",
      "Monthly check-ins and updates",
    ],
  },
];

export default function Tiers() {
  return (
    <section id="tiers" className="py-16 sm:py-24" style={{ background: "var(--canvas-2)", borderTop: "1px solid var(--canvas-border)" }} aria-labelledby="tiers-heading">
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="eyebrow mb-3">How much of Shea you get</p>
          <h2 id="tiers-heading" className="section-heading mb-3" style={{ color: "var(--canvas-text)" }}>
            Three ways to work together.{" "}
            <span style={{ color: "var(--blue)" }}>Done-for-you is the flagship.</span>
          </h2>
          <p className="text-base" style={{ color: "var(--canvas-text-2)" }}>
            The difference between tiers is how much of Shea&apos;s design and operational time you&apos;re getting.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {TIERS.map((t) => (
            <div
              key={t.id}
              className="relative flex flex-col rounded-xl overflow-hidden"
              style={t.featured
                ? { background: "var(--ink)", border: "1px solid var(--ink-border)", boxShadow: "0 0 0 1px rgba(59,107,255,0.15), 0 24px 48px rgba(0,0,0,0.3)" }
                : { background: "var(--canvas-1)", border: "1px solid var(--canvas-border)" }}
            >
              <div className="flex flex-col flex-1 p-6">
                <span className="font-mono text-2xs font-bold mb-3" style={{ color: t.featured ? "var(--blue)" : "var(--canvas-text-3)", letterSpacing: "0.1em" }}>{t.mono}</span>
                <h3 className="font-extrabold text-xl mb-1" style={{ color: t.featured ? "var(--ink-text)" : "var(--canvas-text)", letterSpacing: "-0.025em" }}>{t.name}</h3>

                {/* Shea's involvement */}
                <div className="rounded-lg p-3 mb-4" style={{ background: t.featured ? "rgba(59,107,255,0.12)" : "var(--canvas-2)", border: `1px solid ${t.featured ? "rgba(59,107,255,0.25)" : "var(--canvas-border)"}` }}>
                  <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>SHEA&apos;S INVOLVEMENT</p>
                  <p className="font-semibold text-sm" style={{ color: t.featured ? "var(--ink-text)" : "var(--canvas-text)", letterSpacing: "-0.01em" }}>{t.shea}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: t.featured ? "var(--ink-text-2)" : "var(--canvas-text-2)" }}>{t.sheaDetail}</p>
                </div>

                <p className="font-extrabold text-2xl mb-5" style={{ color: t.featured ? "var(--blue)" : "var(--canvas-text)", letterSpacing: "-0.025em" }}>{t.price}</p>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {t.includes.map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm">
                      <svg className="flex-shrink-0 w-4 h-4 mt-0.5" style={{ color: "var(--blue)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span style={{ color: t.featured ? "var(--ink-text-2)" : "var(--canvas-text-2)" }}>{f}</span>
                    </li>
                  ))}
                </ul>

                {t.external ? (
                  <a href={t.ctaHref} target="_blank" rel="noopener noreferrer" className="btn-primary w-full justify-center text-sm">{t.cta}</a>
                ) : (
                  <Link to={t.ctaHref}><span className="w-full justify-center flex items-center font-semibold text-sm rounded-md transition-colors" style={{ background: t.featured ? "transparent" : "var(--canvas-text)", color: t.featured ? "var(--ink-text-2)" : "var(--canvas-1)", border: `1px solid ${t.featured ? "var(--ink-border)" : "var(--canvas-text)"}`, padding: "10px 18px", borderRadius: "10px" }}>{t.cta}</span></Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
