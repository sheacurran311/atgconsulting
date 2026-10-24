import { Link } from "wouter";

const BOOKING_URL = typeof window !== "undefined"
  ? (import.meta.env.VITE_BOOKING_URL as string ?? "#book")
  : "#book";

// Tier descriptions map to NONE/SELF_SERVE/GUIDED/WHITE_GLOVE enum.
// Prices stay [$ placeholder] until Shea sets them.
const TIERS = [
  {
    id: "self",
    mono: "SELF-SERVE",
    name: "Self-serve",
    tagline: "A personalised plan you run yourself.",
    sheaRole: "You get Shea's expertise as a deliverable.",
    sheaDetail: "Shea produces a personalised tool plan and step-by-step setup guide for your specific business. You get email support with replies within 2 business days.",
    price: "[$ placeholder]",
    cta: "Get started",
    ctaHref: "/start?tier=self_serve",
    external: false,
    includes: [
      "Personalised tool plan — which tools to use and why",
      "Step-by-step setup guide for your stack",
      "Access to ready-made workflows in the app (follow-up drafts and more)",
      "Email support — replies within 2 business days",
    ],
    notIncluded: ["1:1 calls with Shea", "Shea tunes your workflows"],
  },
  {
    id: "guided",
    mono: "GUIDED",
    name: "Guided",
    tagline: "A package of live 1:1 sessions with Shea.",
    sheaRole: "Shea builds with you, directly.",
    sheaDetail: "A package of 1:1 build sessions — you and Shea design and set up your workflows together on live calls. Includes the operator message thread.",
    price: "[$ placeholder]",
    cta: "Book a session",
    ctaHref: BOOKING_URL,
    external: true,
    featured: true,
    badge: "Most popular",
    includes: [
      "A package of 1:1 build sessions with Shea",
      "Your workflows designed and built on the calls",
      "Everything in Self-serve",
      "Direct message thread with Shea",
    ],
    notIncluded: ["Shea runs and monitors workflows for you"],
  },
  {
    id: "dfy",
    mono: "DONE-FOR-YOU",
    name: "Done-for-you",
    tagline: "Shea builds, runs, and tunes it. You approve output.",
    sheaRole: "Shea is your operator.",
    sheaDetail: "Up to 3 custom workflows designed, built, and run by Shea. You approve the output; she handles everything else. By application — limited spots, waitlist when full.",
    price: "[$ placeholder]",
    cta: "Apply",
    ctaHref: "/start?tier=done_for_you",
    external: false,
    badge: "Limited spots",
    includes: [
      "Up to 3 custom workflows, designed for your business",
      "Shea builds, runs, and monitors them",
      "Monthly tuning and check-ins",
      "Everything in Guided",
    ],
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
          <p className="eyebrow mb-3">Three ways to work with Shea</p>
          <h2 id="tiers-heading" className="section-heading mb-3" style={{ color: "var(--canvas-text)" }}>
            Your plan, your level of involvement.
          </h2>
          <p className="text-base" style={{ color: "var(--canvas-text-2)" }}>
            All prices stay as [$ placeholder] until Shea sets them. Each tier includes the one below it.
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
              {t.badge && (
                <div className="absolute top-4 right-4">
                  <span
                    className="font-mono text-2xs font-bold px-2 py-1 rounded"
                    style={t.featured
                      ? { background: "rgba(59,107,255,0.15)", color: "var(--blue)", letterSpacing: "0.08em" }
                      : { background: "var(--canvas-2)", color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}
                  >
                    {t.badge.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex flex-col flex-1 p-6">
                <span className="font-mono text-2xs font-bold mb-3" style={{ color: t.featured ? "var(--blue)" : "var(--canvas-text-3)", letterSpacing: "0.1em" }}>{t.mono}</span>
                <h3 className="font-extrabold text-xl mb-1" style={{ color: t.featured ? "var(--ink-text)" : "var(--canvas-text)", letterSpacing: "-0.025em" }}>{t.name}</h3>
                <p className="text-sm mb-4" style={{ color: t.featured ? "var(--ink-text-2)" : "var(--canvas-text-2)" }}>{t.tagline}</p>

                {/* Shea's involvement */}
                <div className="rounded-lg p-3 mb-4" style={{ background: t.featured ? "rgba(59,107,255,0.12)" : "var(--canvas-2)", border: `1px solid ${t.featured ? "rgba(59,107,255,0.25)" : "var(--canvas-border)"}` }}>
                  <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>SHEA&apos;S ROLE</p>
                  <p className="font-semibold text-xs mb-1" style={{ color: t.featured ? "var(--ink-text)" : "var(--canvas-text)" }}>{t.sheaRole}</p>
                  <p className="text-xs leading-relaxed" style={{ color: t.featured ? "var(--ink-text-2)" : "var(--canvas-text-2)" }}>{t.sheaDetail}</p>
                </div>

                <p className="font-extrabold text-2xl mb-5" style={{ color: t.featured ? "var(--blue)" : "var(--canvas-text)", letterSpacing: "-0.025em" }}>{t.price}</p>

                <ul className="space-y-2 flex-1 mb-6">
                  {t.includes.map((f) => (
                    <li key={f} className="flex gap-2.5 text-xs">
                      <svg className="flex-shrink-0 w-4 h-4 mt-0.5" style={{ color: "var(--blue)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span style={{ color: t.featured ? "var(--ink-text-2)" : "var(--canvas-text-2)" }}>{f}</span>
                    </li>
                  ))}
                  {t.notIncluded?.map((f) => (
                    <li key={f} className="flex gap-2.5 text-xs">
                      <span className="flex-shrink-0 w-4 h-4 mt-0.5 flex items-center justify-center text-xs" style={{ color: "var(--canvas-text-3)" }} aria-hidden="true">—</span>
                      <span style={{ color: "var(--canvas-text-3)" }}>{f}</span>
                    </li>
                  ))}
                </ul>

                {t.external ? (
                  <a
                    href={t.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full justify-center text-sm"
                  >
                    {t.cta}
                  </a>
                ) : (
                  <Link to={t.ctaHref}>
                    <span className="btn-primary w-full justify-center text-sm" style={!t.featured ? { background: "var(--canvas-text)", color: "var(--canvas-1)" } : {}}>
                      {t.cta}
                    </span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-center" style={{ color: "var(--canvas-text-3)" }}>
          Done-for-you is also offered as an upgrade after Guided. Monthly cap: {parseInt(typeof window !== "undefined" ? "1" : "1", 10)} spot{parseInt("1", 10) !== 1 ? "s" : ""} (see admin for current capacity).
        </p>
      </div>
    </section>
  );
}
