/**
 * Chat vs ATG — honest two-column contrast.
 * Non-disparaging: acknowledges ChatGPT/Claude/Grok are great tools.
 */
export default function ChatVsATG() {
  const rows = [
    { label: "How it works",   chat: "You ask → it answers",           atg: "It runs → you approve" },
    { label: "Starting point", chat: "Blank page, you prompt",          atg: "Designed workflow, runs on a schedule" },
    { label: "Your tools",     chat: "Copy-paste between apps",         atg: "Works inside your existing tools" },
    { label: "Frequency",      chat: "On-demand only",                  atg: "Scheduled, consistent, measurable" },
    { label: "Setup",          chat: "You figure out the prompts",      atg: "Shea designs and sets it up for you" },
    { label: "Portability",    chat: "Tied to one chat interface",       atg: "Export any workflow as a SKILL.md, run in Grok Bot or Claude" },
    { label: "Support",        chat: "Community forums or self-help",   atg: "Email (self-serve) or direct with Shea (guided/DFY)" },
    { label: "A person",       chat: "No one to call",                  atg: "Shea — who knows your specific business" },
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
            A chat waits for you.{" "}
            <span style={{ color: "var(--blue)" }}>A workflow runs for you.</span>
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
            ChatGPT, Claude, and Grok are excellent tools — and they can connect to apps, write emails,
            and do a lot. The difference is that ATG builds a <em>designed workflow</em> around your
            specific business, runs it on a schedule, and hands you finished work to approve. You
            don&apos;t have to prompt it, manage it, or think about it.
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
                  <span className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>ATG WORKBENCH</span>
                  <p className="font-semibold text-sm mt-0.5" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>Designed by Shea, runs for you</p>
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
          ATG uses AI tools internally to power your workflows — we just design them, set them up, and run them so you don&apos;t have to.
        </p>
      </div>
    </section>
  );
}
