import { Link } from "wouter";

const areas = [
  {
    id: "executive_assistant",
    mono: "EXEC",
    label: "Executive assistant",
    tagline: "Run your day without running out of time",
    bullets: ["Inbox triage and draft replies", "Calendar and scheduling", "Travel logistics", "Meeting notes and action items", "Personal and family logistics"],
  },
  {
    id: "marketing",
    mono: "MKTG",
    label: "Marketing",
    tagline: "Content and campaigns without the grind",
    bullets: ["Content repurposing pipeline", "Email campaigns with brand voice", "SEO research and briefs", "Lead magnet and ad copy drafts", "Competitive research summaries"],
  },
  {
    id: "sales",
    mono: "SALES",
    label: "Sales",
    tagline: "A pipeline that fills itself",
    bullets: ["Weekly prospect list building", "Lead research and briefs", "First-touch outreach drafts", "Follow-up nudges and sequences", "CRM logging and upkeep"],
  },
  {
    id: "customer_support",
    mono: "CS",
    label: "Customer support",
    tagline: "Faster replies, happier clients",
    bullets: ["Ticket and inbox triage", "Draft replies from your FAQ", "Help doc generation", "Feedback and review summaries", "Escalation flagging"],
  },
];

export default function WhatWeAutomate() {
  return (
    <section
      id="what-we-automate"
      className="py-20 sm:py-28"
      style={{ background: "var(--canvas)" }}
      aria-labelledby="automate-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="eyebrow mb-4">Four functional areas</p>
          <h2 id="automate-heading" className="section-heading" style={{ color: "var(--canvas-text)" }}>
            What we automate
          </h2>
          <p className="mt-4 text-base" style={{ color: "var(--canvas-text-2)" }}>
            Pick the areas that eat your week. Shea builds tailored solutions for every one you choose.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {areas.map((area) => (
            <div key={area.id} className="card-hover flex flex-col">
              {/* Mono area label */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="font-mono text-xs font-bold px-2 py-1 rounded"
                  style={{ background: "var(--blue-subtle-lt)", color: "var(--blue-btn)", letterSpacing: "0.1em" }}
                >
                  {area.mono}
                </span>
              </div>

              <h3
                className="font-semibold text-base mb-1"
                style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}
              >
                {area.label}
              </h3>
              <p className="text-xs mb-4" style={{ color: "var(--blue)" }}>{area.tagline}</p>

              <ul className="space-y-1.5 flex-1">
                {area.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm" style={{ color: "var(--canvas-text-2)" }}>
                    <svg className="flex-shrink-0 w-3.5 h-3.5 mt-0.5" style={{ color: "var(--blue)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
          <Link to="/intake">
            <span className="btn-primary" style={{ fontSize: "15px", padding: "12px 22px" }}>
              Tell me where you want help
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
