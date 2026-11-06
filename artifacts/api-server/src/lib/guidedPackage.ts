/**
 * Guided packages in the product are 3 sessions ($997) or 5 ($1,497).
 * Never 4.
 */
export function guidedPackageSize(input: {
  metadataSessions?: string | null;
  priceId?: string | null;
  priceGuided?: string | null;
  priceGuided5?: string | null;
  requestedSessions?: number | null;
}): 3 | 5 {
  if (input.metadataSessions === "5") return 5;
  if (input.metadataSessions === "3") return 3;
  if (input.priceGuided5 && input.priceId && input.priceId === input.priceGuided5) return 5;
  if (input.priceGuided && input.priceId && input.priceId === input.priceGuided) return 3;
  if (input.requestedSessions === 5) return 5;
  return 3;
}

export function guidedPackageLabel(total: number | null | undefined): string {
  if (total === 5) return "5 sessions ($1,497)";
  if (total === 3) return "3 sessions ($997)";
  return "3 or 5 sessions ($997 or $1,497)";
}

/**
 * Signup stores requestedTier on the intake. It does not grant a paid tier.
 * He assigns the tier after review. Stripe may assign it later, when billing is on.
 */
export function tierToApplyOnVerifiedSignup(_requestedTier: string | null | undefined): "NONE" {
  return "NONE";
}

export function guidedUsedAfterComplete(input: {
  tier: string;
  total: number | null;
  used: number;
  counts: boolean;
  alreadyCounted: boolean;
  sameDayAlreadyCounted: boolean;
}): { used: number; markCounted: boolean } {
  if (!input.counts || input.tier !== "GUIDED") {
    return { used: input.used, markCounted: input.alreadyCounted };
  }
  if (input.alreadyCounted || input.sameDayAlreadyCounted) {
    return { used: input.used, markCounted: true };
  }
  if (input.total == null || input.used >= input.total) {
    return { used: input.used, markCounted: input.total != null };
  }
  return { used: input.used + 1, markCounted: true };
}

export function canAcceptDfy(input: {
  cap: number;
  acceptedThisMonth: number;
  alreadyAccepted: boolean;
}): boolean {
  if (input.alreadyAccepted) return true;
  const cap = Number.isFinite(input.cap) && input.cap > 0 ? Math.floor(input.cap) : 1;
  return input.acceptedThisMonth < cap;
}
