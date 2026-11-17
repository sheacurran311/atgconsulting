import { prisma } from "./db";

/** An earlier, client-owned intake result remains valid onboarding evidence. */
export async function legacyAssessmentFor(clientId: string) {
  return prisma.plan.findFirst({ where: { clientId, intakeId: { not: null } }, select: { id: true, createdAt: true }, orderBy: { createdAt: "desc" } });
}

/** Only unclaimed, submitted records with the exact normalized email can attach. */
export async function linkSubmittedAssessments(clientId: string, email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return 0;
  const result = await prisma.discoveryIntake.updateMany({
    where: { clientId: null, consentGiven: true, contactEmail: { equals: normalized, mode: "insensitive" } },
    data: { clientId },
  });
  return result.count;
}
