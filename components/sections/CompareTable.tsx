type CellVal = string | boolean;

const rows: { feature: string; ss: CellVal; g: CellVal; wg: CellVal }[] = [
  { feature: "Who builds it", ss: "You", g: "You, with me", wg: "Me" },
  { feature: "Recorded seminar", ss: true, g: true, wg: true },
  { feature: "Templates and checklists", ss: true, g: true, wg: true },
  { feature: "Live sessions", ss: false, g: "[number]", wg: "Kickoff and walkthrough" },
  { feature: "Inbox and CRM setup", ss: "DIY guide", g: "Built together", wg: "Done for you" },
  { feature: "Tuning period", ss: false, g: "During sessions", wg: "30 days" },
  { feature: "Time from you", ss: "[hours]", g: "[hours]", wg: "[hours]" },
  { feature: "Price", ss: "[$]", g: "[$]", wg: "[$]" },
];

function Cell({ val, highlight }: { val: CellVal; highlight?: boolean }) {
  const bg = highlight ? "bg-orange/5" : "";
  if (val === true)
    return (
      <td className={`px-4 py-4 text-center ${bg}`}>
        <svg className="w-5 h-5 text-orange mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Yes">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </td>
    );
  if (val === false)
    return <td className={`px-4 py-4 text-center text-navy/30 text-sm ${bg}`}>—</td>;
  return <td className={`px-4 py-4 text-sm text-navy/65 text-center ${bg}`}>{val}</td>;
}

export default function CompareTable() {
  return (
    <section id="compare" className="py-20 sm:py-28 bg-white" aria-labelledby="compare-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 id="compare-heading" className="section-heading">Compare the tiers</h2>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-navy/10 shadow-sm">
          <table className="min-w-full bg-white text-navy">
            <thead>
              <tr className="border-b border-navy/10">
                <th className="px-4 py-5 text-left text-xs font-bold text-navy/40 uppercase tracking-wider w-1/4">Feature</th>
                <th className="px-4 py-5 text-center text-base font-bold text-navy">Self-serve</th>
                <th className="px-4 py-5 text-center text-base font-bold text-orange bg-orange/5">
                  Guided <span className="text-xs font-normal text-orange/60">(popular)</span>
                </th>
                <th className="px-4 py-5 text-center text-base font-bold text-navy">White glove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {rows.map((r) => (
                <tr key={r.feature} className="hover:bg-navy/[0.015] transition-colors">
                  <td className="px-4 py-4 text-sm font-medium text-navy">{r.feature}</td>
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
