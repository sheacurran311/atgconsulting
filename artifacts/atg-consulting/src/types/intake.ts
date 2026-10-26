// Shared types for the intake form, API route, and response components.

export type Area = "executive_assistant" | "marketing" | "sales" | "customer_support";

export const AREA_LABELS: Record<Area, string> = {
  executive_assistant: "Executive assistant",
  marketing: "Marketing",
  sales: "Sales",
  customer_support: "Customer support",
};

export const AREA_DESCRIPTIONS: Record<Area, string> = {
  executive_assistant: "Inbox, calendar, scheduling, travel, meeting notes, personal logistics",
  marketing: "Content, social, email campaigns, SEO, research",
  sales: "Prospecting, outreach, follow-ups, proposals, CRM",
  customer_support: "Ticket triage, reply drafting, FAQ docs, feedback summaries",
};

// All possible time-sink keys
export type TimeSink =
  | "email"
  | "prospecting"
  | "followups"
  | "research"
  | "proposals"
  | "scheduling"
  | "social_content"
  | "admin"
  | "personal_logistics";

export const TIME_SINK_LABELS: Record<TimeSink, string> = {
  email: "Email",
  prospecting: "Prospecting / finding leads",
  followups: "Follow-ups",
  research: "Research",
  proposals: "Proposals / quotes",
  scheduling: "Scheduling",
  social_content: "Social / content",
  admin: "Admin / bookkeeping",
  personal_logistics: "Personal / family logistics",
};

// Which time-sinks are shown for each area
export const AREA_TIME_SINKS: Record<Area, TimeSink[]> = {
  executive_assistant: ["email", "scheduling", "admin", "personal_logistics"],
  marketing: ["social_content", "research", "email", "proposals"],
  sales: ["prospecting", "followups", "research", "proposals", "email"],
  customer_support: ["email", "followups", "research"],
};

export type Tool =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "grok"
  | "copilot"
  | "zapier_make"
  | "crm"
  | "none"
  | "other";

export const TOOL_LABELS: Record<Tool, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  grok: "Grok",
  copilot: "Copilot",
  zapier_make: "Zapier / Make",
  crm: "CRM",
  none: "None yet",
  other: "Other",
};

export const AI_COMFORT_LABELS = [
  "Never used AI tools",
  "Asks ChatGPT questions occasionally",
  "Uses AI weekly for work",
  "Has built a few automations",
  "Runs agents daily",
] as const;

export type BizSize = "solo" | "2-10" | "11-50" | "50+";
export const BIZ_SIZE_LABELS: Record<BizSize, string> = {
  solo: "Solo",
  "2-10": "2–10",
  "11-50": "11–50",
  "50+": "50+",
};

export type PreferredHelp = "self_serve" | "guided" | "done_for_you" | "not_sure";
export const PREFERRED_HELP_LABELS: Record<PreferredHelp, string> = {
  self_serve: "Self-serve",
  guided: "Guided",
  done_for_you: "Done for you",
  not_sure: "Not sure yet",
};

// The shape of a form submission (matches the Zod schema in the API route)
export interface IntakeFormData {
  // Step 1
  name: string;
  email: string;
  role: string;
  industry: string;
  bizSize: BizSize;
  areas: Area[];
  // Step 2
  aiComfort: number; // 0–4
  tools: Tool[];
  timeSinks: TimeSink[];
  automateFirst?: string;
  // Step 3
  hoursLost: number; // 1–40
  preferredHelp: PreferredHelp;
  freeText?: string;
  timezone?: string;
  workDays?: number[];
  startMin?: number;
  endMin?: number;
  typicalDay?: string[];
  typicalNote?: string;
  dayScope?: "individual" | "team";
  teamNote?: string;
  // Anti-spam (always submitted, humans leave blank)
  honeypot?: string;
}

// The tailored response returned to the client
export interface TailoredResponse {
  aiLevelSummary: string; // plain-English description of their AI comfort level
  workflows: WorkflowSuggestion[]; // 3–4 starter workflows (at least one per selected area)
  quickWin: string; // single actionable thing to do this week
  recommendedTier: "self_serve" | "guided" | "done_for_you";
  tierRationale: string; // short explanation of why this tier fits
  ctaText: string; // tailored CTA copy
  type: "llm" | "fallback";
}

export interface WorkflowSuggestion {
  area: Area;
  title: string;
  description: string;
}
