/**
 * Output gallery — realistic sample artifact cards.
 * All clearly marked "Example output". Fictional placeholder businesses only.
 */
import { useState } from "react";

type OutputType = "briefing" | "email_draft" | "lead_list" | "social_post" | "quote_followup" | "review_request";

interface Sample {
  type: OutputType;
  label: string;
  vertical: string;
  subject: string;
  content: React.ReactNode;
}

const SAMPLES: Sample[] = [
  {
    type: "briefing",
    label: "Morning briefing",
    vertical: "Professional services",
    subject: "Your morning briefing — Friday 24 Oct",
    content: (
      <div className="font-mono text-xs space-y-2" style={{ color: "var(--canvas-text-2)" }}>
        <p style={{ color: "var(--blue)" }}>UPCOMING · 3 items</p>
        <p>→ Proposal due: Riverside Accounting (Mon)</p>
        <p>→ Client check-in: Mesa Insurance (Tue 10am)</p>
        <p>→ Contract renewal: Hilltop Legal (Thu)</p>
        <p style={{ color: "var(--blue)", marginTop: "8px" }}>FLAGGED · 1 item</p>
        <p>→ Maria Torres hasn't replied in 6 days — follow-up draft ready</p>
      </div>
    ),
  },
  {
    type: "email_draft",
    label: "Email draft",
    vertical: "Home services",
    subject: "Re: Roof repair quote — Henderson property",
    content: (
      <div className="text-xs space-y-2" style={{ color: "var(--canvas-text-2)" }}>
        <p><strong style={{ color: "var(--canvas-text)" }}>To:</strong> david.h@hendersongroup.com</p>
        <p><strong style={{ color: "var(--canvas-text)" }}>Subject:</strong> Re: Roof repair quote — Henderson property</p>
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--canvas-border)" }}>
          <p>Hi David,</p>
          <p className="mt-1">Thanks for reaching out. I&apos;ve attached our quote for the flat-roof repair at 4820 Mesa Drive. We can start as early as Tuesday 28 Oct if that works for you.</p>
          <p className="mt-1">Let me know if you have any questions.</p>
          <p className="mt-2">— Mike, Ridgeline Roofing</p>
        </div>
      </div>
    ),
  },
  {
    type: "lead_list",
    label: "Weekly prospect list",
    vertical: "Independent sales reps",
    subject: "New accounts — Denver territory · Week of 20 Oct",
    content: (
      <div className="text-xs" style={{ color: "var(--canvas-text-2)" }}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--canvas-border)" }}>
                {["Business", "Contact", "Note"].map((h) => (
                  <th key={h} className="text-left pb-2 pr-4 font-mono" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em", fontSize: "10px" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Copper Tap Brewing", "Lisa M., owner", "New taproom, opened Oct"],
                ["Summit Cycle Shop", "Rob K., mgr", "Expanding spring line"],
                ["Parkside Fitness", "Diana R., ops", "New studio, Jan open"],
              ].map(([b, c, n]) => (
                <tr key={b}>
                  <td className="py-1.5 pr-4 font-medium" style={{ color: "var(--canvas-text)" }}>{b}</td>
                  <td className="py-1.5 pr-4">{c}</td>
                  <td className="py-1.5">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 font-mono" style={{ color: "var(--canvas-text-3)", fontSize: "10px" }}>8 accounts found · 3 shown · Full list in your CRM</p>
      </div>
    ),
  },
  {
    type: "social_post",
    label: "Social post batch",
    vertical: "Coaches & creators",
    subject: "Content batch — week of 20 Oct · 3 posts ready",
    content: (
      <div className="text-xs space-y-3" style={{ color: "var(--canvas-text-2)" }}>
        {[
          { platform: "LinkedIn", text: "The hardest part of building a solo practice isn't the work. It's the 2 hours a day that disappear before you get to the work. Here's the three things I automated this year that gave me those hours back →" },
          { platform: "Instagram", text: "More time ≠ doing more. It means doing the right things. What would you do with 8 extra hours this week? 👇" },
        ].map(({ platform, text }) => (
          <div key={platform} className="rounded-md p-2" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
            <p className="font-mono mb-1" style={{ color: "var(--blue)", fontSize: "10px", letterSpacing: "0.06em" }}>{platform.toUpperCase()}</p>
            <p className="leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    type: "review_request",
    label: "Review request",
    vertical: "Home services",
    subject: "Review request — Sunrise Plumbing · Chen job",
    content: (
      <div className="text-xs space-y-2" style={{ color: "var(--canvas-text-2)" }}>
        <p className="font-mono" style={{ color: "var(--canvas-text-3)", fontSize: "10px" }}>TEXT MESSAGE DRAFT · to: (720) 555-0191</p>
        <div className="rounded-lg p-3" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
          <p>Hi Sarah! It was great working on your kitchen today. If you have a minute, a Google review would mean a lot to us. Here&apos;s the link: [review link]</p>
          <p className="mt-1">— Marcus, Sunrise Plumbing</p>
        </div>
        <p className="font-mono" style={{ color: "var(--canvas-text-3)", fontSize: "10px" }}>Sends 2 hours after job marked complete</p>
      </div>
    ),
  },
];

export default function OutputGallery() {
  const [active, setActive] = useState(0);
  const sample = SAMPLES[active]!;

  return (
    <section
      id="gallery"
      className="py-16 sm:py-24"
      style={{ background: "var(--canvas)" }}
      aria-labelledby="gallery-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-10">
          <p className="eyebrow mb-3">See what lands in your inbox</p>
          <h2 id="gallery-heading" className="section-heading mb-3" style={{ color: "var(--canvas-text)" }}>
            Finished work, ready to{" "}
            <span style={{ color: "var(--blue)" }}>review and send.</span>
          </h2>
          <p className="text-base" style={{ color: "var(--canvas-text-2)" }}>
            Every output is a draft you approve. Nothing goes out without your sign-off.
          </p>
        </div>

        <div className="grid lg:grid-cols-[200px_1fr] gap-6">
          {/* Tab list */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible">
            {SAMPLES.map((s, i) => (
              <button
                key={s.type}
                type="button"
                onClick={() => setActive(i)}
                className="flex-shrink-0 text-left px-3 py-2.5 rounded-lg transition-all"
                style={{
                  background: active === i ? "var(--canvas-1)" : "transparent",
                  border: `1px solid ${active === i ? "var(--blue)" : "transparent"}`,
                  color: active === i ? "var(--canvas-text)" : "var(--canvas-text-2)",
                }}
              >
                <p className="text-sm font-medium">{s.label}</p>
                <p className="font-mono text-2xs mt-0.5" style={{ color: "var(--canvas-text-3)" }}>{s.vertical}</p>
              </button>
            ))}
          </div>

          {/* Card */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)" }}>
            {/* Card chrome */}
            <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-2xs px-2 py-0.5 rounded"
                  style={{ background: "rgba(59,107,255,0.1)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.2)", letterSpacing: "0.06em" }}
                >
                  EXAMPLE OUTPUT
                </span>
                <span className="text-xs" style={{ color: "var(--canvas-text-3)" }}>Fictional placeholder businesses. Not a real client.</span>
              </div>
              <span className="font-mono text-2xs px-2 py-0.5 rounded" style={{ background: "rgba(59,107,255,0.08)", color: "var(--blue)", letterSpacing: "0.06em" }}>
                PENDING REVIEW
              </span>
            </div>

            <div className="p-6" style={{ background: "var(--canvas-1)" }}>
              <p className="font-semibold text-base mb-4" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>{sample.subject}</p>
              {sample.content}
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-3 px-6 py-4" style={{ borderTop: "1px solid var(--canvas-border)", background: "var(--canvas-2)" }}>
              <button className="btn-primary text-sm" style={{ padding: "7px 16px" }}>✓ Approve</button>
              <button className="btn-secondary text-sm" style={{ padding: "7px 16px" }}>✎ Edit</button>
              <button className="btn-ghost text-sm" style={{ padding: "7px 12px", color: "var(--canvas-text-3)" }}>✕ Dismiss</button>
              <span className="ml-auto font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>Set up by Shea</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
