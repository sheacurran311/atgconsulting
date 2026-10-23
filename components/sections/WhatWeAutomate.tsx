import Link from "next/link";

const areas = [
  {
    id: "executive_assistant",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    label: "Executive assistant",
    tagline: "Run your day without running out of time",
    bullets: ["Inbox triage and draft replies", "Calendar and scheduling", "Travel logistics", "Meeting notes and action items", "Personal and family logistics"],
  },
  {
    id: "marketing",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    label: "Marketing",
    tagline: "Content and campaigns without the grind",
    bullets: ["Content and social posts", "Email campaigns", "SEO research and briefs", "Lead magnet and ad copy drafts", "Competitive research summaries"],
  },
  {
    id: "sales",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    label: "Sales",
    tagline: "A pipeline that fills itself",
    bullets: ["Weekly prospect list building", "Lead research and briefs", "First-touch outreach drafts", "Follow-up nudges and sequences", "CRM logging and upkeep"],
  },
  {
    id: "customer_support",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    label: "Customer support",
    tagline: "Faster replies, happier clients",
    bullets: ["Ticket and inbox triage", "Draft replies from your FAQ", "Help doc generation", "Feedback and review summaries", "Escalation flagging"],
  },
];

export default function WhatWeAutomate() {
  return (
    <section id="what-we-automate" className="py-20 sm:py-28 bg-white" aria-labelledby="automate-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-eyebrow mb-3">Four functional areas</p>
          <h2 id="automate-heading" className="section-heading">
            What we automate
          </h2>
          <p className="mt-4 text-navy/60 text-lg">
            Pick the areas that eat your week. We&apos;ll build workflows for every one you choose.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {areas.map((area) => (
            <div
              key={area.id}
              className="flex flex-col rounded-2xl border border-navy/10 bg-white p-6 shadow-sm hover:shadow-md hover:border-orange/30 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-navy text-orange flex items-center justify-center mb-5">
                {area.icon}
              </div>
              <h3 className="font-extrabold text-navy text-lg">{area.label}</h3>
              <p className="text-orange text-xs font-semibold mt-1 mb-4">{area.tagline}</p>
              <ul className="space-y-2 flex-1">
                {area.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm text-navy/65">
                    <svg className="flex-shrink-0 w-4 h-4 text-orange mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/start"
            className="btn-primary px-7 py-3.5 text-base"
          >
            Tell me where you want help
          </Link>
        </div>
      </div>
    </section>
  );
}
