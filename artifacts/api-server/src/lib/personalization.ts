/**
 * Client workspace personalization.
 * Seeds ClientWorkflowSettings from intake data so the right workflows
 * are featured first. Called automatically after intake claim and on demand by admin.
 *
 * Ranking is tier-aware: clients only see slugs accessible at their tier.
 * The rank is OVERWRITTEN each time (not appended) to avoid stale orderings.
 */

import { prisma } from "./db";
import { TEMPLATE_SEEDS, PHASE2_SEEDS, PHASE3_SEEDS } from "./templates";

const ALL_SEEDS = [...TEMPLATE_SEEDS, ...PHASE2_SEEDS, ...PHASE3_SEEDS];

// Tier order for slug eligibility
const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];
const TIER_SLUG_MINMAP: Record<string, string> = {};
for (const seed of ALL_SEEDS) {
  TIER_SLUG_MINMAP[seed.slug] = seed.minTier;
}

function slugAccessibleForTier(slug: string, clientTier: string): boolean {
  const minTier = TIER_SLUG_MINMAP[slug] ?? "SELF_SERVE";
  return TIER_ORDER.indexOf(clientTier) >= TIER_ORDER.indexOf(minTier);
}

const AREA_SLUG_MAP: Record<string, string[]> = {
  executive_assistant: ["inbox-triage", "booking-flow", "money-snapshot"],
  marketing:           ["social-calendar", "review-request", "seo-audit"],
  sales:               ["follow-up", "prospect-research", "quote-proposal"],
  customer_support:    ["faq-support", "review-request", "inbox-triage"],
};

const TIME_SINK_SLUG_MAP: Record<string, string> = {
  email:          "inbox-triage",
  followups:      "follow-up",
  social_content: "social-calendar",
  prospecting:    "prospect-research",
  proposals:      "quote-proposal",
  scheduling:     "booking-flow",
  admin:          "money-snapshot",
  research:       "prospect-research",
};

export async function personalizeClientWorkspace(clientId: string): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { intakes: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!client) return;

  const intake = client.intakes[0];
  const areas: string[]     = (() => { try { return JSON.parse(client.areas) as string[]; } catch { return []; } })();
  const timeSinks: string[] = (() => {
    if (!intake?.answers) return [];
    try { return (JSON.parse(intake.answers) as Record<string, unknown>).timeSinks as string[] ?? []; } catch { return []; }
  })();

  const clientTier = client.tier ?? "NONE";

  // Score every workflow slug that is accessible at this client's tier
  const scores: Record<string, number> = {};
  for (const seed of ALL_SEEDS) {
    if (slugAccessibleForTier(seed.slug, clientTier)) {
      scores[seed.slug] = 0;
    }
  }

  // +3 for each matching area (if slug is accessible)
  for (const area of areas) {
    for (const slug of AREA_SLUG_MAP[area] ?? []) {
      if (slug in scores) scores[slug] = (scores[slug] ?? 0) + 3;
    }
  }
  // +2 for each matching time sink
  for (const sink of timeSinks) {
    const slug = TIME_SINK_SLUG_MAP[sink];
    if (slug && slug in scores) scores[slug] = (scores[slug] ?? 0) + 2;
  }
  // +1 for AI comfort >= 2 (can handle more complex workflows)
  if ((intake?.aiComfort ?? 0) >= 2) {
    for (const s of ["prospect-research", "seo-audit", "social-calendar"]) {
      if (s in scores) scores[s] = (scores[s] ?? 0) + 1;
    }
  }
  // customer_support area bonus
  if (areas.includes("customer_support")) {
    if ("faq-support" in scores) scores["faq-support"] = (scores["faq-support"] ?? 0) + 2;
    if ("inbox-triage" in scores) scores["inbox-triage"] = (scores["inbox-triage"] ?? 0) + 1;
  }
  // personal_logistics time sink maps to booking-flow (scheduling adjacent)
  if (timeSinks.includes("personal_logistics") && "booking-flow" in scores) {
    scores["booking-flow"] = (scores["booking-flow"] ?? 0) + 2;
  }
  // follow-up gets +2 bias (reduced from +5; it's good for sales-heavy intakes but shouldn't
  // dominate for non-sales verticals)
  if ("follow-up" in scores) {
    scores["follow-up"] = (scores["follow-up"] ?? 0) + 2;
    // Extra +2 only when sales or followups is a priority
    if (areas.includes("sales") || timeSinks.includes("followups")) {
      scores["follow-up"] = (scores["follow-up"] ?? 0) + 2;
    }
  }

  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([slug]) => slug);

  for (const slug of sorted) {
    await prisma.clientWorkflowSettings.upsert({
      where: { clientId_slug: { clientId, slug } },
      create: { clientId, slug, enabled: true },
      update: { enabled: true },
    });
  }

  // OVERWRITE the rank note in Client.notes (strip any existing __RANK__ blocks first)
  const rankNote = `{"personalizedSlugs":${JSON.stringify(sorted)}}`;
  const baseNotes = (client.notes ?? "").replace(/__RANK__\{[^}]*\}(\n|$)?/g, "").trim();
  await prisma.client.update({
    where: { id: clientId },
    data: { notes: baseNotes ? `${baseNotes}\n__RANK__${rankNote}` : `__RANK__${rankNote}` },
  });
}

/** Extract personalizedSlugs from client notes if present. */
export function extractPersonalizedSlugs(notes: string | null): string[] | null {
  if (!notes) return null;
  // Greedy match to end of line to handle varying JSON lengths
  const match = notes.match(/__RANK__(\{[^\n]+\})/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]!) as { personalizedSlugs?: string[] };
    return parsed.personalizedSlugs ?? null;
  } catch { return null; }
}
