/**
 * Internal prospecting foundation.
 * No data collection, delivery, AI model calls or customer-accessible endpoints.
 * All facts about prospect needs must be supported by evidence recorded by an operator.
 */
export type ProspectStatus =
  | "NEW" | "RESEARCHED" | "QUALIFIED" | "DISQUALIFIED"
  | "DRAFT_READY" | "APPROVED" | "CONTACTED" | "REPLIED"
  | "BOOKED" | "WON" | "LOST" | "SUPPRESSED";

export interface ProspectEvidence {
  claim: string;
  sourceUrl: string;
  observedAt: string;
  verified: boolean;
}

export interface ProspectReview {
  industryFit: number;
  sizeFit: number;
  observableNeed: number;
  contactConfidence: number;
  urgency: number;
  evidence: ProspectEvidence[];
  suppressed: boolean;
  qualification?: {economicPotential: number; serviceFit: number; feasibility: number; expansion: number};
}

export interface ProspectScore {
  total: number;
  label: "REVIEW" | "QUALIFIED" | "HOLD";
  reasons: string[];
  priority?: "priority" | "qualified" | "research" | "deprioritize";
}

const weights = {
  industryFit: 25,
  sizeFit: 15,
  observableNeed: 30,
  contactConfidence: 15,
  urgency: 15,
} as const;

export function normalizeProspectDomain(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    if (!host.includes(".") || host === "localhost" || /\s/.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}

export function assessProspect(review: ProspectReview): ProspectScore {
  const evidence = review.evidence.filter((e) =>
    e.verified &&
    /^https?:\/\//i.test(e.sourceUrl) &&
    !Number.isNaN(Date.parse(e.observedAt)) &&
    e.claim.trim().length > 0,
  );
  const reasons: string[] = [];
  if (review.suppressed) return { total: 0, label: "HOLD", reasons: ["Suppressed: do not contact."] };
  if (!evidence.length) reasons.push("No verified source evidence; do not claim a business pain point.");
  if (review.qualification) {
    const {economicPotential, serviceFit, feasibility, expansion} = review.qualification;
    const total = Math.round((30 * review.observableNeed + 20 * economicPotential + 15 * serviceFit
      + 15 * review.contactConfidence + 10 * feasibility + 10 * expansion) / 5);
    const qualified = total >= 65 && evidence.length > 0 && review.contactConfidence >= 2;
    if (review.contactConfidence < 2) reasons.push("Contact confidence too low for outreach.");
    return {total, label: qualified ? "QUALIFIED" : "REVIEW", reasons,
      priority: !qualified ? total >= 45 || reasons.length > 0 ? "research" : "deprioritize" : total >= 80 ? "priority" : "qualified"};
  }
  let total = 0;
  for (const [key, weight] of Object.entries(weights) as Array<[keyof typeof weights, number]>) {
    const value = review[key];
    if (!Number.isFinite(value) || value < 0 || value > 5)
      throw new RangeError(`Invalid prospect score: ${key} must be between 0 and 5.`);
    total += value * weight / 5;
  }
  const rounded = Math.round(total);
  if (review.contactConfidence < 2) reasons.push("Contact confidence too low for outreach.");
  if (review.observableNeed >= 3 && !evidence.length)
    reasons.push("Observable need requires source-backed findings.");
  const qualified = rounded >= 70 && evidence.length > 0 && review.contactConfidence >= 2;
  if (qualified) reasons.push("Suitable for consultant review; approval still required before outreach.");
  return { total: rounded, label: qualified ? "QUALIFIED" : "REVIEW", reasons };
}

export function mayAdvanceProspect(from: ProspectStatus, to: ProspectStatus): boolean {
  if (from === "SUPPRESSED") return false;
  if (to === "SUPPRESSED") return true;
  const transitions: Record<ProspectStatus, ProspectStatus[]> = {
    NEW: ["RESEARCHED", "DISQUALIFIED"],
    RESEARCHED: ["QUALIFIED", "DISQUALIFIED"],
    QUALIFIED: ["DRAFT_READY", "DISQUALIFIED"],
    DISQUALIFIED: ["RESEARCHED"],
    DRAFT_READY: ["APPROVED", "QUALIFIED"],
    APPROVED: ["CONTACTED", "DRAFT_READY"],
    CONTACTED: ["REPLIED", "LOST"],
    REPLIED: ["BOOKED", "LOST"],
    BOOKED: ["WON", "LOST"],
    WON: [],
    LOST: ["RESEARCHED"],
    SUPPRESSED: [],
  };
  return transitions[from].includes(to);
}
