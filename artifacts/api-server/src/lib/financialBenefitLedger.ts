import { z } from "zod";
import { assessmentMonth, assessmentReference } from "./engagementMeasurement";

const name = z.string().trim().min(1).max(200);
const note = z.string().trim().min(1).max(1500);
const cents = z.number().int().min(-1_000_000_000).max(1_000_000_000);
const date = z.string().date();
export const financialCategories = ["engagement-payment", "operating-expense", "expense-reduction", "incremental-revenue"] as const;
export const FinancialEntry = z.object({
  reference: assessmentReference,
  title: name,
  workstream: name,
  financialPeriod: assessmentMonth,
  category: z.enum(financialCategories),
  grossCents: cents,
  incrementalCents: cents,
  incrementalCostRecord: z.string().trim().max(200),
  attributableCents: cents,
  attributionMethod: note,
  attributionConfidence: z.enum(["low", "medium", "high"]),
  comparability: note,
  sourceSystem: name,
  sourceRecord: name,
  evidenceClass: z.enum(["System verified", "Document verified"]),
  capturedOn: date,
  evidenceMethod: note,
  permissions: note,
  limitations: note,
  adjustmentReason: z.string().trim().max(1500),
}).strict().superRefine((entry, ctx) => {
  const issue = (message: string) => ctx.addIssue({code: "custom", message});
  const cost = entry.category === "engagement-payment" || entry.category === "operating-expense";
  const net = entry.grossCents - entry.incrementalCents;
  if (cost && (entry.incrementalCents !== 0 || entry.attributableCents !== entry.grossCents)) {
    issue("Record actual paid investment or expenses at their documented amount without applying an attribution rate.");
  }
  if ((entry.incrementalCents !== 0) !== !!entry.incrementalCostRecord
    || (entry.incrementalCostRecord && normalizeFinancialReference(entry.incrementalCostRecord) === normalizeFinancialReference(entry.sourceRecord))) {
    issue("Non-zero incremental revenue costs need their own distinct evidence identifier.");
  }
  if (entry.category !== "incremental-revenue" && entry.incrementalCents !== 0) {
    issue("Separate operating costs from expense savings. Use incremental costs on revenue entries only for attributable direct costs.");
  }
  if (!cost && entry.attributionConfidence === "low" && entry.attributableCents !== 0) {
    issue("Low attribution confidence can document the observation. Verified attributable amounts require reviewed supporting evidence.");
  }
  if (!cost && entry.attributableCents !== 0 &&
      (Math.sign(entry.attributableCents) !== Math.sign(net) || Math.abs(entry.attributableCents) > Math.abs(net))) {
    issue("Verified attributable amount must be within the documented net financial change and have the same sign.");
  }
});
export type FinancialEntryInput = z.infer<typeof FinancialEntry>;

export const normalizeFinancialReference = (value: string) => value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");

export function financialEvidenceReferences(entry: FinancialEntryInput) {
  return [entry.sourceRecord, entry.incrementalCostRecord].filter(Boolean).map(normalizeFinancialReference);
}

export function sumFinancialLedger(entries: FinancialEntryInput[]) {
  const latestByReference = new Map(entries.map(entry => [entry.reference, entry]));
  const periods = new Map<string, ReturnType<typeof blankTotals>>();
  const totals = blankTotals();
  for (const entry of latestByReference.values()) {
    const perPeriod = periods.get(entry.financialPeriod) ?? blankTotals();
    include(totals, entry);
    include(perPeriod, entry);
    periods.set(entry.financialPeriod, perPeriod);
  }
  return {
    rows: [...periods.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([period, totals]) => ({period, ...finish(totals)})),
    ...finish(totals),
  };
}

function blankTotals() {
  return {feesPaidCents: 0, expenseCents: 0, verifiedBenefitCents: 0, observedRevenueCents: 0,
    investmentRecords: 0, benefitRecords: 0};
}

function include(totals: ReturnType<typeof blankTotals>, entry: FinancialEntryInput) {
  if (entry.category === "engagement-payment" || entry.category === "operating-expense") {
    totals.investmentRecords++;
    if (entry.category === "engagement-payment") totals.feesPaidCents += entry.grossCents;
    else totals.expenseCents += entry.grossCents;
    return;
  }
  totals.verifiedBenefitCents += entry.attributableCents;
  if (entry.attributionConfidence !== "low") totals.benefitRecords++;
  if (entry.category === "incremental-revenue") totals.observedRevenueCents += entry.grossCents;
}

function finish(totals: ReturnType<typeof blankTotals>) {
  const investmentCents = totals.investmentRecords ? totals.feesPaidCents + totals.expenseCents : null;
  const netValueCents = investmentCents === null || !totals.benefitRecords ? null : totals.verifiedBenefitCents - investmentCents;
  return {...totals, investmentCents, netValueCents,
    roiPercent: netValueCents === null || investmentCents === null || investmentCents <= 0 ? null : netValueCents / investmentCents * 100};
}
