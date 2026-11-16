import { z } from "zod";
import { nativePlatforms, recommendAutomationBots } from "./automationLibrary";
import { parseIntakeAnswers } from "./intakeAnswers";
import { isPublicHttpsUrl } from "./catalogHarvest";
import { type MarketplaceCandidate } from "./nativeMarketplaces";

const text = z.string().trim().max(12_000);
const publicLink = z.string().trim().max(2000).refine((v) => !v || isPublicHttpsUrl(v), "Use a public HTTPS listing URL.");
export const DeploymentEntry = z.object({
  id: z.string().min(1).max(160), name: z.string().trim().min(1).max(200),
  provider: z.enum(["chatgpt", "grok_bot", "claude", "unconfirmed"]),
  kind: z.enum(["workflow", "component"]), origin: z.enum(["starter", "marketplace", "custom", "tool_plan"]),
  url: publicLink, reason: text, apps: text, schedule: text, steps: text, prompt: text,
  acceptanceTest: text, pause: text, status: z.enum(["candidate", "ready", "excluded"]),
  nativeConfirmed: z.boolean(), verifiedAt: z.string().max(30), evidence: text,
  installs: z.number().int().nonnegative().nullable(), rating: z.number().min(0).max(5).nullable(),
  metricSource: publicLink, metricCheckedAt: z.string().max(40),
}).superRefine((entry, ctx) => {
  if (entry.status !== "ready") return;
  if (entry.provider === "unconfirmed" || !entry.url || !entry.nativeConfirmed || !/^\d{4}-\d{2}-\d{2}$/.test(entry.verifiedAt) || ![entry.reason, entry.apps, entry.steps, entry.acceptanceTest, entry.pause, entry.evidence].every((s) => s.trim())) {
    ctx.addIssue({ code: "custom", message: "Before ready: choose a provider, confirm native account compatibility, and record the exact listing, review date, reason, apps, steps, acceptance test, pause method and evidence." });
  }
  if (entry.verifiedAt && (Number.isNaN(Date.parse(entry.verifiedAt)) || entry.verifiedAt > new Date().toISOString().slice(0, 10))) ctx.addIssue({ code: "custom", message: "Review date must be a real date no later than today." });
});
export const DeploymentPlan = z.object({
  providerPreference: z.enum(["any", "chatgpt", "grok_bot", "claude"]),
  providerReason: text, entries: z.array(DeploymentEntry).max(100),
}).superRefine((plan, ctx) => {
  if (new Set(plan.entries.map((e) => e.id)).size !== plan.entries.length) ctx.addIssue({ code: "custom", message: "Duplicate implementation entries are not allowed." });
  if (plan.providerPreference !== "any" && plan.entries.some((e) => e.status === "ready" && e.provider !== plan.providerPreference)) ctx.addIssue({ code: "custom", message: "Ready entries must honor the selected provider. Change the preference to 'Shea decides' and explain a mixed-provider deployment if appropriate." });
  if (plan.entries.some((e) => e.status === "ready") && !plan.providerReason.trim()) ctx.addIssue({ code: "custom", message: "Record why this provider or provider mix fits the client before marking entries ready." });
});
export type ClientDeploymentPlan = z.infer<typeof DeploymentPlan>;
export type ClientDeploymentEntry = z.infer<typeof DeploymentEntry>;

export function blankDeploymentEntry(): ClientDeploymentEntry {
  return { id: "", name: "", provider: "unconfirmed", kind: "workflow", origin: "custom", url: "", reason: "", apps: "", schedule: "", steps: "", prompt: "", acceptanceTest: "", pause: "", status: "candidate", nativeConfirmed: false, verifiedAt: "", evidence: "", installs: null, rating: null, metricSource: "", metricCheckedAt: "" };
}
export function deploymentFromMarketplace(row: MarketplaceCandidate, checkedAt: string): ClientDeploymentEntry {
  const platform = nativePlatforms.find((p) => p.id === row.provider)!;
  return { ...blankDeploymentEntry(), id: row.id, name: row.name, provider: row.provider, origin: "marketplace", kind: "component", url: row.url,
    reason: row.description, steps: [`Open the exact listing: ${row.url}`, `Confirm this listing supports the customer's surface (${row.surfaces.join(", ") || "not stated; verify in account"}), plan and workspace.`, ...platform.steps].join("\n"),
    acceptanceTest: "Define one client-specific redacted example, expected output, missing-source and duplicate cases; inspect a successful scheduled run before handoff.", pause: "Confirm the native task/routine pause control in the customer's account; record who can use it and how to reconnect.", installs: row.installs, rating: row.rating, metricSource: row.installs !== null || row.rating !== null ? row.provider === "claude" ? "https://claude.com/marketplace/plugins" : "https://x.ai/bot/marketplace" : "", metricCheckedAt: checkedAt };
}
export function buildClientDeployment(answers: string | null | undefined): ClientDeploymentPlan {
  const parsed = parseIntakeAnswers(answers);
  const preferences = parsed.aiPlatforms.filter((p) => nativePlatforms.some((n) => n.id === p));
  const providerPreference = preferences.length === 1 ? preferences[0] as "chatgpt" | "grok_bot" | "claude" : "any";
  const entries = recommendAutomationBots(answers ?? null).filter((r) => r.recommended).slice(0, 6).map((r): ClientDeploymentEntry => {
    const platform = providerPreference === "any" ? undefined : nativePlatforms.find((p) => p.id === providerPreference);
    return { ...blankDeploymentEntry(), id: `starter:${r.id}`, name: r.name, provider: platform?.id ?? "unconfirmed", origin: "starter", url: platform?.home ?? "", reason: r.reasons.join(" "), apps: r.sources.join(", "), schedule: r.cadence, steps: platform?.steps.join("\n") ?? "Choose a native provider after comparing the client's required apps, account compatibility and costs.", prompt: platform ? r.setupPrompts[platform.id]! : r.instructions, acceptanceTest: r.example, pause: "Inspect the first real run, then demonstrate pausing the native schedule and reconnecting before handoff." };
  });
  return { providerPreference, providerReason: "", entries };
}

export function validateDeploymentScope(plan: ClientDeploymentPlan, tier: string): string | null {
  if (tier === "WHITE_GLOVE" && plan.entries.filter((e) => e.kind === "workflow" && e.status !== "excluded").length > 20) return "Done-for-you includes up to 20 named workflows and automations. Plugins and connectors are components, not additional workflows. Move extra workflows to excluded or agree a separate phase.";
  return null;
}
