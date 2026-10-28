/**
 * ATG Consulting Discovery Intake — Question Bank
 *
 * Curated questions across 10 categories. Used by:
 *   1. The adaptive AI (Grok picks next questions from this bank)
 *   2. The fixed fallback order (AI disabled or cap hit)
 *
 * Questions are open text unless type is specified.
 * Do NOT ask for passwords, tokens, credentials, or confidential client data.
 */

export type QuestionType = "text" | "choice" | "multiselect" | "number";

export interface Question {
  id: string;
  category: string;
  text: string;
  type: QuestionType;
  options?: string[];
  /** True = always ask (core question). False = follow-up only. */
  core: boolean;
  /** If this is answered, which IDs are especially relevant next? */
  followUpIds?: string[];
  /** Returns true if this question should be skipped given current answers. */
  skip?: (data: Partial<Record<string, unknown>>) => boolean;
}

export const QUESTION_BANK: Question[] = [
  // ── Core / always ask ──────────────────────────────────────────────────────
  {
    id: "contact_name",
    category: "contact",
    text: "What's your name?",
    type: "text",
    core: true,
  },
  {
    id: "contact_email",
    category: "contact",
    text: "What's the best email address to reach you?",
    type: "text",
    core: true,
  },
  {
    id: "company_name",
    category: "company",
    text: "What's your company name?",
    type: "text",
    core: true,
  },
  {
    id: "role",
    category: "company",
    text: "What's your role at the company?",
    type: "text",
    core: true,
  },
  {
    id: "decision_authority",
    category: "authority",
    text: "Are you the decision-maker for this project?",
    type: "choice",
    options: [
      "Yes — I can approve it and grant access to the systems involved",
      "Partial — I can approve some of it (e.g. my own email or CRM) but not company systems",
      "No — someone else gives final approval",
    ],
    core: true,
    followUpIds: ["approver_name", "approver_email", "approver_role"],
  },
  {
    id: "approver_name",
    category: "authority",
    text: "What's the approver's name? (You can fill this in later if needed)",
    type: "text",
    core: false,
    skip: (data) => {
      const auth = (data as Record<string, string>).decision_authority;
      return auth === "Yes — I can approve it and grant access to the systems involved";
    },
  },
  {
    id: "approver_email",
    category: "authority",
    text: "What's the approver's email address? (Optional — helps Shea prepare the right paperwork)",
    type: "text",
    core: false,
    skip: (data) => {
      const auth = (data as Record<string, string>).decision_authority;
      return auth === "Yes — I can approve it and grant access to the systems involved";
    },
  },
  {
    id: "approver_role",
    category: "authority",
    text: "What's the approver's role or title?",
    type: "text",
    core: false,
    skip: (data) => {
      const auth = (data as Record<string, string>).decision_authority;
      return auth === "Yes — I can approve it and grant access to the systems involved";
    },
  },
  {
    id: "business_type",
    category: "company",
    text: "How would you describe your business? (e.g. home services, construction, real estate, professional services, e-commerce, manufacturing, other)",
    type: "text",
    core: true,
  },
  {
    id: "team_size",
    category: "company",
    text: "How many people are on your team? (including yourself)",
    type: "choice",
    options: ["Just me", "2–5", "6–15", "16–50", "50+"],
    core: true,
  },
  {
    id: "top_problems",
    category: "company",
    text: "What are the top 2–3 problems or bottlenecks you're hoping to solve? Be as specific as you can.",
    type: "text",
    core: true,
    followUpIds: ["ops_manual_steps", "sales_pipeline_stage", "invoicing_bottleneck"],
  },

  // ── Systems & ERP ──────────────────────────────────────────────────────────
  {
    id: "core_system",
    category: "systems",
    text: "What system do you use to run the business day to day? (e.g. QuickBooks, Salesforce, HubSpot, a spreadsheet, custom software, or nothing formal)",
    type: "text",
    core: true,
    followUpIds: ["system_built_or_bought", "system_api", "system_exports"],
  },
  {
    id: "system_built_or_bought",
    category: "systems",
    text: "Is that system something you bought off the shelf, built in-house, or a mix?",
    type: "choice",
    options: ["Bought / SaaS", "Built in-house", "Mix of both", "Not sure"],
    core: false,
  },
  {
    id: "system_api",
    category: "systems",
    text: "Does your main system have an API or integration options? Have you connected it to anything else?",
    type: "text",
    core: false,
  },
  {
    id: "system_exports",
    category: "systems",
    text: "Can you export data from it — for example CSV, Excel, or reports? How often do you do that today?",
    type: "text",
    core: false,
  },
  {
    id: "system_notifications",
    category: "systems",
    text: "Does your system send email notifications or alerts today? If so, for what?",
    type: "text",
    core: false,
  },
  {
    id: "spreadsheet_use",
    category: "systems",
    text: "How much of your operation runs on spreadsheets today? What are they tracking?",
    type: "text",
    core: false,
  },

  // ── Alerts & Exceptions ────────────────────────────────────────────────────
  {
    id: "alerts_exceptions",
    category: "alerts",
    text: "What kinds of things fall through the cracks today — jobs that don't get followed up, invoices that go unpaid, or customers who go quiet?",
    type: "text",
    core: true,
    followUpIds: ["alert_current_method", "alert_frequency"],
  },
  {
    id: "alert_current_method",
    category: "alerts",
    text: "How do you currently catch those exceptions? (e.g. daily review, someone checks manually, nothing formal)",
    type: "text",
    core: false,
  },
  {
    id: "alert_frequency",
    category: "alerts",
    text: "How often do those missed items cause a real problem — weekly, monthly, or rarely?",
    type: "choice",
    options: ["Several times a week", "About once a week", "A few times a month", "Rarely"],
    core: false,
  },

  // ── Sales & Prospecting ────────────────────────────────────────────────────
  {
    id: "lead_source",
    category: "sales",
    text: "Where do your leads come from today? (e.g. referrals, Google, cold outreach, trade shows, repeat business)",
    type: "text",
    core: false,
    followUpIds: ["sales_pipeline_stage", "follow_up_process"],
  },
  {
    id: "sales_pipeline_stage",
    category: "sales",
    text: "Once you have a lead, walk me through what happens — from first contact to closed deal. Where does it break down?",
    type: "text",
    core: false,
  },
  {
    id: "follow_up_process",
    category: "sales",
    text: "How do you follow up with prospects today? Is that mostly email, phone, or something else? How much time does it take per week?",
    type: "text",
    core: false,
  },
  {
    id: "crm_tool",
    category: "sales",
    text: "Do you use a CRM to track leads and contacts? If so, which one — and how consistently does the team use it?",
    type: "text",
    core: false,
  },
  {
    id: "quote_process",
    category: "sales",
    text: "How do you create and send quotes or proposals today? How long does it typically take from request to sending?",
    type: "text",
    core: false,
    followUpIds: ["invoicing_bottleneck"],
  },

  // ── Operations & Production ────────────────────────────────────────────────
  {
    id: "ops_volume",
    category: "operations",
    text: "Roughly how many jobs, projects, or orders do you handle in a typical week or month?",
    type: "text",
    core: false,
  },
  {
    id: "ops_manual_steps",
    category: "operations",
    text: "What are the most manual or repetitive steps in delivering your service or product? What do you wish you could hand off?",
    type: "text",
    core: false,
    followUpIds: ["ops_handoff_risk"],
  },
  {
    id: "ops_handoff_risk",
    category: "operations",
    text: "Are there handoff points between people or systems where things get lost or delayed? Can you give an example?",
    type: "text",
    core: false,
  },
  {
    id: "ops_scheduling",
    category: "operations",
    text: "How do you schedule work — jobs, appointments, or deliveries? Is that in a system or mostly in people's heads?",
    type: "text",
    core: false,
  },

  // ── Install & Contractor Management ───────────────────────────────────────
  {
    id: "field_team",
    category: "install_contractor",
    text: "Do you manage field technicians, contractors, or installation crews? How many, roughly?",
    type: "text",
    core: false,
    followUpIds: ["contractor_dispatch", "contractor_updates"],
  },
  {
    id: "contractor_dispatch",
    category: "install_contractor",
    text: "How do you dispatch and assign work to your field team today? What's the biggest friction point?",
    type: "text",
    core: false,
  },
  {
    id: "contractor_updates",
    category: "install_contractor",
    text: "How does your field team report back — job completion, photos, issues? Is that in a system or via text/email?",
    type: "text",
    core: false,
  },
  {
    id: "contractor_pay",
    category: "install_contractor",
    text: "How do you track and pay contractor or subcontractor hours and invoices?",
    type: "text",
    core: false,
  },

  // ── Invoicing & Finance ─────────────────────────────────────────────────────
  {
    id: "invoicing_tool",
    category: "invoicing",
    text: "What do you use for invoicing and collecting payments? (e.g. QuickBooks, FreshBooks, Stripe, paper invoices)",
    type: "text",
    core: false,
    followUpIds: ["invoicing_bottleneck", "invoice_follow_up"],
  },
  {
    id: "invoicing_bottleneck",
    category: "invoicing",
    text: "What slows down your invoicing process the most — creating them, sending them, or chasing payment?",
    type: "choice",
    options: ["Creating them", "Sending them", "Chasing payment", "Matching to jobs", "Multiple of these"],
    core: false,
  },
  {
    id: "invoice_follow_up",
    category: "invoicing",
    text: "How do you follow up on unpaid invoices? How much time does that take each week?",
    type: "text",
    core: false,
  },
  {
    id: "revenue_visibility",
    category: "invoicing",
    text: "How much visibility do you have into your cash flow and revenue at any given moment?",
    type: "choice",
    options: ["Very clear — I check a dashboard", "Rough idea — I check the bank", "Not much — it's reactive", "It varies"],
    core: false,
  },

  // ── AI Tools Used Today ────────────────────────────────────────────────────
  {
    id: "ai_tools_today",
    category: "ai_tools",
    text: "Do you or your team use any AI tools today — things like ChatGPT, Claude, Grok, or Copilot? If so, what for?",
    type: "text",
    core: true,
    followUpIds: ["ai_comfort", "ai_willingness"],
  },
  {
    id: "ai_comfort",
    category: "ai_tools",
    text: "How comfortable is your team with new technology? (Be honest — it helps us recommend the right approach)",
    type: "choice",
    options: ["Very comfortable — we adopt early", "Comfortable if there's training", "Cautious — we prefer proven tools", "Resistant — change is hard here"],
    core: false,
  },
  {
    id: "ai_willingness",
    category: "ai_tools",
    text: "Are you open to your team learning to use an AI assistant (like Grok Bot or Claude) as part of their workflow?",
    type: "choice",
    options: ["Yes — ready to start now", "Yes — with proper training", "Maybe — depends on the tool", "Prefer fully automated with no AI tool needed"],
    core: false,
  },
  {
    id: "ai_previous_attempts",
    category: "ai_tools",
    text: "Have you tried to automate or use AI for any of these problems before? What happened?",
    type: "text",
    core: false,
  },

  // ── Access & Security ──────────────────────────────────────────────────────
  {
    id: "access_comfort",
    category: "security",
    text: "For any integration work, we'd need read access to data in your systems. How comfortable is your team with granting a consultant temporary, revocable access?",
    type: "choice",
    options: ["Comfortable — we've done it before", "Careful — we'd want a clear scope first", "Cautious — we'd need legal review", "Not comfortable at this stage"],
    core: false,
  },
  {
    id: "data_sensitivity",
    category: "security",
    text: "Is any of your operational data particularly sensitive — for example, protected health information, financial records, or customer PII?",
    type: "text",
    core: false,
  },

  // ── Goals, Budget & Timeline ───────────────────────────────────────────────
  {
    id: "success_definition",
    category: "goals",
    text: "If we solved the problems you mentioned, what would success look like in 90 days? Be specific — hours saved, revenue, fewer errors?",
    type: "text",
    core: true,
  },
  {
    id: "urgency",
    category: "goals",
    text: "How urgent is this for you? Is there a specific deadline or event driving it?",
    type: "choice",
    options: ["Very urgent — we need this now", "Soon — within the next month or two", "Planning ahead — 3–6 months", "Exploring — no specific timeline"],
    core: false,
  },
  {
    id: "budget_range",
    category: "goals",
    text: "Do you have a rough budget in mind for this kind of work? You don't have to commit — it just helps us scope the right solution.",
    type: "choice",
    options: [
      "Under $500",
      "$500–$2,000",
      "$2,000–$5,000",
      "$5,000–$15,000",
      "Over $15,000",
      "Not sure yet",
    ],
    core: false,
  },
  {
    id: "decision_process",
    category: "goals",
    text: "Who else needs to be involved in the decision to move forward — is this your call alone, or does someone else need to sign off?",
    type: "text",
    core: false,
  },
  {
    id: "anything_else",
    category: "goals",
    text: "Is there anything else you'd like Shea to know before the conversation — context we haven't covered, concerns, or specific constraints?",
    type: "text",
    core: false,
  },
];

