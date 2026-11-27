import { z } from "zod";
import { OpportunitySchema, ReadinessSchema } from "./consultingIntelligence";
import { transformationServices } from "./transformationServices";

const title = z.string().trim().min(1).max(200);
const note = z.string().trim().min(1).max(1500);
const optionalNote = z.string().trim().max(1500);
const date = z.string().date();
export const assessmentReference = z.string().regex(/^[A-Z0-9][A-Z0-9-]{0,26}$/);
export const assessmentMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const opportunityScoreKeys = ["impact", "roi", "feasibility", "urgency", "confidence"] as const;
export const readinessRubric = {
  infrastructure: ["Digital infrastructure", "Tools, connectivity, access controls and ownership"],
  data: ["Data readiness", "Data inventory, quality, permissions and accountable ownership"],
  process: ["Process maturity", "Repeatable steps, exceptions, volumes and measured performance"],
  adoption: ["AI adoption", "Authorized usage, repeatable use cases and oversight of outputs"],
  governance: ["Governance", "Access and data controls, human approvals, incidents and accountability"],
  team: ["Team readiness", "Assigned owners, demonstrated skills, training and change capacity"],
} as const;
export const readinessLevels = [
  "Evidence confirms the capability is absent",
  "Individuals use ad hoc practices",
  "A documented practice exists but coverage is partial",
  "Owners use a repeatable practice and record checks",
  "Evidence shows routine monitoring, review and improvement",
] as const;

export const ReadinessReview = z.object({
  period: assessmentMonth,
  title,
  scores: ReadinessSchema,
  summary: note,
  recommendations: z.array(z.object({dimension: z.enum(["infrastructure", "data", "process", "adoption", "governance", "team"]), action: note}).strict()).max(12),
}).strict();
export type ReadinessReview = z.infer<typeof ReadinessReview>;

export const OpportunityReview = z.object({
  reference: assessmentReference,
  title,
  scores: OpportunitySchema,
  validatedFacts: optionalNote,
  assumptions: optionalNote,
  missingInformation: optionalNote,
  recommendation: note,
  adjustmentReason: optionalNote,
}).strict();
export type OpportunityReview = z.infer<typeof OpportunityReview>;

type Service = (typeof transformationServices)[number]["id"];
type Unit = "score" | "count" | "%" | "minutes" | "hours" | "USD";
type Kpi = {
  id: string; serviceId: Service; name: string; unit: Unit; formula: string; direction: "increase" | "decrease";
  denominator: string; evidence: string; method: string; limitation: string; attribution: string; reporting: string;
};

function kpi(serviceId: Service, id: string, name: string, unit: Unit, direction: Kpi["direction"],
  formula: string, denominator: string, evidence: string, method: string, limitation: string, attribution: string): Kpi {
  return {id, serviceId, name, unit, direction, formula, denominator, evidence, method, limitation, attribution,
    reporting: "Use comparable periods and scope. Show the denominator, changes in collection and missing evidence."};
}

