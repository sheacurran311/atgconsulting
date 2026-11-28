import { SlaCalendar, validTimezone } from "./slaClock";
import { workflowEstimateCatalog, workflowEstimateCatalogVersion } from "./workflowEstimateCatalog";
import { z } from "zod";
import { estimate } from "./consultingIntelligence";
import { quoteSchema } from "./customQuote";
import { transformationServices } from "./transformationServices";

const text = z.string().trim().min(1).max(2000);
const name = z.string().trim().min(1).max(200);
const money = z.number().int().nonnegative().max(99_999_999);
const hourly = money.min(10_000);
const hours = z.number().nonnegative().max(1000);
const percentage = z.number().min(0).max(100);
const serviceId = z.string().refine(id => transformationServices.some(service => service.id === id));
export const reportPeriod = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const date = z.string().date();
export const estimateFormula = 1;
const workstream = z.object({
  catalog: z.object({id: z.string().refine(id => workflowEstimateCatalog.some(entry => entry.id === id)),
    version: z.literal(workflowEstimateCatalogVersion), sizing: z.enum(["low", "high"]),
  }).strict().optional(),
  label: name, serviceId: serviceId.nullable(), quantity: z.number().int().min(1).max(100),
  complexity: z.enum(["small", "medium", "large", "custom"]),
  discovery: hours, implementation: hours, testing: hours, documentation: hours, training: hours,
  advisory: hours, support: hours, monitoring: hours,
  setupDirectCents: money, monthlyDirectCents: money,
  setupFeeCents: money.nullable(), monthlyFeeCents: money.nullable(),
}).strict();

export const EstimateInput = z.object({
  label: name, engagement: z.enum(["project", "monthly"]),
  months: z.number().int().min(1).max(60),
  internalHourlyCents: money, additionalHourlyCents: hourly,
  contingencyPercent: percentage, marginPercent: percentage.max(90),
  sharedSetupCents: money, sharedMonthlyCents: money, monthlyReserveCents: money,
  slaCoverage: z.string().trim().max(1000),
  workstreams: z.array(workstream).min(1).max(12),
}).strict().superRefine((input, ctx) => {
  if (input.engagement === "project" && (input.sharedMonthlyCents || input.monthlyReserveCents ||
    input.workstreams.some(row => row.advisory || row.support || row.monitoring || row.monthlyDirectCents || row.monthlyFeeCents))) {
    ctx.addIssue({code: "custom", message: "Recurring hours and costs require a monthly engagement."});
  }
});

export type EstimateInput = z.infer<typeof EstimateInput>;

