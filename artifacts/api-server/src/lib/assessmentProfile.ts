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
const businessTasks = ["Find and research prospects", "Sales follow-ups and outreach", "Meeting notes and proposals", "Customer requests and admin", "Invoices and expense tracking", "Content and marketing"];
const personalTasks = ["School and sports schedules", "Family and sports travel", "Household tasks and reminders", "Personal email and paperwork"];
const selectionQuestions: Record<string, { text: string; options: string[]; type?: "choice" | "multiselect" }> = {
  task_frequency: { text: "How often does this work come up?", type: "choice", options: ["Several times a day", "About once a day", "A few times a week", "Weekly", "Occasionally or around events", "Not sure yet"] },
  time_per_task: { text: "About how long does one round of this work take?", type: "choice", options: ["Under 15 minutes", "15–30 minutes", "30–60 minutes", "1–2 hours", "More than 2 hours", "Not sure yet"] },
  workflow_example: { text: "What usually starts the work you want help with?", options: ["An email or message arrives", "A date or schedule changes", "A new lead or customer request arrives", "A meeting ends", "A recurring deadline or weekly review", "I remember and do it manually", "Not sure yet"] },
  business_type: { text: "Which best describes your work?", type: "choice", options: ["Sales or business development", "Professional services or consulting", "Trades, construction or home services", "Real estate", "Retail or e-commerce", "Hospitality", "Coaching or content creation"] },
  role: { text: "What is your role?", type: "choice", options: ["Owner or solo operator", "Manager or team lead", "Sales or outreach", "Operations or administration", "Employee exploring improvements"] },
  core_system: { text: "Which tools handle your business work today?", options: ["Gmail / Google Workspace", "Outlook / Microsoft 365", "CRM (such as HubSpot or Salesforce)", "Spreadsheets", "Accounting software", "Project or task management app", "Mostly manual / no formal system"] },
  sales_pipeline_stage: { text: "Where would sales help make the biggest difference?", options: ["Finding qualified prospects", "Research before outreach", "Writing personalized outreach", "Following up consistently", "Preparing proposals", "Updating the CRM", "Not sure yet"] },
  family_sources: { text: "Where do your personal or family updates arrive?", options: ["Email", "Text messages or group chats", "School or sports apps", "Shared calendar", "Paper notices", "Several places that do not sync"] },
  family_coordination: { text: "What is hardest to keep coordinated?", options: ["Schedule changes", "Conflicting events", "Pickups and rides", "Registration or payment deadlines", "Remembering tasks", "Sharing updates with the right people"] },
  travel_needs: { text: "What would make travel easier?", options: ["Itineraries in one place", "Comparing travel options", "Departure and arrival reminders", "Packing lists", "Handling schedule changes", "Coordinating a group"] },
  ai_tools_today: { text: "Which AI tools have you tried?", options: ["ChatGPT", "Claude", "Grok", "Microsoft Copilot", "Google Gemini", "None yet", "Not sure which tools I use"] },
  data_boundaries: { text: "Which boundaries should we plan around?", options: ["Keep work and family separate", "Employer approval is required", "Children's or school information", "Customer or confidential business information", "No access to financial accounts", "Help me decide during the consultation"] },
  pilot_owner: { text: "Who would review and manage the first workflow?", type: "choice", options: ["Me", "Me and my partner / household", "Me and a colleague", "A team manager", "I need help choosing an owner"] },
  success_definition: { text: "What results would matter most?", options: ["Less time on repetitive work", "Fewer missed tasks or deadlines", "More consistent follow-up", "Fewer errors or duplicate entries", "Less stress and better coordination", "A clear process I can trust"] },
};
export function assessmentOrder(answers: Answer[]): string[] {
  const audience = audienceFrom(answers);
  return ["contact_email", "contact_name", "audience", "top_problems", "task_frequency", "time_per_task", "workflow_example",
    ...(audience !== "personal" ? ["business_type", "role", "decision_authority", "core_system", "sales_pipeline_stage"] : []),
    ...(audience !== "business" ? ["family_sources", "family_coordination", "travel_needs"] : []),
    "ai_tools_today", "approval_preference", "data_boundaries", "pilot_owner", "success_definition", "budget_range", "support_preference"];
}
export function assessmentQuestions(answers: Answer[]): Question[] {
  const values = Object.fromEntries(answers.map((a) => [a.id, a.answer]));
  const audience = audienceFrom(answers);
  const priorities = values.top_problems ?? "";
  return assessmentOrder(answers).map((id): Question | undefined => {
    const base = AUDIT_MAP[id] ?? QUESTION_MAP[id];
    if (id === "top_problems") {
      const optionGroups = [
        ...(audience !== "personal" ? [{ label: "Business", options: businessTasks }] : []),
        ...(audience !== "business" ? [{ label: "Personal & household", options: personalTasks }] : []),
      ];
      return {
        ...base!, text: "What would you like help with?", type: "multiselect",
        allowOther: true, optionGroups, options: optionGroups.flatMap((group) => group.options),
      };
    }
    const selection = selectionQuestions[id];
    if (selection) return { id, category: base?.category ?? "goals", core: base?.core ?? true, ...selection, type: selection.type ?? "multiselect", allowOther: true };
    return base;
  }).filter((q): q is Question => !!q && !q.skip?.(values))
    .filter((q) => q.id !== "sales_pipeline_stage" || !priorities || /sales|prospect|outreach|follow.up|other/i.test(priorities))
    .filter((q) => q.id !== "travel_needs" || !priorities || /travel|other/i.test(priorities));
}
export const ALL_ASSESSMENT_QUESTIONS = [...QUESTION_BANK, ...AUDIT_QUESTIONS];
export const ALL_ASSESSMENT_MAP = { ...QUESTION_MAP, ...AUDIT_MAP };

/** Deterministic navigation: no model call belongs on the answer-saving path. */
export function assessmentStep(answers: Answer[], afterQuestionId?: string) {
  const questionPlan = assessmentQuestions(answers);
  const after = afterQuestionId ? questionPlan.findIndex((q) => q.id === afterQuestionId) : -1;
  const next = after >= 0
    ? questionPlan[after + 1] ?? questionPlan.find((q) => !answers.some((a) => a.id === q.id))
    : questionPlan.find((q) => !answers.some((a) => a.id === q.id));
  return { questionPlan, questions: next ? [next] : [], done: !next };
}

/** Remove answers from branches the visitor has explicitly deselected. */
export function applicableAnswers<T extends Answer>(answers: T[]): T[] {
  if (!answers.some((a) => a.id === "audience")) return answers;
  const applicable = new Set(assessmentQuestions(answers).map((q) => q.id));
  const branched = new Set(["business_type", "role", "decision_authority", "approver_name", "approver_email", "approver_role", "core_system", "sales_pipeline_stage", "family_sources", "family_coordination", "travel_needs"]);
  return answers.filter((a) => !branched.has(a.id) || applicable.has(a.id));
}
