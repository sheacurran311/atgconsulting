import { escapeHtml } from "./html";
import { summarizeValue, type ValueReportInput } from "./engagementWorkspace";
import type { sumFinancialLedger } from "./financialBenefitLedger";

export type ReviewedReportEvidence = {
  measurementVersion: number | null;
  incidents: {reference: string; version: number}[];
  finance: ReturnType<typeof sumFinancialLedger>;
};

const dollars = (value: number | null) => value === null ? "Unavailable" : (value / 100).toLocaleString("en-US", {style: "currency", currency: "USD"});
const percentage = (value: number | null) => value === null ? "Unavailable" : value.toFixed(1) + "%";

export function renderValueReport(report: ValueReportInput, revision: number, reviewed: ReviewedReportEvidence | null) {
  const section = (label: string, copy?: string) =>
    "<section><h2>" + escapeHtml(label) + "</h2><p>" + escapeHtml(copy || "No reviewed evidence recorded.") + "</p></section>";
  const totals = summarizeValue(report);
  const financial = reviewed?.finance;
  const rows = report.kpis.map(row => "<tr>" + [row.name, row.owner, row.baseline, row.projected, row.observed, row.unit,
    row.attribution, row.observationEvidence?.classification ?? "No observation evidence"]
    .map(value => "<td>" + escapeHtml(String(value ?? "Unknown")) + "</td>").join("") + "</tr>").join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ATG Consulting | Value Realization Report ${report.period}</title><style>
  body{max-width:850px;margin:2rem auto;padding:0 1rem;font:15px/1.55 system-ui,sans-serif;color:#172438}
  header{border-bottom:4px solid #1458dc} h1{margin:.25rem 0} h2{font-size:1.1rem;margin:1.25rem 0 .25rem} p{white-space:pre-wrap;margin:.1rem 0}
  table{width:100%;border-collapse:collapse} td,th{text-align:left;border:1px solid #c6d0e2;padding:.35rem;overflow-wrap:anywhere}
  .scroll{overflow-x:auto} @media print {body{max-width:none;margin:0;padding:0;font-size:10pt} h2 {break-after:avoid} tr {break-inside:avoid}}
  </style></head><body><header><p>ATG CONSULTING</p><h1>Value Realization Report</h1><p>${report.period} · Published revision ${revision}</p></header>
  ${section("Executive summary", report.summary)}
  ${section("Engagement economics", "Monthly documented benefit " + dollars(totals.realizedCashCents) + " · Monthly documented costs " +
    dollars(report.actualCostCents) + " · Monthly ROI " + percentage(totals.actualRoiPercent) +
    (financial?.investmentRecords ? "\nReviewed cash ledger through this report: " + dollars(financial.investmentCents) +
      " documented investment · " + dollars(financial.benefitRecords ? financial.verifiedBenefitCents : null) +
      " verified attributable benefit · " + percentage(financial.roiPercent) + " cumulative ROI" : ""))}
  <section><h2>Performance scorecard</h2><div class="scroll"><table><thead><tr><th>KPI</th><th>Owner</th><th>Baseline</th><th>Projected</th><th>Observed</th><th>Unit</th><th>Attribution</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p>Measured recovered capacity ${report.sections?.verifiedCapacityHours ?? "unavailable"}${report.sections?.verifiedCapacityHours != null ? " hours" : ""}.</p></section>
  ${section("Implementation activity", report.sections?.implementation)}
  ${section("Operational health", report.sections?.operationalHealth)}
  ${section("SLA performance", reviewed?.incidents.map(item => item.reference + " (review revision " + item.version + ")").join(", "))}
  ${section("Strategic roadmap", report.sections?.roadmap)}
  ${section("Recommendations", report.nextSteps)}
  ${section("Evidence and methodology", (reviewed?.measurementVersion ? "Measurement plan revision " + reviewed.measurementVersion + ".\n" : "") +
    (report.sections?.methodology ? report.sections.methodology + "\n" : "") + report.limitations)}
  </body></html>`;
}
