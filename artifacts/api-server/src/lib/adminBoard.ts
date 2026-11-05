/**
 * Flags for the admin Today board. A client is listed only when a flag is true.
 * There is no score.
 */

export function clientHealthFlags(input: {
  intakeCount: number;
  proposalDraft: boolean;
  tier: string;
  guidedSessionsTotal: number | null;
  guidedSessionsUsed: number;
  dfyAccepted: boolean;
  accessCount: number;
  unreadFromClient: number;
  workshopNotStarted?: boolean;
}): string[] {
  const flags: string[] = [];
  if (input.intakeCount === 0) flags.push("No intake");
  if (input.proposalDraft) flags.push("Proposal still a draft");
  if (
    input.tier === "GUIDED"
    && input.guidedSessionsTotal != null
    && input.guidedSessionsUsed >= input.guidedSessionsTotal
  ) {
    flags.push("Guided sessions used up");
  }
  if (input.dfyAccepted && input.accessCount === 0) flags.push("Done-for-you accepted with no access recorded");
  if (input.unreadFromClient > 0) flags.push("Unread message");
  if (input.workshopNotStarted) flags.push("AI workshop not started");
  return flags;
}

export function countByKey(rows: { key: string; count: number }[], key: string): number {
  return rows.find((row) => row.key === key)?.count ?? 0;
}
