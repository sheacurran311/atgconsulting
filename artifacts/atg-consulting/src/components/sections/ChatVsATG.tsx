/**
 * Chat vs ATG — honest two-column contrast.
 * Non-disparaging: acknowledges ChatGPT/Claude/Grok are great tools.
 */
export default function ChatVsATG() {
  const rows = [
    { label: "Core value", chat: "Flexible AI tools that answer and can execute tasks", atg: "A consultant diagnoses, designs, tests and documents the right solution" },
    { label: "Starting point", chat: "Your own prompts or connected apps", atg: "Your goals, systems and acceptance criteria" },
    { label: "Your tools", chat: "You choose and authorize integrations", atg: "Setup and guidance in customer-owned systems" },
    { label: "Automation", chat: "You configure tools, triggers and permissions", atg: "ATG helps configure and test your automations" },
    { label: "Implementation", chat: "Self-directed or app-assisted", atg: "Hands-on configuration, development and QA" },
    { label: "Portability", chat: "Depends on the tool and integration", atg: "Client-owned accounts, documented handoff and portable skills where supported" },
    { label: "Support", chat: "Varies by platform and subscription", atg: "Scoped consultant training or ongoing support" },
    { label: "Commercial experience", chat: "General-purpose technology", atg: "Sales, partnerships and hands-on product-building experience" },
  ];

  return (
    <section
      id="chat-vs-atg"
      className="py-16 sm:py-24"
      style={{ background: "var(--canvas)" }}
      aria-labelledby="compare-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-10">
          <p className="eyebrow mb-3">Why not just use ChatGPT?</p>
          <h2 id="compare-heading" className="section-heading mb-4" style={{ color: "var(--canvas-text)" }}>
            AI gives you powerful tools.{" "}
            <span style={{ color: "var(--blue)" }}>ATG helps put them to work.</span>
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
            ChatGPT, Claude, and Grok can already help with research, writing and connected actions.
            ATG adds business diagnosis, website and software development, workflow configuration,
            testing and hands-on training. Your AI automations run within platforms you authorize,
            not through ATG operating your accounts.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--canvas-border)" }}>
          <table className="min-w-full" style={{ background: "var(--canvas-1)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--canvas-border)" }}>
                <th className="px-5 py-4 text-left w-1/4"><span className="label-mono">Area</span></th>
                <th className="px-5 py-4 text-left" style={{ background: "var(--canvas-2)" }}>
                  <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>AI CHAT TOOLS</span>
                  <p className="font-semibold text-sm mt-0.5" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>ChatGPT, Claude, Grok…</p>
                </th>
                <th className="px-5 py-4 text-left" style={{ background: "rgba(59,107,255,0.04)" }}>
                  <span className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>ATG CONSULTING</span>
                  <p className="font-semibold text-sm mt-0.5" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>Designed, tested and taught by a consultant</p>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.label} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--canvas-border)" : "none" }}>
                  <td className="px-5 py-4">
                    <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>{r.label.toUpperCase()}</span>
                  </td>
                  <td className="px-5 py-4 text-sm" style={{ color: "var(--canvas-text-2)", background: "var(--canvas-2)" }}>
                    {r.chat}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium" style={{ color: "var(--canvas-text)", background: "rgba(59,107,255,0.025)" }}>
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: "var(--blue)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {r.atg}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 text-xs" style={{ color: "var(--canvas-text-3)" }}>
          ATG is a consulting and implementation service, not a separate execution platform for your emails or calendar. We configure workflows in systems you control and agree on appropriate approvals before they run.
        </p>
      </div>
    </section>
  );
}
