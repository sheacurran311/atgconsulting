/**
 * Discovery answers are stored as { id, question, answer }[].
 * Older rows may be a flat object. Both shapes are read here.
 * Hours are used only when the client typed a plain number. Nothing is invented.
 */

export interface ParsedIntake {
  role: string | null;
  industry: string | null;
  bizSize: string | null;
  topProblems: string | null;
  decisionAuthority: string | null;
  approverName: string | null;
  tools: string | null;
  toolBudget: string | null;
  hoursLost: number | null;
  aiComfort: number | null;
  anythingElse: string | null;
}

export function answerMap(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  if (Array.isArray(parsed)) {
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const id = (row as { id?: unknown }).id;
      const answer = (row as { answer?: unknown }).answer;
      if (typeof id !== "string" || !id) continue;
      if (typeof answer === "string" || typeof answer === "number") out[id] = String(answer);
    }
    return out;
  }
  if (parsed && typeof parsed === "object") {
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string" || typeof value === "number") out[key] = String(value);
    }
  }
  return out;
}

/** A hours figure the client actually typed. Prose is not parsed for a number. */
export function statedHours(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > 168) return null;
  return n;
}

function comfort(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^[0-4]$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function parseIntakeAnswers(raw: string | null | undefined): ParsedIntake {
  const map = answerMap(raw);
  const tools = [map.ai_tools_today, map.crm_tool, map.core_system, map.invoicing_tool, map.currentSoftware]
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item));
  return {
    role: map.role?.trim() || null,
    industry: map.business_type?.trim() || map.industry?.trim() || null,
    bizSize: map.team_size?.trim() || map.bizSize?.trim() || null,
    topProblems: map.top_problems?.trim() || map.automateFirst?.trim() || null,
    decisionAuthority: map.decision_authority?.trim() || null,
    approverName: map.approver_name?.trim() || null,
    tools: tools.length > 0 ? tools.join(", ") : null,
    toolBudget: map.budget_range?.trim() || map.toolBudget?.trim() || null,
    hoursLost: statedHours(map.hoursLost ?? map.hours_lost),
    aiComfort: comfort(map.ai_comfort ?? map.aiComfort),
    anythingElse: map.anything_else?.trim() || map.freeText?.trim() || null,
  };
}

/** Sentence fragment. Empty when the client did not state hours. */
export function hoursReportedPhrase(hours: number | null): string {
  if (hours == null) return "";
  return `They reported ${hours} hours a week on repetitive work.`;
}
