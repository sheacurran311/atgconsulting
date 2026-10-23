type CellVal = string | boolean;

const rows: { feature: string; ss: CellVal; g: CellVal; wg: CellVal }[] = [
  { feature: "Who builds it",         ss: "You",        g: "You, with me",     wg: "Me" },
  { feature: "Recorded seminar",      ss: true,         g: true,               wg: true },
  { feature: "Templates & checklists",ss: true,         g: true,               wg: true },
  { feature: "Live sessions",         ss: false,        g: "[number]",         wg: "Kickoff + walkthrough" },
  { feature: "Inbox & CRM setup",     ss: "DIY guide",  g: "Built together",   wg: "Done for you" },
  { feature: "Tuning period",         ss: false,        g: "During sessions",  wg: "30 days" },
  { feature: "Time from you",         ss: "[hours]",    g: "[hours]",          wg: "[hours]" },
  { feature: "Price",                 ss: "[$]",        g: "[$]",              wg: "[$]" },
];

function Tick() {
  return (
    <svg className="w-4 h-4 mx-auto" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Yes">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Cell({ val, highlight }: { val: CellVal; highlight?: boolean }) {
  const bg = highlight ? "rgba(249,115,22,0.04)" : "transparent";
  if (val === true) return <td className="px-4 py-3.5 text-center" style={{ background: bg }}><Tick /></td>;
  if (val === false) return <td className="px-4 py-3.5 text-center text-sm" style={{ background: bg, color: "var(--canvas-text-3)" }}>—</td>;
  return <td className="px-4 py-3.5 text-center text-sm" style={{ background: bg, color: "var(--canvas-text-2)" }}>{val}</td>;
}

export default function CompareTable() {
  return (
    <section
      id="compare"
      className="py-20 sm:py-28"
      style={{ background: "var(--canvas)" }}
      aria-labelledby="compare-heading"
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 id="compare-heading" className="section-heading" style={{ color: "var(--canvas-text)" }}>
            Compare the tiers
          </h2>
        </div>

        <div
          className="overflow-x-auto rounded-xl"
          style={{ border: "1px solid var(--canvas-border)" }}
        >
          <table className="min-w-full" style={{ background: "var(--canvas-1)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--canvas-border)" }}>
                <th className="px-4 py-4 text-left" style={{ width: "30%" }}>
                  <span className="label-mono">Feature</span>
                </th>
                <th className="px-4 py-4 text-center">
                  <span className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>Self-serve</span>
                </th>
                <th className="px-4 py-4 text-center" style={{ background: "rgba(249,115,22,0.04)" }}>
                  <span className="font-semibold text-sm" style={{ color: "var(--accent-btn)" }}>Guided</span>
                  <span className="font-mono text-2xs ml-1.5" style={{ color: "var(--canvas-text-3)" }}>popular</span>
                </th>
                <th className="px-4 py-4 text-center">
                  <span className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>White glove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.feature}
                  style={{
                    borderBottom: i < rows.length - 1 ? "1px solid var(--canvas-border)" : "none",
                  }}
                >
                  <td className="px-4 py-3.5 text-sm font-medium" style={{ color: "var(--canvas-text)" }}>
                    {r.feature}
                  </td>
                  <Cell val={r.ss} />
                  <Cell val={r.g} highlight />
                  <Cell val={r.wg} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
