import { usd, type FinancialSummary } from "@/lib/engagementWorkspace";

const pct = (value: number | null) => value === null ? "Unavailable" : new Intl.NumberFormat("en-US", {maximumFractionDigits: 1}).format(value) + "%";

export function EngagementFinanceSummary({summary, contracted}: {summary: FinancialSummary; contracted?: number | null}) {
  const totals = [
    ["Accepted proposal fees", usd(contracted ?? null)],
    ["Documented engagement payments", usd(summary.investmentRecords ? summary.feesPaidCents : null)],
    ["Documented incremental expenses", usd(summary.investmentRecords ? summary.expenseCents : null)],
    ["Documented client investment", usd(summary.investmentCents)],
    ["Observed revenue change", usd(summary.observedRevenueCents)],
    ["Verified attributable benefit", usd(summary.benefitRecords ? summary.verifiedBenefitCents : null)],
    ["Net financial value", usd(summary.netValueCents)], ["Cumulative financial ROI", pct(summary.roiPercent)],
  ];
  return <div className="space-y-3 text-sm">
    <p>Financial ROI uses documented payments and incremental operating expenses. It divides verified attributable benefits less investment by that same investment. This is a cash-basis view of the reviewed evidence.</p>
    {summary.roiPercent === null && <p role="status">ROI requires documented benefit evidence and positive net investment. Some periods may have incomplete records.</p>}
    <dl className="grid gap-3 sm:grid-cols-2">
      {totals.map(([label, amount]) => <div key={label}><dt className="font-medium">{label}</dt><dd>{amount}</dd></div>)}
    </dl>
    {summary.rows.length > 0 && <div className="overflow-x-auto">
      <table className="w-full text-left"><caption className="text-left font-semibold">Financial performance by month</caption>
        <thead><tr>{["Period", "Investment", "Verified benefit", "Net value", "ROI"].map(label => <th className="px-2 py-1" key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{summary.rows.map(row => <tr key={row.period} className="border-t border-canvas-border">
          <th className="px-2 py-1" scope="row">{row.period}</th><td className="px-2 py-1">{usd(row.investmentCents)}</td>
          <td className="px-2 py-1">{usd(row.benefitRecords ? row.verifiedBenefitCents : null)}</td><td className="px-2 py-1">{usd(row.netValueCents)}</td>
          <td className="px-2 py-1">{pct(row.roiPercent)}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </div>;
}
