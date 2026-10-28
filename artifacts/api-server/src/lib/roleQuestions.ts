/**
 * Role-scoped question selection for multi-person engagement intakes.
 *
 * Each role gets a focused set of ~8-12 questions from the main question bank.
 * Grok picks adaptive follow-ups within this set, capped at the role's limit.
 *
 * The role-scoped intake always starts with contact info (name, email), then
 * the role-specific questions.
 */

import { QUESTION_BANK, FALLBACK_ORDER, type Question } from "./questionBank";

export interface RoleConfig {
  label: string;
  description: string;   // shown to the respondent
  questionIds: string[]; // ordered list (fallback sequence for this role)
  maxQuestions: number;
}

// ── Role configs ──────────────────────────────────────────────────────────────

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  owner: {
    label: "Owner / CEO",
    description: "We'll ask you about overall goals, budget, and your level of decision-making authority.",
    questionIds: [
      "business_type", "team_size", "top_problems",
      "decision_authority", "approver_name", "approver_email",
      "success_definition", "budget_range", "urgency",
      "ai_tools_today", "anything_else",
    ],
    maxQuestions: 12,
  },

  ops_manager: {
    label: "Operations Manager",
    description: "We'll ask you about day-to-day operations, manual processes, and scheduling.",
    questionIds: [
      "team_size", "ops_volume", "ops_manual_steps",
      "ops_handoff_risk", "ops_scheduling",
      "alerts_exceptions", "alert_current_method",
      "core_system", "system_exports",
      "ai_tools_today", "ai_comfort",
    ],
    maxQuestions: 11,
  },

  it_admin: {
    label: "IT / ERP Administrator",
    description: "We'll ask about your systems, APIs, integrations, and security posture.",
    questionIds: [
      "core_system", "system_built_or_bought", "system_api",
      "system_exports", "system_notifications",
      "data_sensitivity", "access_comfort",
      "ai_tools_today", "ai_previous_attempts",
      "spreadsheet_use",
    ],
    maxQuestions: 10,
  },

  finance: {
    label: "Finance / Accounting",
    description: "We'll ask about invoicing, payments, and financial visibility.",
    questionIds: [
      "invoicing_tool", "invoicing_bottleneck",
      "invoice_follow_up", "revenue_visibility",
      "core_system", "system_exports",
      "alerts_exceptions",
    ],
    maxQuestions: 8,
  },

  sales: {
    label: "Sales / Business Development",
    description: "We'll ask about your sales process, CRM, and follow-up workflow.",
    questionIds: [
      "lead_source", "sales_pipeline_stage",
      "follow_up_process", "crm_tool",
      "quote_process", "top_problems",
      "ai_tools_today", "ai_comfort",
    ],
    maxQuestions: 9,
  },

  field_ops: {
    label: "Field / Install / Contractor Manager",
    description: "We'll ask about how you manage field crews, dispatch, and job completion.",
    questionIds: [
      "field_team", "contractor_dispatch",
      "contractor_updates", "contractor_pay",
      "ops_scheduling", "invoicing_tool",
      "alerts_exceptions", "ai_tools_today",
    ],
    maxQuestions: 9,
  },

  marketing: {
    label: "Marketing",
    description: "We'll ask about content, lead generation, and social media workflows.",
    questionIds: [
      "lead_source", "ops_manual_steps",
      "ai_tools_today", "ai_comfort",
      "top_problems", "success_definition",
    ],
    maxQuestions: 7,
  },

  general: {
    label: "General Contributor",
    description: "A short general intake covering your area of the business.",
    questionIds: FALLBACK_ORDER.slice(2, 14), // skip name + email (already collected)
    maxQuestions: 10,
  },
};

// Normalize role slugs
export function normalizeRole(role: string): string {
  const r = role.toLowerCase().replace(/[^a-z_]/g, "_");
  return ROLE_CONFIGS[r] ? r : "general";
}

// ── Role-scoped question list ─────────────────────────────────────────────────

const QB_MAP = Object.fromEntries(QUESTION_BANK.map((q) => [q.id, q]));

/**
 * Returns the ordered question list for a role, filtered to IDs that exist
 * in the question bank, excluding already-answered IDs.
 */
export function getRoleQuestions(
  role: string,
  excludeIds: Set<string> = new Set(),
): Question[] {
  const config = ROLE_CONFIGS[normalizeRole(role)] ?? ROLE_CONFIGS.general!;
  return config.questionIds
    .filter((id) => !excludeIds.has(id) && QB_MAP[id] !== undefined)
    .map((id) => QB_MAP[id]!)
    .slice(0, config.maxQuestions);
}

export function getRoleConfig(role: string): RoleConfig {
  return ROLE_CONFIGS[normalizeRole(role)] ?? ROLE_CONFIGS.general!;
}

/** Context note injected into the Grok system prompt for role-scoped intake. */
export function roleSystemContext(role: string, companyName: string): string {
  const config = getRoleConfig(role);
  return `This is a focused intake for ${companyName}. The respondent's role is: ${config.label}.
${config.description}
Focus only on questions relevant to their role. Stop after ${config.maxQuestions} questions or when their area is well covered.
Available question IDs for this role: ${config.questionIds.join(", ")}`;
}
