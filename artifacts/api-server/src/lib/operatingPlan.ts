import { z } from "zod";
import { answerMap } from "./intakeAnswers";
import { audienceFrom } from "./assessmentProfile";

const text = z.string().trim().max(2000);
const date = z.string().max(30).refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use YYYY-MM-DD");
export const WorkflowContractSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/).max(80), name: text.min(1), realm: z.enum(["business", "personal"]),
  owner: text.min(1), role: text, trigger: text.min(1), inputs: text, actions: text,
  approval: text.min(1), recovery: text.min(1), success: text.min(1), platform: text,
  status: z.enum(["planned", "configured", "tested", "live", "paused"]),
  evidence: text, checkedAt: date, lastSuccessAt: date,
  baselineMinutes: z.number().min(0).max(10080).nullable(), currentMinutes: z.number().min(0).max(10080).nullable(),
}).superRefine((w, ctx) => {
  if (["tested", "live"].includes(w.status) && (!w.evidence || !w.checkedAt)) ctx.addIssue({ code: "custom", path: ["evidence"], message: "Tested/live workflows need dated test evidence." });
  if (w.status === "live" && (!w.platform || !w.lastSuccessAt)) ctx.addIssue({ code: "custom", path: ["platform"], message: "Live workflows need an execution platform and last successful run date." });
});
export const OperatingPlanSchema = z.object({
  audience: z.enum(["business", "personal", "both"]), summary: text.min(1), desiredOutcome: text,
  boundaries: text, approvalPolicy: text, budget: text,
  phases: z.array(z.object({ id: text.min(1), label: text.min(1), owner: text, status: z.enum(["not_started", "in_progress", "complete"]), deliverable: text, evidence: text, dueDate: date })).min(1).max(10),
  workflows: z.array(WorkflowContractSchema).min(1).max(8),
  integrations: z.array(z.object({ name: text.min(1), purpose: text, accountOwner: text, permissions: text, status: z.enum(["not_assessed", "available", "connected", "verified", "blocked"]), evidence: text, checkedAt: date, cost: text })).max(12),
  care: z.object({ scope: text, cadence: text, responseExpectation: text, nextReview: date, monthlyCost: text, offboarding: text }),
}).superRefine((p, ctx) => {
  if (new Set(p.workflows.map((w) => w.id)).size !== p.workflows.length) ctx.addIssue({ code: "custom", path: ["workflows"], message: "Workflow IDs must be unique." });
  p.phases.forEach((phase, i) => { if (phase.status === "complete" && !phase.evidence) ctx.addIssue({ code: "custom", path: ["phases", i, "evidence"], message: "Completed stages require evidence." }); });
  p.integrations.forEach((item, i) => { if (["connected", "verified"].includes(item.status) && (!item.evidence || !item.checkedAt)) ctx.addIssue({ code: "custom", path: ["integrations", i, "evidence"], message: "Connections require dated evidence." }); });
});
export type OperatingPlanContent = z.infer<typeof OperatingPlanSchema>;

export const DELIVERY_PHASES = [
  ["audit", "Review the assessment", "Review selected examples; record frequency, baseline time, constraints, and missing information."],
  ["consult", "Map the workflow together", "Walk through a real example; agree what starts the task and what finished means."],
  ["scope", "Agree the pilot", "Prioritize one workflow by value, effort, access, and consequences of mistakes. Confirm setup and recurring costs."],
  ["build", "Install in your accounts", "Configure the customer's platform, scoped permissions, instructions, approvals, and recovery steps."],
  ["test", "Test and accept", "Test normal, duplicate, missing-data, changed-date, revoked-access, and failure scenarios. Customer signs off."],
  ["train", "Handoff and training", "Practice approving, correcting, pausing, and recovering the workflow. Deliver the operating guide."],
  ["care", "Thirty-day review and care", "Review evidence, measured time, failures, and costs; agree ongoing support before expanding."],
] as const;