export const kpiRegistryVersion = 1;
export const kpiRegistry = [
  kpi("ai-readiness", "readiness-score", "Readiness score", "score", "increase", "Sum the six approved scores ÷ 24 × 100", "Six known dimensions", "Approved assessment", "Repeat the same rubric with period-specific evidence.", "Unknown dimensions leave the overall score unavailable.", "Record changes in evidence coverage and ownership."),
  kpi("ai-readiness", "capability-gaps-resolved", "Capability gaps resolved", "count", "increase", "Count resolved baseline gaps", "Baseline gap register", "Assessment remediation log", "Count unique gaps with reviewed acceptance evidence.", "A narrower review can hide open gaps.", "Link each closure to a specific intervention."),
  kpi("workflow-engineering", "processing-time", "Processing time per completed case", "minutes", "decrease", "Processing minutes ÷ completed cases", "Comparable completed cases", "Time study or workflow log", "Use the same start, end and case mix for both periods.", "Complex cases and queue time can change the average.", "Control for workload mix and staffing."),
  kpi("workflow-engineering", "workflow-error-rate", "Workflow error rate", "%", "decrease", "Cases with defects ÷ checked cases × 100", "Checked cases", "QA record", "Apply the same defect rubric to comparable samples.", "Unreported errors or inconsistent sampling bias the result.", "Track parallel process and staffing changes."),
  kpi("workflow-engineering", "capacity-recovered", "Recovered employee capacity", "hours", "increase", "(Baseline minutes per case − measured minutes per case) × comparable volume ÷ 60", "Comparable cases", "Time study and completed volume", "Exclude work displaced to another employee and include review effort.", "Capacity is an operational measure.", "Document redeployment and any separately verified expense change."),
  kpi("context-engineering", "context-accuracy", "Accurate outputs", "%", "increase", "Correct outputs ÷ reviewed outputs × 100", "Reviewed outputs", "Labeled evaluation set", "Apply a frozen scoring rubric and review comparable outputs.", "The sample describes the tested tasks.", "Record model, prompt and retrieval changes separately."),
  kpi("context-engineering", "correction-rate", "Output correction rate", "%", "decrease", "Outputs requiring correction ÷ reviewed outputs × 100", "Reviewed outputs", "Reviewed output log", "Count material corrections once per output.", "Different reviewers can apply different standards.", "Keep reviewer criteria and task mix stable."),
  kpi("agentic-automation", "agent-completion", "Successful agent task completion", "%", "increase", "Accepted completed runs ÷ attempted runs × 100", "Attempted runs", "Run ledger and acceptance log", "Group retries under one task and verify the intended result.", "A successful run may still require significant review.", "Distinguish tool failures from workflow errors."),
  kpi("agentic-automation", "agent-intervention", "Human intervention rate", "%", "decrease", "Runs needing unplanned intervention ÷ attempted runs × 100", "Attempted runs", "Run and exception logs", "Separate mandatory approvals from unplanned interventions.", "Bypassed logging understates intervention.", "Track changes in safeguards and task mix."),
  kpi("custom-tools", "tool-adoption", "Active use among eligible users", "%", "increase", "Active eligible users ÷ eligible users × 100", "Eligible users", "Application usage aggregates", "Define an active event and report one count per user.", "Usage alone has limited evidence of productivity.", "Record onboarding dates and user eligibility changes."),
  kpi("custom-tools", "retired-software-cost", "Retired software expenses", "USD", "decrease", "Expense for replaced subscriptions in a comparable period", "Comparable billing period", "Invoices or cancellation confirmation", "Verify billing end dates and deduct replacement costs separately.", "Cancellation alone may leave charges through the term.", "Only count confirmed, attributable changes."),
  kpi("digital-transformation", "qualified-leads", "Qualified inquiries", "count", "increase", "Count distinct inquiries satisfying agreed qualification criteria", "Comparable inbound period", "CRM or validated inquiry records", "Deduplicate and apply stable qualification criteria.", "Lead quality and missing tracking vary by channel.", "Document advertising, pricing, referrals and seasonality."),
  kpi("digital-transformation", "inquiry-conversion", "Inquiry completion rate", "%", "increase", "Qualified completions ÷ eligible visits × 100", "Eligible visits", "Authorized analytics and client inquiry records", "Compare the same traffic segment and conversion definition.", "Consent, missing tracking and offline calls affect visibility.", "Separate changes in channel mix and advertising."),
  kpi("digital-transformation", "search-clicks", "Organic Google Search clicks", "count", "increase", "Count Search Console clicks for selected pages", "Comparable page set and date range", "Google Search Console export", "Use the same property, filters and finalized dates.", "Clicks and GA4 sessions have distinct collection methods.", "Account for branded demand, seasonality and ranking changes."),
  kpi("knowledge-management", "retrieval-time", "Time to retrieve an accepted answer", "minutes", "decrease", "Retrieval minutes ÷ accepted retrieval tasks", "Comparable retrieval tasks", "Controlled task sample", "Verify answers and record lookup and review time.", "Question complexity can change results.", "Use a stable task set and document content changes."),
  kpi("knowledge-management", "knowledge-freshness", "Current knowledge records", "%", "increase", "In-scope current records ÷ checked records × 100", "Checked records", "Content ownership and review register", "Apply the agreed age and review criteria.", "Coverage depends on the inventory and sample.", "Distinguish cleanup from ongoing ownership."),
  kpi("ai-governance", "governance-coverage", "Implemented control coverage", "%", "increase", "Evidenced controls ÷ applicable controls × 100", "Applicable controls", "Control register", "Require accepted evidence for each applicable control.", "A control's presence alone does not prove effectiveness.", "Retain changes to the scope of controls."),
  kpi("ai-governance", "unresolved-risks", "Open material risks", "count", "decrease", "Count unresolved risks above the agreed severity threshold", "Scoped risk register", "Risk and incident log", "Check closure evidence and use stable severity rules.", "Better discovery can raise the count.", "Separate new findings from resolved baseline items."),
  kpi("ai-training", "training-competency", "Demonstrated competency", "%", "increase", "Participants passing a practical task ÷ evaluated participants × 100", "Evaluated participants", "Reviewed skills evaluation", "Use a consistent task and acceptance rubric.", "Attendance and practical competency measure different outcomes.", "Account for experience and evaluation participation."),
  kpi("ai-training", "employee-adoption", "Employee adoption", "%", "increase", "Employees using the approved workflow ÷ eligible employees × 100", "Eligible employees", "Usage aggregates or reviewed observation", "Define a meaningful use event and eligible roles.", "Self-reported usage has a distinct evidence grade.", "Separate training from changes in mandates and tools."),
  kpi("voice-ai", "voice-answered", "Inbound calls answered", "%", "increase", "Answered eligible calls ÷ eligible inbound calls × 100", "Eligible inbound calls", "Authorized aggregate telephony logs", "Use a stable call scope and exclude duplicate events.", "An answered call can still require escalation.", "Compare staffing, hours and seasonality."),
  kpi("voice-ai", "voice-escalation", "Correct inbound escalation", "%", "increase", "Correctly escalated sampled calls ÷ sampled calls requiring escalation × 100", "Sampled calls requiring escalation", "Authorized redacted disposition review", "Use the same escalation rules and evidence permissions.", "Unobserved issues can bias the sample.", "Record routing and escalation policy changes."),
  kpi("performance-monitoring", "reliable-runs", "Successful monitored runs", "%", "increase", "Successful scheduled runs ÷ expected runs × 100", "Expected runs", "Authorized monitoring aggregates", "Include missing, failed and retried runs by expected execution.", "Missing telemetry reduces confidence.", "Separate upstream incidents and scope changes."),
  kpi("performance-monitoring", "restore-time", "Covered restoration time", "minutes", "decrease", "Covered restoration minutes ÷ restored incidents", "Comparable restored incidents", "Reviewed incident ledger", "Use the executed SLA clock and report exclusions.", "Unresolved incidents need separate disclosure.", "Segment by severity and dependency."),
  kpi("fractional-ai-leadership", "roadmap-delivery", "Roadmap milestones met", "%", "increase", "Accepted due milestones ÷ milestones due × 100", "Milestones due under the reviewed roadmap", "Roadmap and acceptance log", "Use the version approved at the start of the period.", "Replanning can change the denominator.", "Link consultant decisions and client dependencies."),
  kpi("fractional-ai-leadership", "decisions-implemented", "Strategic decisions implemented", "count", "increase", "Count distinct approved decisions with implementation evidence", "Scoped decision register", "Executive decision and delivery logs", "Trace decisions to accepted implementation or policy change.", "Counts do not capture business impact by themselves.", "Record the decision owner and linked outcome."),
] as const;

