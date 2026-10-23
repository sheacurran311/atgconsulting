import { Link } from "wouter";

const BOOKING_URL = typeof window !== "undefined" ? (import.meta.env.VITE_BOOKING_URL ?? "#book") : "#book";

const tiers = [
  {
    id: "white-glove",
    name: "White glove",
    tagline: "Shea designs, builds, and tunes your AI system for you.",
    price: "[$ placeholder]",
    cta: "Book your 1:1 with Shea",
    ctaHref: BOOKING_URL,
    ctaExternal: true,
    featured: true,
    badge: "Most popular",
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
    name: "Guided",
    tagline: "Build it together with Shea in live sessions.",
    price: "[$ placeholder]",
    cta: "Save my spot",
    ctaHref: "/start",
    ctaExternal: false,
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
    name: "Self-serve",
    tagline: "Learn the framework and build it yourself.",
    price: "[$ placeholder]",
    cta: "Join the free seminar",
    ctaHref: "/start",
    ctaExternal: false,
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
    <section id="tiers" className="py-20 sm:py-28 bg-navy/[0.02]" aria-labelledby="tiers-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-eyebrow mb-3">Three ways to work with Shea</p>
          <h2 id="tiers-heading" className="section-heading">Done for you — or as hands-on as you want.</h2>
          <p className="mt-4 text-navy/60 text-lg">
            Most clients want a human to handle it. That&apos;s why White Glove is the flagship.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {tiers.map((t) => (
            <div
              key={t.id}
              className={`relative flex flex-col rounded-2xl border ${
                t.featured
                  ? "border-orange bg-navy text-white shadow-2xl shadow-navy/20"
                  : "border-navy/10 bg-white text-navy shadow-sm"
              }`}
            >
              {t.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={`text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full shadow ${t.featured ? "bg-orange text-white" : "bg-navy/10 text-navy"}`}>
                    {t.badge}
                  </span>
                </div>
              )}
              <div className="p-7 flex flex-col flex-1">
                <h3 className={`text-2xl font-extrabold ${t.featured ? "text-white" : "text-navy"}`}>{t.name}</h3>
                <p className={`mt-2 text-sm ${t.featured ? "text-white/65" : "text-navy/60"}`}>{t.tagline}</p>
                <div className="my-5">
                  <span className={`text-3xl font-extrabold ${t.featured ? "text-orange" : "text-navy"}`}>{t.price}</span>
                </div>
                <ul className="space-y-3 flex-1" role="list">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <svg className="flex-shrink-0 w-5 h-5 mt-0.5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-sm leading-relaxed ${t.featured ? "text-white/80" : "text-navy/70"}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                {t.ctaExternal ? (
                  <a
                    href={t.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-8 w-full text-center px-6 py-3.5 rounded-xl font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      t.featured ? "bg-orange text-white hover:bg-orange-500 focus-visible:ring-orange" : "bg-navy text-white hover:bg-navy-700 focus-visible:ring-navy"
                    }`}
                  >
                    {t.cta}
                  </a>
                ) : (
                  <Link
                    to={t.ctaHref}
                    className={`mt-8 w-full text-center px-6 py-3.5 rounded-xl font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      t.featured ? "bg-orange text-white hover:bg-orange-500 focus-visible:ring-orange" : "bg-navy text-white hover:bg-navy-700 focus-visible:ring-navy"
                    }`}
                  >
                    {t.cta}
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
