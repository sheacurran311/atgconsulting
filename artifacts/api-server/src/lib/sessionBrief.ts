/**
 * Run-of-show for one call. Quotes come from the intake. Hours are included
 * only when the client typed them. Prices are the ones on the public tiers.
 */
import { guidedPackageLabel } from "./guidedPackage";
import type { ParsedIntake } from "./intakeAnswers";

export interface SessionBrief {
  clientName: string;
  tier: string;
  packageLabel: string;
  sessionLabel: string;
  decisionMaker: string;
  quotes: string[];
  agenda: string[];
  demo: string[];
  homework: string[];
  capture: string[];
  nextStep: string[];
}

export function buildSessionBrief(input: {
  clientName: string;
  tier: string;
  guidedTotal: number | null;
  guidedUsed: number;
  sessionNumber: number | null;
  intake: ParsedIntake;
  decisionAuthority: string | null;
  approverName: string | null;
}): SessionBrief {
  const authority = input.decisionAuthority ?? input.intake.decisionAuthority;
  const decisionMaker = authority
    ? `${authority}${input.approverName || input.intake.approverName ? ` — approver ${input.approverName ?? input.intake.approverName}` : ""}`
    : "Not stated on the intake.";

  const quotes = [
    input.intake.topProblems ? `Pain, in their words: ${input.intake.topProblems}` : null,
    input.intake.role ? `Role: ${input.intake.role}` : null,
    input.intake.industry ? `Business: ${input.intake.industry}` : null,
    input.intake.bizSize ? `Team size: ${input.intake.bizSize}` : null,
    input.intake.tools ? `Tools they named: ${input.intake.tools}` : null,
    input.intake.hoursLost != null ? `Hours they typed: ${input.intake.hoursLost} a week.` : null,
  ].filter((line): line is string => Boolean(line));

  const number = input.sessionNumber ?? (input.tier === "GUIDED" ? input.guidedUsed + 1 : null);
  const sessionLabel = input.tier === "GUIDED" && input.guidedTotal
    ? `Session ${number ?? "—"} of ${input.guidedTotal}`
    : input.tier === "WHITE_GLOVE"
      ? "Done-for-you working session"
      : "Discovery or working session";

  const exhausted = input.tier === "GUIDED" && input.guidedTotal != null && input.guidedUsed >= input.guidedTotal;

  return {
    clientName: input.clientName,
    tier: input.tier,
    packageLabel: input.tier === "GUIDED" ? guidedPackageLabel(input.guidedTotal) : input.tier,
    sessionLabel,
    decisionMaker,
    quotes: quotes.length > 0 ? quotes : ["No intake quotes on file yet."],
    agenda: [
      "5 min — what they want from this call",
      "10 min — last homework, if any",
      "25–40 min — one workflow in their own assistant",
      "10 min — what they will practice before the next call",
      "5 min — date of the next session, or a clear stop",
    ],
    demo: [
      "Use the assistant they already have. This app does not connect to it.",
      "Show one workflow from the approved tool plan.",
      "They copy and send. Nothing goes out on its own.",
    ],
    homework: [
      "One task, named out loud, with who does it and by when.",
    ],
    capture: [
      "Consent if a recording link will be stored.",
      "Decisions, action items, and workflows touched.",
      "A short recap only if it should be shared.",
      "Mark the Guided session complete so the package count updates once.",
    ],
    nextStep: nextCues(input.tier, exhausted),
  };
}

function nextCues(tier: string, exhausted: boolean): string[] {
  if (tier === "NONE" || tier === "SELF_SERVE") {
    return [
      "Self-serve is $197. It has no 1:1 calls.",
      "If they want calls, Guided is $997 for 3 sessions or $1,497 for 5.",
      "If they want him to run the work, that is a Done-for-you application, from $3,500. Do not switch the tier on this page.",
    ];
  }
  if (tier === "GUIDED" && exhausted) {
    return [
      "The Guided package count is used up.",
      "More calls are a new package ($997 for 3 or $1,497 for 5), or a Done-for-you application from $3,500.",
      "Do not invent a discount.",
    ];
  }
  if (tier === "GUIDED") {
    return [
      "Stay inside the package they have (3 sessions at $997 or 5 at $1,497).",
      "If they ask him to run it after setup, point at Done-for-you from $3,500. Acceptance is still his decision.",
    ];
  }
  return [
    "Done-for-you is from $3,500, plus optional $750/mo care. Out-of-scope work he approves is $150/hour.",
    "Confirm scope, invited access (no shared passwords), and the milestone labels on the proposal.",
  ];
}
