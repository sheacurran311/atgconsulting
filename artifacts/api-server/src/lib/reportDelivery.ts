import { z } from "zod";
const Report = z.object({ summary: z.string(), keyFindings: z.array(z.string()), painPoints: z.array(z.string()), recommendedWorkflows: z.array(z.object({ name: z.string(), why: z.string() })), nextSteps: z.array(z.string()) });
export function reportEmailText(raw: string): string {
  const p = Report.parse(JSON.parse(raw));
  return ["Your assessment has been reviewed by ATG Consulting.", p.summary, "Findings", ...p.keyFindings.map((s) => `• ${s}`), "Priorities", ...p.painPoints.map((s) => `• ${s}`), "Suggested workflows", ...p.recommendedWorkflows.map((w) => `• ${w.name}: ${w.why}`), "Next steps", ...p.nextSteps.map((s) => `• ${s}`), "These are recommendations, not a claim that any system is installed or running. Reply to ATG to discuss your pilot. Creating an account is optional."].join("\n\n");
}