export function priceEngagement(input: EstimateInput) {
  const rows = input.workstreams.map(row => {
    const base = estimate({
      implementationHours: row.discovery + row.implementation + row.documentation,
      testingHours: row.testing, trainingHours: row.training, advisoryHours: row.advisory,
      supportHours: row.support, monitoringHours: row.monitoring,
      internalHourlyCents: input.internalHourlyCents,
      setupDirectCents: row.setupDirectCents, monthlyDirectCents: row.monthlyDirectCents, monthlyReserveCents: 0,
      contingencyPercent: input.contingencyPercent, marginPercent: input.marginPercent,
    });
    return {
      label: row.label, quantity: row.quantity,
      setupHours: base.setupHours * row.quantity, monthlyHours: base.monthlyHours * row.quantity,
      setupCostCents: base.setupCostCents * row.quantity, monthlyCostCents: base.monthlyCostCents * row.quantity,
      indicativeSetupCents: base.indicativeSetupCents * row.quantity, indicativeMonthlyCents: base.indicativeMonthlyCents * row.quantity,
      setupFeeCents: (row.setupFeeCents ?? base.indicativeSetupCents) * row.quantity,
      monthlyFeeCents: (row.monthlyFeeCents ?? base.indicativeMonthlyCents) * row.quantity,
    };
  });
  const shared = estimate({
    implementationHours: 0, testingHours: 0, trainingHours: 0, advisoryHours: 0, supportHours: 0, monitoringHours: 0,
    internalHourlyCents: 0, setupDirectCents: input.sharedSetupCents,
    monthlyDirectCents: input.sharedMonthlyCents, monthlyReserveCents: input.monthlyReserveCents,
    contingencyPercent: input.contingencyPercent, marginPercent: input.marginPercent,
  });
  const setupCostCents = rows.reduce((sum, row) => sum + row.setupCostCents, shared.setupCostCents);
  const monthlyCostCents = rows.reduce((sum, row) => sum + row.monthlyCostCents, shared.monthlyCostCents);
  const setupFeeCents = rows.reduce((sum, row) => sum + row.setupFeeCents, shared.indicativeSetupCents);
  const monthlyFeeCents = rows.reduce((sum, row) => sum + row.monthlyFeeCents, shared.indicativeMonthlyCents);
  const setupHours = rows.reduce((sum, row) => sum + row.setupHours, 0);
  const monthlyHours = rows.reduce((sum, row) => sum + row.monthlyHours, 0);
  const termMonths = input.engagement === "monthly" ? input.months : 0;
  function economics(fee: number, cost: number, includedHours: number) {
    return {
      feeCents: fee, costCents: cost, includedHours,
      contributionCents: fee - cost,
      marginPercent: fee > 0 ? (fee - cost) / fee * 100 : null,
      effectiveHourlyCents: includedHours > 0 ? Math.round(fee / includedHours) : null,
    };
  }
  return {
    rows, shared, termMonths, formulaVersion: estimateFormula,
    setup: economics(setupFeeCents, setupCostCents, setupHours),
    monthly: economics(monthlyFeeCents, monthlyCostCents, monthlyHours),
    term: economics(setupFeeCents + termMonths * monthlyFeeCents, setupCostCents + termMonths * monthlyCostCents, setupHours + termMonths * monthlyHours),
    firstYear: economics(setupFeeCents + (termMonths ? 12 : 0) * monthlyFeeCents, setupCostCents + (termMonths ? 12 : 0) * monthlyCostCents, setupHours + (termMonths ? 12 : 0) * monthlyHours),
  };
}

export function quoteFromEstimate(input: EstimateInput, installments: unknown) {
  const {rows, shared, termMonths} = priceEngagement(input);
  const workstreams = rows.map(row => ({label: row.label, fee: row.setupFeeCents + termMonths * row.monthlyFeeCents}));
  workstreams.push({label: "Shared engagement expenses and reserve", fee: shared.indicativeSetupCents + termMonths * shared.indicativeMonthlyCents});
  return quoteSchema.safeParse({
    workstreams: workstreams.filter(row => row.fee > 0).map(row => ({label: row.label, amount: (row.fee / 100).toFixed(2)})),
    installments,
  });
}

const severity = z.object({
  definition: name, response: name, updates: name, restoration: name,
}).strict();
export const SlaInput = z.object({
  title: name, atgParty: name, clientParty: name, contractReference: name, effectiveDate: date, term: text,
  scope: text, deliverables: text, exclusions: text, dependencies: text,
  timezone: name, coverage: text, channels: text, calendar: SlaCalendar.optional(), severity: z.object({P1:severity, P2:severity, P3:severity, P4:severity}).strict(),
  measurementClock: text, availabilityAndMaintenance: text, governance: text, responsibilities: text,
  reporting: text, commercialTerms: text, includedHours: hours, additionalHourlyCents: hourly,
  changeAuthorization: text, escalation: text, terminationAndHandoff: text,
}).strict().refine(sla => !sla.calendar || validTimezone(sla.timezone), "Use an IANA time zone such as America/Denver for structured coverage.");
export type SlaInput = z.infer<typeof SlaInput>;

const evidence = z.object({
  classification: z.enum(["system export", "financial record", "controlled sample", "client confirmation", "estimate"]),
  reference: name, capturedOn: date, method: text,
}).strict();