const cents = z.number().int().nonnegative().max(1_000_000_000);
const pct = z.number().min(0).max(100);
const scenario = z.object({
  reductionPercent: pct, adoptionPercent: pct, effectivenessPercent: pct, realizablePercent: pct,
  incrementalMonthlyRevenueCents: cents, contributionMarginPercent: pct, attributionPercent: pct,
  rampMonths: z.number().int().min(0).max(60),
}).strict();
export const ForecastInput = z.object({
  monthlyWorkload: z.number().nonnegative().max(1_000_000).nullable(),
  minutesPerUnit: z.number().nonnegative().max(1440).nullable(),
  hourlyCostCents: cents.nullable(),
  implementationFeeCents: cents, recurringFeeCents: cents, monthlyExpenseCents: cents,
  months: z.number().int().min(1).max(60),
  conservative: scenario, expected: scenario, optimistic: scenario,
}).strict();
export const forecastScenarios = ["conservative", "expected", "optimistic"] as const;

export function forecast(input: z.infer<typeof ForecastInput>) {
  return Object.fromEntries(forecastScenarios.map(key => {
    const assumptions = input[key];
    const capacityHours = input.monthlyWorkload === null || input.minutesPerUnit === null ? null
      : input.monthlyWorkload * input.minutesPerUnit / 60 * assumptions.reductionPercent / 100
      * assumptions.adoptionPercent / 100 * assumptions.effectivenessPercent / 100;
    const capacityValueCents = capacityHours === null || input.hourlyCostCents === null ? null : Math.round(capacityHours * input.hourlyCostCents);
    const realizableLaborCents = assumptions.realizablePercent === 0 ? 0
      : capacityValueCents === null ? null : Math.round(capacityValueCents * assumptions.realizablePercent / 100);
    const attributableProfitCents = Math.round(assumptions.incrementalMonthlyRevenueCents * assumptions.contributionMarginPercent / 100 * assumptions.attributionPercent / 100);
    const monthlyBenefitCents = realizableLaborCents === null ? null : realizableLaborCents + attributableProfitCents;
    const recurringCents = input.recurringFeeCents + input.monthlyExpenseCents;
    const investmentCents = input.implementationFeeCents + recurringCents * input.months;
    let cumulativeNetCents: number | null = monthlyBenefitCents === null ? null : -input.implementationFeeCents;
    let paybackMonth: number | null = null;
    for (let month = 1; month <= input.months && cumulativeNetCents !== null && monthlyBenefitCents !== null; month++) {
      const ramp = assumptions.rampMonths === 0 ? 1 : Math.min(1, month / assumptions.rampMonths);
      cumulativeNetCents += Math.round(monthlyBenefitCents * ramp) - recurringCents;
      if (paybackMonth === null && cumulativeNetCents >= 0
        && monthlyBenefitCents > recurringCents && investmentCents > 0) paybackMonth = month;
    }
    return [key, {
      capacityHours, capacityValueCents, monthlyBenefitCents, investmentCents, attributableProfitCents,
      monthlyNetCents: monthlyBenefitCents === null ? null : monthlyBenefitCents - recurringCents,
      cumulativeNetCents, paybackMonth,
      roiPercent: cumulativeNetCents === null || investmentCents === 0 ? null : cumulativeNetCents / investmentCents * 100,
    }] as const;
  })) as Record<(typeof forecastScenarios)[number], {
    capacityHours: number | null; capacityValueCents: number | null; monthlyBenefitCents: number | null;
    investmentCents: number; attributableProfitCents: number; monthlyNetCents: number | null;
    cumulativeNetCents: number | null; paybackMonth: number | null; roiPercent: number | null;
  }>;
}

