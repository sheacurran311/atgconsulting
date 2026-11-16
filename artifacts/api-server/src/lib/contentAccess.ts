import { z } from "zod";

const TIERS = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];

export function contentTierAllowed(tier: string, minimum: string, testMode = false): boolean {
  const required = TIERS.indexOf(minimum);
  return required >= 0 && (testMode || TIERS.indexOf(tier) >= required);
}

const Tags = z.object({
  verticals: z.array(z.string()).default([]),
  tiers: z.array(z.string()).default([]),
  platforms: z.array(z.string()).default([]),
});
export type ArticleTags = z.infer<typeof Tags>;

export function parseArticleTags(raw: string): ArticleTags {
  try { return Tags.parse(JSON.parse(raw)); }
  catch { return { verticals: [], tiers: ["INVALID"], platforms: [] }; }
}

/** Tier tags declare eligible plans. Relevance must never broaden eligibility. */
export function articleAllowed(tags: ArticleTags, tier: string, testMode = false): boolean {
  return tags.tiers.length === 0 || tags.tiers.some((minimum) => contentTierAllowed(tier, minimum, testMode));
}

export function articleRelevant(tags: ArticleTags, vertical: string | null, platforms: string[]): boolean {
  if (tags.verticals.length && vertical && !tags.verticals.includes(vertical)) return false;
  return !tags.platforms.length || !platforms.length || tags.platforms.some((p) => platforms.includes(p));
}
