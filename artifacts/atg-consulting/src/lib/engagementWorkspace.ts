import type { ReviewedReportEvidence } from "../../../api-server/src/lib/valueReportDocument";
import type { SlaIncident, slaTiming } from "../../../api-server/src/lib/slaClock";
import type { FinancialEntryInput, sumFinancialLedger } from "../../../api-server/src/lib/financialBenefitLedger";
import type { forecast, kpiRegistry, readinessLevels, readinessRubric, MeasurementPlanInput, OpportunityReview, ReadinessReview } from "../../../api-server/src/lib/engagementMeasurement";
import type { opportunity, readiness } from "../../../api-server/src/lib/consultingIntelligence";
import type { workflowEstimateCatalog } from "../../../api-server/src/lib/workflowEstimateCatalog";
import type { SeoEvidenceInput, summarizeSeo } from "../../../api-server/src/lib/seoEvidence";
import type {
  AdvisoryInput, ChangeOrderInput, IntakeSource, SavedEstimate, SlaInput, ValueReportInput, priceEngagement, summarizeValue,
} from "../../../api-server/src/lib/engagementWorkspace";

export type { FinancialEntryInput, SlaIncident };
export type PublishedIncident = Pick<SlaIncident, "reference" | "title" | "severity" | "slaVersion" | "reportedAt" |
  "acknowledgedAt" | "respondedAt" | "restoredAt" | "resolvedAt" | "exceptions"> & {workspace: string; timing: ReturnType<typeof slaTiming>};
export type FinancialSummary = ReturnType<typeof sumFinancialLedger>;
export type ClientFinancialSummary = FinancialSummary & {workspace: string; contractedFeeCents: number | null};

export type { MeasurementPlanInput, OpportunityReview, ReadinessReview };
export type MeasurementConfig = {registry: typeof kpiRegistry; registryVersion: number; readinessRubric: typeof readinessRubric;
  readinessLevels: typeof readinessLevels; services: {id: string; name: string}[]};

export type { AdvisoryInput, ChangeOrderInput, IntakeSource, SavedEstimate, SeoEvidenceInput, SlaInput, ValueReportInput };
export type WorkspaceRecord = {workspace: string; version: number; status: string; period: string; createdAt: string} & (
  | {kind: "sla-incident"; content: SlaIncident}
  | {kind: "financial"; content: FinancialEntryInput}
  | {kind: "readiness"; content: ReadinessReview; calculation: ReturnType<typeof readiness>}
  | {kind: "opportunity"; content: OpportunityReview; calculation?: ReturnType<typeof opportunity>}
  | {kind: "measurement"; content: MeasurementPlanInput; calculation: ReturnType<typeof forecast> | null; definitions: typeof kpiRegistry[number][]}
  | {kind: "estimate"; content: SavedEstimate; calculation: ReturnType<typeof priceEngagement>}
  | {kind: "sla"; content: SlaInput}
  | {kind: "change"; content: ChangeOrderInput}
  | {kind: "advisory"; content: AdvisoryInput}
  | {kind: "seo"; content: SeoEvidenceInput; findings: ReturnType<typeof summarizeSeo>}
  | {kind: "value"; content: ValueReportInput; calculation: ReturnType<typeof summarizeValue>; reviewedEvidence?: ReviewedReportEvidence | null}
);
export type WorkspaceSource = {
  source: IntakeSource;
  answers: Record<string, string>;
  fitCall: Record<string, string> | null;
  proposal: {status: string; workstreams: {label: string; amount: string}[]; installments: {label: string; amount: string}[]} | null;
};

export const usd = (cents: number | null) => cents === null ? "Unavailable" :
  (cents / 100).toLocaleString("en-US", {style: "currency", currency: "USD"});

export type EstimateCatalog = typeof workflowEstimateCatalog;
