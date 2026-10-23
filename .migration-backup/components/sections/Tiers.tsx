import Link from "next/link";

const tiers = [
  {
    id: "self-serve",
    name: "Self-serve",
    tagline: "Learn it and build it yourself, at your own pace.",
    price: "[$ placeholder]",
    cta: "Join the free seminar",
    ctaHref: "#cta",
    featured: false,
    features: [
      "Recorded seminar: your first AI sales assistant in an afternoon",
      "Prompt and workflow templates for prospecting, outreach, and follow-up",
      "Setup checklists for common inboxes and CRMs",
    ],
  },
  {
    id: "guided",
    name: "Guided",
    tagline: "Build it with me, live, so it actually gets done.",
    price: "[$ placeholder]",
    cta: "Save my spot",
    ctaHref: "/start",
    featured: true,
    features: [
      "Live cohort or 1:1 build sessions: [number] sessions",
      "Your prospecting and follow-up workflows built on the calls",
      "Everything in Self-serve",
      "Q&A support between sessions: [channel and window]",
    ],
  },
  {
    id: "white-glove",
    name: "White glove",
    tagline: "I set it up for you and tune it for 30 days.",
    price: "[$ placeholder]",
    cta: "Book a call",
    ctaHref: "/start",
    featured: false,
    features: [
      "Done-for-you setup: inbox, CRM, and workflows connected",
      "Workflows tailored to your market and your voice",
      "30 days of tuning and check-ins",
      "A short walkthrough so you know how it all works",
    ],
  },
];

export default function Tiers() {
  return (
    <section id="tiers" className="py-20 sm:py-28 bg-navy/[0.02]" aria-labelledby="tiers-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-eyebrow mb-3">Three ways to work together</p>
          <h2 id="tiers-heading" className="section-heading">Pick the level of help that fits.</h2>
          <p className="mt-4 text-navy/60 text-lg">
            From watching a seminar to having me build the whole thing.
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
              {t.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-orange text-white text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full shadow">
                    Most popular
                  </span>
                </div>
              )}
              <div className="p-7 flex flex-col flex-1">
                <h3 className={`text-2xl font-extrabold ${t.featured ? "text-white" : "text-navy"}`}>{t.name}</h3>
                <p className={`mt-2 text-sm ${t.featured ? "text-white/65" : "text-navy/60"}`}>{t.tagline}</p>
                <div className="my-5">
                  <span className={`text-3xl font-extrabold ${t.featured ? "text-orange" : "text-navy"}`}>
                    {t.price}
                  </span>
                </div>
                <ul className="space-y-3 flex-1" role="list">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <svg
                        className="flex-shrink-0 w-5 h-5 mt-0.5 text-orange"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-sm leading-relaxed ${t.featured ? "text-white/80" : "text-navy/70"}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={t.ctaHref}
                  className={`mt-8 w-full text-center px-6 py-3.5 rounded-xl font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    t.featured
                      ? "bg-orange text-white hover:bg-orange-500 focus-visible:ring-orange"
                      : "bg-navy text-white hover:bg-navy-700 focus-visible:ring-navy"
                  }`}
                >
                  {t.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
