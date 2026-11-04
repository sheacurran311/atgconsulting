/**
 * Account history shows the help style the client asked for,
 * not the decision-authority answer.
 */

const HELP_STYLES = ["self_serve", "guided", "done_for_you", "not_sure"] as const;
export type HelpStyle = (typeof HELP_STYLES)[number];

function preferredHelp(answers: string | null | undefined): string | undefined {
  if (!answers) return undefined;
  try {
    const parsed: unknown = JSON.parse(answers);
    if (Array.isArray(parsed)) {
      const row = parsed.find((item) => item && typeof item === "object" && (item as { id?: string }).id === "preferredHelp") as { answer?: string } | undefined;
      return typeof row?.answer === "string" ? row.answer : undefined;
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, { answer?: string } | string>;
      const direct = record.preferredHelp;
      if (typeof direct === "string") return direct;
      if (direct && typeof direct === "object" && typeof direct.answer === "string") return direct.answer;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function helpStyleFromIntake(input: {
  answers?: string | null;
  requestedTier?: string | null;
}): HelpStyle {
  const preferred = preferredHelp(input.answers);
  if (preferred && (HELP_STYLES as readonly string[]).includes(preferred)) return preferred as HelpStyle;
  if (input.requestedTier === "SELF_SERVE") return "self_serve";
  if (input.requestedTier === "GUIDED") return "guided";
  if (input.requestedTier === "WHITE_GLOVE") return "done_for_you";
  return "not_sure";
}
