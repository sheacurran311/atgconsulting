/**
 * Services — ready-made workflows, grouped by what they do for a business.
 * Each card shows the workflow name, plain-English description, and what you get.
 * Approval-first and portable-as-skills angles emphasized throughout.
 * No invented stats, no testimonials, no specific pricing.
 */

const WORKFLOW_GROUPS = [
  {
    group: "Leads & follow-up",
    description: "Turn new contacts into responses without chasing.",
    color: "rgba(59,107,255,0.08)",
    border: "rgba(59,107,255,0.2)",
    dot: "var(--blue)",
    workflows: [
      {
        name: "Lead follow-up draft",
        what: "Drafts a personalised follow-up for each new lead. You review and send — or it waits forever.",
        output: "Draft email · awaiting your approval",
      },
      {
        name: "Inbox triage",
        what: "Reads your inbox, flags what needs a reply, drafts the responses, and leaves the rest for you.",
        output: "Triage summary · draft replies",
      },
    ],
  },
  {
    group: "Reviews & reputation",
    description: "Keep your reputation growing without asking twice.",
    color: "rgba(59,107,255,0.05)",
    border: "rgba(59,107,255,0.15)",
    dot: "var(--blue)",
    workflows: [
      {
        name: "Review request",
        what: "Sends a thank-you + review request to recent customers at the right moment. You approve the list first.",
        output: "Review request batch · sent after approval",
      },
    ],
  },
  {
    group: "Content & social",
    description: "Consistent presence without the blank-page dread.",
    color: "rgba(59,107,255,0.05)",
    border: "rgba(59,107,255,0.12)",
    dot: "var(--blue)",
    workflows: [
      {
        name: "Social calendar",
        what: "Generates a week of platform-ready social posts for your business. You approve before anything goes out.",
        output: "7-day content calendar · post drafts",
      },
    ],
  },
  {
    group: "Local SEO & visibility",
    description: "Find the gaps before your competitors do.",
    color: "rgba(59,107,255,0.05)",
    border: "rgba(59,107,255,0.12)",
    dot: "var(--blue)",
    workflows: [
      {
        name: "Local SEO audit",
        what: "Checks your Google Business profile, local citation consistency, and top keyword gaps. Delivers a ranked action list.",
        output: "SEO action list · monthly refresh",
      },
    ],
  },
  {
    group: "Money & admin",
    description: "Know your numbers without a spreadsheet session.",
    color: "rgba(59,107,255,0.05)",
    border: "rgba(59,107,255,0.1)",
    dot: "var(--blue)",
    workflows: [
      {
        name: "Money snapshot",
        what: "Pulls your revenue and expense data together into a plain-English daily or weekly summary.",
        output: "Revenue digest · sent to your inbox",
      },
    ],
  },
  {
    group: "Bookings & reminders",
    description: "Fewer no-shows, less back-and-forth.",
    color: "rgba(59,107,255,0.05)",
    border: "rgba(59,107,255,0.1)",
    dot: "var(--blue)",
    workflows: [
      {
        name: "Booking & reminder flow",
        what: "Automates appointment confirmations, reminders, and post-visit follow-ups inside your existing calendar tool.",
        output: "Confirmation + reminder sequence",
      },
    ],
  },
  {
    group: "Quotes & proposals",
    description: "Send quotes the same day, not the same week.",
    color: "rgba(59,107,255,0.05)",
    border: "rgba(59,107,255,0.1)",
    dot: "var(--blue)",
    workflows: [
      {
        name: "Quote proposal",
        what: "Builds a branded proposal from your notes and scope. You review, adjust the numbers, and send.",
        output: "Proposal PDF · sent after approval",
      },
    ],
  },
  {
    group: "Prospecting & outreach",
    description: "Find the right people and reach them at the right time.",
    color: "rgba(59,107,255,0.05)",
    border: "rgba(59,107,255,0.1)",
    dot: "var(--blue)",
    workflows: [
      {
        name: "Prospect research",
        what: "Builds a qualified prospect list from your criteria — verified contact info, business size, location.",
        output: "Prospect list · CSV or CRM ready",
      },
    ],
  },
  {
    group: "Customer support",
    description: "Answer the same questions faster — with a human in the loop.",
    color: "rgba(59,107,255,0.05)",
    border: "rgba(59,107,255,0.1)",
    dot: "var(--blue)",
    workflows: [
      {
        name: "FAQ support reply",
        what: "Reads your support inbox, drafts replies to common questions using your FAQ doc, and flags the unusual ones.",
        output: "Draft replies · unusual tickets flagged",
      },
    ],
  },
  {
    group: "Agent team (Phase 2)",
    description: "Chain multiple workflows together into a fully managed system.",
    color: "rgba(59,107,255,0.04)",
    border: "rgba(59,107,255,0.08)",
    dot: "var(--canvas-text-3)",
    workflows: [
      {
        name: "Agent pipeline",
        what: "Connect individual workflows into a chain that runs end-to-end — from lead capture to closed deal to review.",
        output: "End-to-end pipeline · human checkpoints",
      },
    ],
  },
] as const;