/** Core questions that are always asked (first wave). */
export const CORE_QUESTIONS = QUESTION_BANK.filter((q) => q.core);

/** Fixed fallback order when AI is disabled. */
export const FALLBACK_ORDER: string[] = [
  "contact_name",
  "contact_email",
  "company_name",
  "role",
  "decision_authority",   // required early — determines signature block and access flow
  "approver_name",        // only asked if authority is partial or none
  "approver_email",
  "business_type",
  "team_size",
  "top_problems",
  "core_system",
  "ai_tools_today",
  "alerts_exceptions",
  "ops_manual_steps",
  "sales_pipeline_stage",
  "follow_up_process",
  "invoicing_tool",
  "invoicing_bottleneck",
  "field_team",
  "ai_comfort",
  "access_comfort",
  "success_definition",
  "budget_range",
  "urgency",
  "anything_else",
];

/** Map for quick lookup. */
export const QUESTION_MAP = Object.fromEntries(QUESTION_BANK.map((q) => [q.id, q]));

/** Category labels for the coverage summary shown to Grok. */
export const CATEGORY_LABELS: Record<string, string> = {
  contact:            "Contact details",
  company:            "Company & role",
  authority:          "Decision authority",
  systems:            "Systems & ERP",
  alerts:             "Alerts & exceptions",
  sales:              "Sales & prospecting",
  operations:         "Operations & production",
  install_contractor: "Install & contractor management",
  invoicing:          "Invoicing & finance",
  ai_tools:           "AI tools & comfort",
  security:           "Access & security",
  goals:              "Goals, budget & timeline",
};
