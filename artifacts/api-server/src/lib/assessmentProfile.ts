import { QUESTION_BANK, QUESTION_MAP, type Question } from "./questionBank";

export type Audience = "business" | "personal" | "both";
type Answer = { id: string; answer: string };
export function audienceFrom(answers: Answer[]): Audience {
  const value = answers.find((a) => a.id === "audience")?.answer.toLowerCase() ?? "";
  return value.includes("both") ? "both" : value.includes("personal") || value.includes("family") ? "personal" : "business";
}
export const AUDIT_QUESTIONS: Question[] = [
  { id: "audience", category: "goals", text: "Where would you like help?", type: "choice", core: true, options: ["My business", "My personal and family life", "Both business and personal life"] },
  { id: "task_frequency", category: "goals", text: "How often do your biggest time-consuming tasks happen, and roughly how long do they take each week?", type: "text", core: true },
  { id: "workflow_example", category: "goals", text: "Walk us through one recent example: what started the task, what did you do, and what counted as finished? Use a general example; leave out private messages, children's names, passwords, and customer details.", type: "text", core: true },
  { id: "approval_preference", category: "authority", text: "What would you be comfortable allowing a system to do?", type: "choice", core: true, options: ["Prepare drafts only", "Take specific actions after my approval", "Handle agreed routine actions; ask me about exceptions", "Help me decide during the consultation"] },
  { id: "data_boundaries", category: "security", text: "Which information or accounts must stay separate or off limits? For example: family vs work, employer systems, or school information.", type: "text", core: true },
  { id: "pilot_owner", category: "goals", text: "Who will review the pilot and be responsible for the system day to day? A role is enough; no contact details needed.", type: "text", core: true },
  { id: "support_preference", category: "goals", text: "What kind of help would suit you?", type: "choice", core: true, options: ["A plan and setup instructions", "Guided installation and training", "Done-for-you setup in my accounts", "Setup plus ongoing maintenance", "Not sure yet"] },
  { id: "family_sources", category: "personal", text: "Where do school, sports, household, and travel updates arrive? Name the apps or channels, not children's names or private content.", type: "text", core: true },
  { id: "family_coordination", category: "personal", text: "What gets missed or conflicts: deadlines, pickups, activity changes, travel, household tasks, or something else?", type: "text", core: true },
  { id: "travel_needs", category: "personal", text: "What help would you like with trips or sports travel? For example: itinerary, departure reminders, packing, or comparing options. Purchases stay with you.", type: "text", core: true },
];
export const AUDIT_MAP = Object.fromEntries(AUDIT_QUESTIONS.map((q) => [q.id, q]));
export function assessmentOrder(answers: Answer[]): string[] {
  const audience = audienceFrom(answers);
  return ["contact_name", "contact_email", "audience", "top_problems", "task_frequency", "workflow_example",
    ...(audience !== "personal" ? ["business_type", "role", "decision_authority", "approver_name", "approver_email", "core_system", "sales_pipeline_stage"] : []),
    ...(audience !== "business" ? ["family_sources", "family_coordination", "travel_needs"] : []),
    "ai_tools_today", "approval_preference", "data_boundaries", "pilot_owner", "success_definition", "budget_range", "support_preference"];
}
export function assessmentQuestions(answers: Answer[]): Question[] {
  const values = Object.fromEntries(answers.map((a) => [a.id, a.answer]));
  return assessmentOrder(answers).map((id) => AUDIT_MAP[id] ?? QUESTION_MAP[id]).filter((q): q is Question => !!q && !q.skip?.(values));
}
export const ALL_ASSESSMENT_QUESTIONS = [...QUESTION_BANK, ...AUDIT_QUESTIONS];
export const ALL_ASSESSMENT_MAP = { ...QUESTION_MAP, ...AUDIT_MAP };