export default function Services() {
  return (
    <section id="services" className="section-pad" style={{ background: "var(--canvas-1)" }} aria-labelledby="services-heading">
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
            ATG WORKBENCH · 11 WORKFLOWS
          </p>
          <h2 id="services-heading" className="display-lg mb-4" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em" }}>
            Ready-made workflows for{" "}
            <span style={{ color: "var(--blue)" }}>your kind of business</span>
          </h2>
          <p className="text-md mx-auto" style={{ color: "var(--canvas-text-2)", maxWidth: "520px" }}>
            Ready-made workflows you can try in the Workbench. Higher plans add live setup or Done-for-you operation.
            You review before anything leaves your system. Nothing runs automatically.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            <span className="font-mono text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(59,107,255,0.07)", border: "1px solid rgba(59,107,255,0.18)", color: "var(--blue)" }}>
              ✓ Approval-first
            </span>
            <span className="font-mono text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(59,107,255,0.07)", border: "1px solid rgba(59,107,255,0.18)", color: "var(--blue)" }}>
              ✓ Portable as Grok Bot skills
            </span>
            <span className="font-mono text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(59,107,255,0.07)", border: "1px solid rgba(59,107,255,0.18)", color: "var(--blue)" }}>
              ✓ Human-designed by Shea
            </span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {WORKFLOW_GROUPS.map((group) => (
            <div
              key={group.group}
              className="rounded-xl p-5"
              style={{
                background: group.color,
                border: `1px solid ${group.border}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: group.dot }}
                  aria-hidden="true"
                />
                <p className="font-mono text-2xs font-bold" style={{ color: "var(--canvas-text-2)", letterSpacing: "0.06em" }}>
                  {group.group.toUpperCase()}
                </p>
              </div>
              <p className="text-sm mb-3" style={{ color: "var(--canvas-text-2)" }}>
                {group.description}
              </p>

              {group.workflows.map((wf) => (
                <div key={wf.name} className="mt-3 first:mt-0">
                  <p className="font-extrabold text-sm mb-1" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>
                    {wf.name}
                  </p>
                  <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--canvas-text-2)" }}>
                    {wf.what}
                  </p>
                  <p
                    className="font-mono text-2xs px-2 py-1 rounded-md inline-block"
                    style={{ background: "rgba(59,107,255,0.06)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.12)" }}
                  >
                    {wf.output}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="text-center mt-8 p-5 rounded-xl" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--canvas-text)" }}>
            Portable as skills — not locked in
          </p>
          <p className="text-sm" style={{ color: "var(--canvas-text-2)", maxWidth: "520px", margin: "0 auto" }}>
            Any workflow Shea builds for you can be exported as a <code style={{ fontFamily: "var(--font-mono)", color: "var(--blue)", fontSize: "12px" }}>SKILL.md</code> and run inside Grok Bot, Claude, or any other AI tool you subscribe to.
            You own your workflows. ChatGPT, Claude, and Grok can all connect to apps — ATG's value is that someone designs the right ones for your business and keeps them running.
          </p>
        </div>
      </div>
    </section>
  );
}
