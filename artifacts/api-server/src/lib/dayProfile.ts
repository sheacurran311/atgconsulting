/**
 * Creates a DayProfile from the latest intake when the day questions were answered.
 * Does not overwrite a profile the client has already saved.
 */

import { prisma } from "./db";
import { profileFromAnswers, type DayProfileInput } from "./dayPlan";

export function parseIntakeAnswers(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function toProfileData(profile: DayProfileInput) {
  return {
    timezone: profile.timezone,
    workDays: JSON.stringify(profile.workDays),
    startMin: profile.startMin,
    endMin: profile.endMin,
    typicalDay: JSON.stringify(profile.typicalDay),
    typicalNote: profile.typicalNote,
    scope: profile.scope,
    teamNote: profile.teamNote,
  };
}

export async function ensureDayProfile(clientId: string): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { intakes: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!client) return;

  const answers = parseIntakeAnswers(client.intakes[0]?.answers);
  const bizSize = typeof answers?.bizSize === "string" ? answers.bizSize : null;
  if (bizSize && !client.size) {
    await prisma.client.update({ where: { id: clientId }, data: { size: bizSize } });
  }

  const existing = await prisma.dayProfile.findUnique({ where: { clientId } });
  if (existing) return;

  const profile = profileFromAnswers(answers);
  if (!profile) return;
  await prisma.dayProfile.create({ data: { clientId, ...toProfileData(profile) } });
}
