/**
 * Apply one Guided package use. Locks the client row so two saves cannot
 * both increment, and a session plus a consultation on the same UTC day
 * count once.
 */
import { prisma } from "./db";
import { guidedUsedAfterComplete } from "./guidedPackage";

export function utcDayRange(when: Date): { start: Date; end: Date } {
  const start = new Date(when);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function applyGuidedCount(input: {
  clientId: string;
  kind: "session" | "consultation";
  recordId: string;
  when: Date;
  counts: boolean;
  alreadyCounted: boolean;
}): Promise<void> {
  if (!input.counts || input.alreadyCounted) return;
  const { start, end } = utcDayRange(input.when);

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Client" WHERE "id" = ${input.clientId} FOR UPDATE`;
    const owner = await tx.client.findUnique({
      where: { id: input.clientId },
      select: { tier: true, guidedSessionsTotal: true, guidedSessionsUsed: true },
    });
    if (!owner) return;

    const [sessionSibling, consultationSibling] = await Promise.all([
      tx.sessionRecord.findFirst({
        where: {
          clientId: input.clientId,
          packageCounted: true,
          sessionType: "guided",
          sessionDate: { gte: start, lt: end },
          ...(input.kind === "session" ? { id: { not: input.recordId } } : {}),
        },
        select: { id: true },
      }),
      tx.consultation.findFirst({
        where: {
          clientId: input.clientId,
          packageCounted: true,
          scheduledAt: { gte: start, lt: end },
          ...(input.kind === "consultation" ? { id: { not: input.recordId } } : {}),
        },
        select: { id: true },
      }),
    ]);

    const next = guidedUsedAfterComplete({
      tier: owner.tier,
      total: owner.guidedSessionsTotal,
      used: owner.guidedSessionsUsed,
      counts: true,
      alreadyCounted: false,
      sameDayAlreadyCounted: Boolean(sessionSibling || consultationSibling),
    });
    if (!next.markCounted) return;

    const claimed = input.kind === "session"
      ? await tx.sessionRecord.updateMany({ where: { id: input.recordId, packageCounted: false }, data: { packageCounted: true } })
      : await tx.consultation.updateMany({ where: { id: input.recordId, packageCounted: false }, data: { packageCounted: true } });
    if (claimed.count !== 1) return;

    if (next.used !== owner.guidedSessionsUsed) {
      await tx.client.update({ where: { id: input.clientId }, data: { guidedSessionsUsed: next.used } });
    }
  });
}

export async function releaseGuidedCount(input: {
  clientId: string;
  when: Date;
  wasCounted: boolean;
}): Promise<void> {
  if (!input.wasCounted) return;
  const { start, end } = utcDayRange(input.when);
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Client" WHERE "id" = ${input.clientId} FOR UPDATE`;
    const owner = await tx.client.findUnique({
      where: { id: input.clientId },
      select: { tier: true, guidedSessionsUsed: true },
    });
    if (!owner || owner.tier !== "GUIDED" || owner.guidedSessionsUsed <= 0) return;
    const [sessionSibling, consultationSibling] = await Promise.all([
      tx.sessionRecord.findFirst({
        where: { clientId: input.clientId, packageCounted: true, sessionType: "guided", sessionDate: { gte: start, lt: end } },
        select: { id: true },
      }),
      tx.consultation.findFirst({
        where: { clientId: input.clientId, packageCounted: true, scheduledAt: { gte: start, lt: end } },
        select: { id: true },
      }),
    ]);
    if (sessionSibling || consultationSibling) return;
    await tx.client.update({
      where: { id: input.clientId },
      data: { guidedSessionsUsed: owner.guidedSessionsUsed - 1 },
    });
  });
}