const kpi = z.object({
  name, unit: z.enum(["hours", "count", "percent", "USD", "minutes"]), direction: z.enum(["increase", "decrease"]),
  owner: name, baseline: z.number().finite().nonnegative().max(1e9).nullable(), baselineStart: date, baselineEnd: date,
  projected: z.number().finite().nonnegative().max(1e9).nullable(), observed: z.number().finite().nonnegative().max(1e9).nullable(),
  observationStart: date, observationEnd: date, baselineEvidence: evidence.nullable(), observationEvidence: evidence.nullable(),
  attribution: z.enum(["unassessed", "low", "medium", "high"]), dependencies: text,
  comparable: z.boolean(),
}).strict().superRefine((metric, ctx) => {
  const days = (start: string, end: string) => Date.parse(end) - Date.parse(start);
  const baseline = days(metric.baselineStart, metric.baselineEnd);
  const observed = days(metric.observationStart, metric.observationEnd);
  function issue(message: string) { ctx.addIssue({code: "custom", message}); }
  if (baseline < 0 || observed < 0 || metric.baselineEnd >= metric.observationStart) issue("Enter valid, non-overlapping baseline and observation periods.");
  if (metric.baseline !== null && !metric.baselineEvidence) issue("Baseline values require a source.");
  if (metric.observed !== null && (!metric.observationEvidence || metric.observationEvidence.classification === "estimate")) issue("Observed values require observed evidence.");
  if (metric.comparable && (baseline !== observed || metric.baseline === null || metric.observed === null ||
    metric.baselineEvidence?.classification === "estimate")) issue("Comparable measurements require evidenced values and equal periods.");
  if (metric.unit === "percent" && [metric.baseline, metric.projected, metric.observed].some(value => value !== null && value > 100)) issue("Percentage KPI values must be between 0 and 100.");
});

export const ValueReportInput = z.object({
  period: reportPeriod, summary: text, nextSteps: text, limitations: text,
  sections: z.object({
    implementation: text, operationalHealth: text, roadmap: text, methodology: text,
    verifiedCapacityHours: hours.nullable(), capacityEvidence: evidence.nullable(),
  }).strict().optional(),
  kpis: z.array(kpi).min(1).max(20),
  projectedCapacityHours: hours.nullable(), projectedCashCents: money.nullable(),
  realized: z.array(z.object({
    label: name, amountCents: money.positive(), evidence: evidence.extend({classification: z.literal("financial record")}),
  }).strict()).max(20),
  actualCostCents: money.nullable(), actualCostEvidence: evidence.extend({classification: z.literal("financial record")}).nullable(),
}).strict().superRefine((report, ctx) => {
  const unique = new Set(report.realized.map(item => item.evidence.reference.toLowerCase()));
  if (unique.size !== report.realized.length) ctx.addIssue({code: "custom", message: "Each financial record can only be counted once."});
  if (report.actualCostCents !== null && !report.actualCostEvidence) ctx.addIssue({code: "custom", message: "Actual costs require a financial record."});
  if (report.sections?.verifiedCapacityHours !== undefined && report.sections.verifiedCapacityHours !== null &&
      (!report.sections.capacityEvidence || report.sections.capacityEvidence.classification === "estimate")) {
    ctx.addIssue({code: "custom", message: "Measured recovered capacity requires non-estimated evidence."});
  }
  if (report.kpis.some(metric => !metric.observationStart.startsWith(report.period) || !metric.observationEnd.startsWith(report.period))) {
    ctx.addIssue({code: "custom", message: "Observation dates must fall in the report month."});
  }
});
export type ValueReportInput = z.infer<typeof ValueReportInput>;