function contract(id: string, name: string, realm: "personal" | "business", role: string, trigger: string, actions: string): OperatingPlanContent["workflows"][number] {
  return { id, name, realm, role, trigger, actions, owner: "Confirm with customer", inputs: "Customer-selected sources; verify access during consultation.", approval: "Draft first. Customer approves external communications, purchases, cancellations, and commitments.", recovery: "Pause on ambiguity or failed access; notify the owner; retry only after checking for duplicate actions.", success: "Complete agreed test scenarios, confirm the resulting records, and compare measured weekly effort.", platform: "", status: "planned", evidence: "", checkedAt: "", lastSuccessAt: "", baselineMinutes: null, currentMinutes: null };
}
export function buildOperatingPlan(raw: string | null | undefined): OperatingPlanContent {
  const a = answerMap(raw);
  const audience = audienceFrom(Object.entries(a).map(([id, answer]) => ({ id, answer })));
  const workflows: OperatingPlanContent["workflows"] = [];
  if (audience !== "business") workflows.push(
    contract("family-coordination", "School and sports coordination", "personal", "Schedule coordinator", "A permitted school/sports update arrives or the weekly review begins.", "Extract dates with source references, check conflicts, prepare calendar changes and deadline reminders. Keep family records separate from work."),
    contract("travel-planning", "Family and sports travel", "personal", "Travel coordinator", "An upcoming trip is confirmed or its schedule changes.", "Prepare itinerary, departure reminders, packing checklist, and options. Ask before booking, spending, or cancelling."),
  );
  if (audience !== "personal") workflows.push(
    contract("prospecting", "Prospect research and preparation", "business", "Research coordinator", "A customer-approved target list is ready.", "Research public company information, retain source links, check fit, and prepare meeting briefs. Do not invent contacts or facts."),
    contract("follow-up", "Sales follow-up and CRM handoff", "business", "Follow-up coordinator", "A meeting ends, a lead arrives, or an agreed follow-up becomes due.", "Prepare personalized follow-up, propose next steps and CRM changes, and stop pending sequences when a reply or opt-out arrives."),
  );
  return OperatingPlanSchema.parse({ audience,
    summary: a.top_problems || "Review the assessment with the customer and agree the first workflow.",
    desiredOutcome: a.success_definition || "Agree a measurable outcome during consultation.",
    boundaries: a.data_boundaries || "Keep business and family information separate. Do not store credentials or raw inbox/calendar contents in ATG.",
    approvalPolicy: a.approval_preference || "Customer approval before any external action; exact permissions agreed during consultation.",
    budget: a.budget_range || "Not stated; confirm setup, software, and care budgets separately.",
    phases: DELIVERY_PHASES.map(([id, label, deliverable]) => ({ id, label, deliverable, owner: "Shea + customer", status: "not_started", evidence: "", dueDate: "" })),
    workflows: workflows.map((w) => ({ ...w, owner: a.pilot_owner || w.owner })),
    integrations: [{ name: "Customer execution platform", purpose: "Runs authorized actions in the customer's own account; select after checking required capabilities.", accountOwner: "Customer", permissions: "Least privilege; no passwords or tokens in ATG.", status: "not_assessed", evidence: "", checkedAt: "", cost: "Confirm current subscription and usage pricing before installation." }],
    care: { scope: "Agree supported workflows, connection checks, failure recovery, and included changes in writing.", cadence: "Thirty-day pilot review; ongoing cadence agreed separately.", responseExpectation: "Confirm service hours and response targets in the engagement agreement.", nextReview: "", monthlyCost: "Separate software usage from ATG care fees; quote before activation.", offboarding: "Export the guide and configuration, transfer ownership, revoke ATG access, and confirm retention/deletion choices." },
  });
}

export function operatingPlanMarkdown(p: OperatingPlanContent): string {
  return [`# Your AI operating guide`, `Audience: ${p.audience}`, p.summary, `## Desired outcome\n${p.desiredOutcome}`, `## Boundaries\n${p.boundaries}`, `## Approvals\n${p.approvalPolicy}`, `## Budget\n${p.budget}`,
    `## Delivery milestones`, ...p.phases.map((s) => `### ${s.label} — ${s.status}\nOwner: ${s.owner}\n${s.deliverable}\nEvidence: ${s.evidence || "Not recorded"}\nDue: ${s.dueDate || "Not agreed"}`),
    `## Workflow contracts`, ...p.workflows.map((w) => `### ${w.name} (${w.realm})\nStatus: ${w.status}\nOwner: ${w.owner}\nRole: ${w.role}\nTrigger: ${w.trigger}\nInputs: ${w.inputs}\nActions: ${w.actions}\nApprovals: ${w.approval}\nRecovery: ${w.recovery}\nSuccess: ${w.success}\nPlatform: ${w.platform || "Not selected"}\nTest evidence: ${w.evidence || "Not recorded"}\nLast check: ${w.checkedAt || "Not recorded"}\nLast successful run: ${w.lastSuccessAt || "Not reported"}\nWeekly minutes before/after: ${w.baselineMinutes ?? "Not measured"} / ${w.currentMinutes ?? "Not measured"}`),
    `## Integrations`, ...p.integrations.map((i) => `### ${i.name} — ${i.status}\n${i.purpose}\nOwner: ${i.accountOwner}\nPermissions: ${i.permissions}\nEvidence: ${i.evidence || "Not recorded"}\nChecked: ${i.checkedAt || "Not recorded"}\nCost: ${i.cost}`),
    `## Care and handoff`, ...Object.entries(p.care).map(([key, value]) => `${key}: ${value || "Not agreed"}`),
    "Status and measurements are reported by the customer/operator. ATG does not monitor live inboxes or calendars. AI platforms execute only the actions explicitly authorized there.",
  ].join("\n\n");
}
