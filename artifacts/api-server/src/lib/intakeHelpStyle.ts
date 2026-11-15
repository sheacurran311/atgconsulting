/**
 * Account history shows the help style the client asked for,
 * not the decision-authority answer.
 *
 * Current assessments use support_preference. Older rows used preferredHelp.
 * Both are accepted; support_preference wins when both exist.
 */

import { answerMap } from "./intakeAnswers";

const HELP_STYLES = ["self_serve", "guided", "done_for_you", "not_sure"] as const;
export type HelpStyle = (typeof HELP_STYLES)[number];

function normaliseHelpStyle(value: string | undefined): HelpStyle | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();

  // Legacy stored values.
  if ((HELP_STYLES as readonly string[]).includes(v)) return v as HelpStyle;
  if (v === "done-for-you" || v === "done for you" || v === "dfy") return "done_for_you";
  if (v === "self-serve" || v === "self serve") return "self_serve";
  if (v === "not sure" || v === "unsure") return "not_sure";

  // Current assessment option text.
  if (/done.for.you|in my accounts|ongoing maintenance|maintenance plan/i.test(v)) return "done_for_you";
  if (/guided|installation and training|hands.on/i.test(v)) return "guided";
  if (/plan and setup|setup instructions|self.serve/i.test(v)) return "self_serve";
  if (/not sure|unsure|help me decide/i.test(v)) return "not_sure";

  return undefined;
}

function preferredHelp(answers: string | null | undefined): string | undefined {
  const map = answerMap(answers);
  return map.support_preference ?? map.preferredHelp;
}

export function helpStyleFromIntake(input: {
  answers?: string | null;
  requestedTier?: string | null;
}): HelpStyle {
  const preferred = normaliseHelpStyle(preferredHelp(input.answers));
  if (preferred) return preferred;
  if (input.requestedTier === "SELF_SERVE") return "self_serve";
  if (input.requestedTier === "GUIDED") return "guided";
  if (input.requestedTier === "WHITE_GLOVE") return "done_for_you";
  return "not_sure";
}
