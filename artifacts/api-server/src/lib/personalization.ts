/**
 * Client workspace personalization.
 * Seeds ClientWorkflowSettings from intake data so the right workflows
 * are featured first. Called automatically after intake claim and on demand by admin.
 */

import { prisma } from "./db";
import { TEMPLATE_SEEDS, PHASE2_SEEDS, PHASE3_SEEDS } from "./templates";

const ALL_SEEDS = [...TEMPLATE_SEEDS, ...PHASE2_SEEDS, ...PHASE3_SEEDS];

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

  // Score every workflow slug by relevance
  const scores: Record<string, number> = {};
  for (const seed of ALL_SEEDS) { scores[seed.slug] = 0; }

  // +3 for each matching area
  for (const area of areas) {
    for (const slug of AREA_SLUG_MAP[area] ?? []) {
      scores[slug] = (scores[slug] ?? 0) + 3;
    }
  }
  // +2 for each matching time sink
  for (const sink of timeSinks) {
    const slug = TIME_SINK_SLUG_MAP[sink];
    if (slug) scores[slug] = (scores[slug] ?? 0) + 2;
  }
  // +1 for AI comfort >= 2 (can handle more complex workflows)
  if ((intake?.aiComfort ?? 0) >= 2) {
    for (const s of ["prospect-research", "seo-audit", "social-calendar"]) {
      scores[s] = (scores[s] ?? 0) + 1;
    }
  }
  // Always feature follow-up as the starting workflow
  scores["follow-up"] = (scores["follow-up"] ?? 0) + 5;

  // Upsert ClientWorkflowSettings: top-3 scored slugs are "featured" (enabled);
  // everything else is also enabled (no lockout) — visibility order is what matters.
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

  // Store the ranked slug order on Client.notes (JSON addendum) for the frontend
  const rankNote = `{"personalizedSlugs":${JSON.stringify(sorted)}}`;
  await prisma.client.update({
    where: { id: clientId },
    data: { notes: client.notes ? `${client.notes}\n__RANK__${rankNote}` : `__RANK__${rankNote}` },
  });
}

/** Extract personalizedSlugs from client notes if present. */
export function extractPersonalizedSlugs(notes: string | null): string[] | null {
  if (!notes) return null;
  const match = notes.match(/__RANK__(\{.*?\})(?:\n|$)/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]!) as { personalizedSlugs?: string[] };
    return parsed.personalizedSlugs ?? null;
  } catch { return null; }
}
