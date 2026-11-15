/**
 * Shared report-draft shape.
 *
 * Reports are stored as JSON on DiscoveryIntake.reportDraft. Older drafts do
 * not have proposedFirstPilot, so the schema supplies null when it is missing.
 * Nothing here invents a pilot or a recommendation.
 */
import { z } from "zod";

export const ReportWorkflowSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  why: z.string().trim().min(1).max(2000),
});

export const ReportDraftSchema = z.object({
  summary: z.string().trim().min(1).max(4000),
  keyFindings: z.array(z.string().trim().min(1).max(2000)).max(50),
  painPoints: z.array(z.string().trim().min(1).max(2000)).max(50),
  recommendedWorkflows: z.array(ReportWorkflowSchema).max(50),
  suggestedTier: z.enum(["SELF_SERVE", "GUIDED", "WHITE_GLOVE"]),
  tierRationale: z.string().trim().min(1).max(2000),
  proposalScope: z.string().trim().min(1).max(4000),
  discoveryQuestions: z.array(z.string().trim().min(1).max(2000)).max(50),
  risks: z.array(z.string().trim().min(1).max(2000)).max(50),
  nextSteps: z.array(z.string().trim().min(1).max(2000)).max(50),
  proposedFirstPilot: ReportWorkflowSchema.nullable().default(null),
});

export type ReportDraft = z.infer<typeof ReportDraftSchema>;
export type ReportWorkflow = z.infer<typeof ReportWorkflowSchema>;
