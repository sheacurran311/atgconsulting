import type { workflowEstimateCatalog } from "../../../api-server/src/lib/workflowEstimateCatalog";
import type { SeoEvidenceInput, summarizeSeo } from "../../../api-server/src/lib/seoEvidence";
import type {
  AdvisoryInput, ChangeOrderInput, IntakeSource, SavedEstimate, SlaInput, ValueReportInput, priceEngagement, summarizeValue,
} from "../../../api-server/src/lib/engagementWorkspace";

export type { AdvisoryInput, ChangeOrderInput, IntakeSource, SavedEstimate, SeoEvidenceInput, SlaInput, ValueReportInput };
export type WorkspaceRecord = {workspace: string; version: number; status: string; period: string; createdAt: string} & (
  | {kind: "estimate"; content: SavedEstimate; calculation: ReturnType<typeof priceEngagement>}
  | {kind: "sla"; content: SlaInput}
  | {kind: "change"; content: ChangeOrderInput}
  | {kind: "advisory"; content: AdvisoryInput}
  | {kind: "seo"; content: SeoEvidenceInput; findings: ReturnType<typeof summarizeSeo>}
  | {kind: "value"; content: ValueReportInput; calculation: ReturnType<typeof summarizeValue>}
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