export function summarizeValue(report: ValueReportInput) {
  const realizedCashCents = report.realized.length > 0 ? report.realized.reduce((sum, item) => sum + item.amountCents, 0) : null;
  const netCashCents = realizedCashCents !== null && report.actualCostCents !== null ? realizedCashCents - report.actualCostCents : null;
  return {
    realizedCashCents, netCashCents,
    actualRoiPercent: netCashCents !== null && report.actualCostCents ? netCashCents / report.actualCostCents * 100 : null,
    observedChanges: report.kpis.map(metric => metric.comparable && metric.baseline !== null && metric.observed !== null
      ? metric.observed - metric.baseline : null),
  };
}

export const AdvisoryInput = z.object({
  title: name, objectives: text, meetingCadence: name, decisionOwner: name, scope: text, exclusions: text,
  includedHours: hours, hoursUsed: hours, period: reportPeriod, nextReview: date,
  roadmap: z.array(z.object({item: name, owner: name, due: date, status: z.enum(["planned", "in progress", "done", "blocked"])}).strict()).max(25),
  decisions: z.array(z.object({date, decision: text, owner: name}).strict()).max(25),
  vendors: z.array(z.object({name, purpose: name, owner: name, reviewDate: date}).strict()).max(25),
}).strict();
export type AdvisoryInput = z.infer<typeof AdvisoryInput>;

export const IntakeSource = z.object({
  intakeId: z.string(), engagementId: z.string().nullable(), updatedAt: z.string(),
  fitCall: z.object({id: z.string(), revision: z.number().int()}).nullable(),
  proposal: z.object({id: z.string(), updatedAt: z.string()}).nullable(),
}).strict();
export type IntakeSource = z.infer<typeof IntakeSource>;
const FieldProvenance = z.object({
  origin: z.enum(["intake", "fit-call", "catalog", "proposal", "sla", "manual", "ai"]),
  reference: name.optional(), revision: name.optional(), recordedAt: z.string().datetime().optional(),
  note: z.string().trim().max(500).optional(), reviewed: z.boolean().optional(),
  rawValue: z.string().max(500).optional(), rawUnit: z.string().trim().max(60).optional(),
}).strict();
export type FieldProvenance = z.infer<typeof FieldProvenance>;

export const SavedEstimate = z.object({
  input: EstimateInput, source: IntakeSource.nullable(), formulaVersion: z.literal(estimateFormula),
  provenance: z.record(z.string().max(100), FieldProvenance).optional(),
}).strict();

export type SavedEstimate = z.infer<typeof SavedEstimate>;

export function estimateFieldValues(input: EstimateInput) {
  const {workstreams, ...general} = input;
  return new Map<string, unknown>([
    ...Object.entries(general),
    ...workstreams.flatMap((row, index) => Object.entries(row).filter(([key]) => key !== "catalog")
      .map(([key, value]) => ["workstreams." + index + "." + key, value] as const)),
  ]);
}

export function reviewedEstimateProvenance(saved: SavedEstimate, now: string) {
  const fields = estimateFieldValues(saved.input);
  const origins = saved.provenance ?? {};
  const unknownFields = Object.keys(origins).filter(key => !fields.has(key));
  const provenance = Object.fromEntries([...fields.keys()].map(key => [key, {
    ...(origins[key] ?? {origin: "manual"}), recordedAt: origins[key]?.recordedAt ?? now,
  }]));
  return {provenance, unknownFields};
}

export const changeReference = z.string().trim().regex(/^CO-[A-Z0-9-]{1,24}$/);
export const ChangeOrderInput = z.object({
  reference: changeReference, title: name, scope: text, reason: text,
  timeline: text, acceptance: text, includedHours: hours,
  additionalHourlyCents: hourly, additionalFeeCents: money, commercialTerms: text,
}).strict().superRefine((input, ctx) => {
  if (input.additionalFeeCents < Math.ceil(input.includedHours * input.additionalHourlyCents)) {
    ctx.addIssue({code: "custom", message: "The additional-work fee must cover the agreed hours at the recorded hourly rate."});
  }
});
export type ChangeOrderInput = z.infer<typeof ChangeOrderInput>;
