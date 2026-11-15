import { z } from "zod";

/**
 * Delivery is deliberately more tolerant than the edit/generate schema.
 * Older reports may not have every field, but a missing field must never
 * leak private notes or block a report that Shea already approved.
 */
const DeliveryReport = z.object({
  summary: z.string().min(1),
  keyFindings: z.array(z.string()).default([]),
  painPoints: z.array(z.string()).default([]),
  recommendedWorkflows: z.array(z.object({
    name: z.string().min(1),
    why: z.string().min(1),
  })).default([]),
  risks: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
  proposedFirstPilot: z.object({
    name: z.string().min(1),
    why: z.string().min(1),
  }).nullable().default(null),
});

/**
 * Plain-text email body for a reviewed assessment report.
 * Unknown fields are stripped by the schema, so private notes cannot leak.
 */
export function reportEmailText(raw: string): string {
  const p = DeliveryReport.parse(JSON.parse(raw));
  const pilot = p.proposedFirstPilot
    ? `• ${p.proposedFirstPilot.name}: ${p.proposedFirstPilot.why}`
    : "• No first pilot selected yet — Shea will confirm one with you.";
  const sections = [
    "Your assessment has been reviewed by ATG Consulting.",
    p.summary,
  ];
  if (p.keyFindings.length) sections.push("Findings", ...p.keyFindings.map((s) => `• ${s}`));
  if (p.painPoints.length) sections.push("Priorities", ...p.painPoints.map((s) => `• ${s}`));
  sections.push("Proposed first pilot", pilot);
  if (p.recommendedWorkflows.length) sections.push("Suggested workflows", ...p.recommendedWorkflows.map((w) => `• ${w.name}: ${w.why}`));
  if (p.risks.length) sections.push("Risks and things to confirm", ...p.risks.map((s) => `• ${s}`));
  if (p.nextSteps.length) sections.push("Next steps", ...p.nextSteps.map((s) => `• ${s}`));
  sections.push("These are recommendations, not a claim that any system is installed or running. Reply to ATG to discuss your pilot. Creating an account is optional.");
  return sections.join("\n\n");
}
