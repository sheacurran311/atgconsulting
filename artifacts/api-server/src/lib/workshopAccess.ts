/**
 * Workshop gating matches workflow tiers.
 * Paid plans and admin test mode can open it. Unpaid accounts cannot.
 */

const PAID = new Set(["SELF_SERVE", "GUIDED", "WHITE_GLOVE"]);

export function canAccessWorkshop(tier: string | null | undefined, testMode: boolean): boolean {
  if (testMode) return true;
  return PAID.has(tier ?? "NONE");
}

export function progressPercent(completed: number, total: number): number {
  if (total <= 0 || completed <= 0) return 0;
  return Math.round((Math.min(completed, total) / total) * 100);
}

export interface QuizQuestion {
  prompt: string;
  choices: string[];
  answerIndex: number;
}

export function parseQuiz(raw: string): QuizQuestion[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: QuizQuestion[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const prompt = typeof row.prompt === "string" ? row.prompt.trim() : "";
      const choices = Array.isArray(row.choices) ? row.choices.filter((c): c is string => typeof c === "string" && c.trim().length > 0) : [];
      const answerIndex = typeof row.answerIndex === "number" ? row.answerIndex : -1;
      if (!prompt || choices.length < 2 || answerIndex < 0 || answerIndex >= choices.length) continue;
      out.push({ prompt, choices, answerIndex });
    }
    return out;
  } catch {
    return [];
  }
}

export function scoreQuiz(answers: number[], questions: QuizQuestion[]): { score: number; total: number; results: boolean[] } {
  const results = questions.map((question, index) => answers[index] === question.answerIndex);
  return { score: results.filter(Boolean).length, total: questions.length, results };
}

export function parseTakeaways(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}