export const evidenceClasses = ["System verified", "Document verified", "Client reported", "Estimated", "Not yet measurable"] as const;
const metric = z.object({
  kpiId: z.string().refine(id => kpiRegistry.some(entry => entry.id === id)),
  workstream: title, owner: title, source: title, evidence: note, comparableWorkload: note,
  baseline: z.number().finite().min(-1e12).max(1e12).nullable(),
  target: z.number().finite().min(-1e12).max(1e12).nullable(),
  baselineStart: date, baselineEnd: date, collectionPlan: optionalNote,
  evidenceClass: z.enum(evidenceClasses), attribution: note, limitations: note, dependencies: optionalNote,
}).strict().superRefine((value, ctx) => {
  const issue = (message: string) => ctx.addIssue({code: "custom", message});
  if (value.baselineEnd < value.baselineStart) issue("Enter a valid baseline period.");
  if (value.baseline === null && !value.collectionPlan) issue("Record how the unknown baseline will be collected.");
  if (value.baseline !== null && value.evidenceClass === "Not yet measurable") issue("A stated baseline needs an evidence classification.");
  const definition = kpiRegistry.find(entry => entry.id === value.kpiId);
  if ((definition?.unit === "%" || definition?.unit === "score")
    && [value.baseline, value.target].some(number => number !== null && (number < 0 || number > 100))) {
    issue("Percentages and normalized scores must be between 0 and 100.");
  }
});
export const MeasurementPlan = z.object({
  title, objectives: note, cadence: title, evaluationOn: date,
  registryVersion: z.literal(kpiRegistryVersion), calculationVersion: z.literal(1),
  metrics: z.array(metric).min(1).max(20),
  forecast: ForecastInput.nullable(),
}).strict().superRefine((plan, ctx) => {
  const identities = new Set(plan.metrics.map(row => JSON.stringify([row.kpiId, row.workstream.trim().toLowerCase()])));
  if (identities.size !== plan.metrics.length) ctx.addIssue({code: "custom", message: "Select a KPI only once per workstream."});
  if (plan.metrics.some(row => row.baselineEnd > plan.evaluationOn)) {
    ctx.addIssue({code: "custom", message: "Schedule the first evaluation after the baseline period."});
  }
});
export type MeasurementPlanInput = z.infer<typeof MeasurementPlan>;
