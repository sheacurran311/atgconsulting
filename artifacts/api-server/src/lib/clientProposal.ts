/**
 * Client-facing view of a DiscoveryProposal.
 * Shea's internal reviewSummary is never included.
 * Drafts are not returned — the client sees a pending state until she approves.
 */

export type ClientProposalState = "empty" | "pending" | "ready";

export function clientProposalState(opts: {
  clientId: string | null;
  intakeCount: number;
  hasApproved: boolean;
}): ClientProposalState {
  if (!opts.clientId || opts.intakeCount === 0) return "empty";
  if (!opts.hasApproved) return "pending";
  return "ready";
}

export interface ClientProposalView {
  id: string;
  status: string;
  approvedAt: string | null;
  execSummary: string;
  understanding: string;
  scope: string;
  howWeConnect: string;
  milestones: { label: string; description: string }[];
  investment: { tier?: string; price?: string; care?: string; notes?: string };
  acceptanceClause: string;
  contactName: string | null;
}

const INVESTMENT_KEYS = ["tier", "price", "care", "notes"] as const;

export function parseMilestones(raw: string): { label: string; description: string }[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: { label: string; description: string }[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const label = typeof row.label === "string" ? row.label.trim() : "";
      const description = typeof row.description === "string" ? row.description.trim() : "";
      if (!label && !description) continue;
      out.push({ label, description });
    }
    return out;
  } catch {
    return [];
  }
}

export function parseInvestment(raw: string): ClientProposalView["investment"] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const row = parsed as Record<string, unknown>;
    const out: ClientProposalView["investment"] = {};
    for (const key of INVESTMENT_KEYS) {
      const value = row[key];
      if (typeof value === "string" && value.trim()) out[key] = value.trim();
    }
    return out;
  } catch {
    return {};
  }
}

export function toClientProposal(row: {
  id: string;
  status: string;
  approvedAt: Date | null;
  execSummary: string;
  understanding: string;
  scope: string;
  howWeConnect: string;
  milestones: string;
  investment: string;
  acceptanceClause: string;
}, contactName: string | null): ClientProposalView {
  return {
    id: row.id,
    status: row.status,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    execSummary: row.execSummary,
    understanding: row.understanding,
    scope: row.scope,
    howWeConnect: row.howWeConnect,
    milestones: parseMilestones(row.milestones),
    investment: parseInvestment(row.investment),
    acceptanceClause: row.acceptanceClause,
    contactName,
  };
}
