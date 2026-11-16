/**
 * Verified sign-up provisioning.
 *
 * For customer identities, on the first request with a Clerk-verified email:
 * Admin identities do not enter this automatic prospect-provisioning flow.
 *   - create a Client (tier NONE, status PROSPECT) if this user has none
 *   - attach DiscoveryIntake rows whose contact email matches and that are
 *     not already linked to a client
 *
 * Linking sets clientId only. It does not change intake status, so a new
 * submission stays in his review queue.
 * requestedTier and requestedSessions stay on the intake.
 * This does not set a paid tier. He assigns the tier after review.
 */

import { prisma } from "./db";

export async function ensureClientForVerifiedUser(
  userId: string,
  email: string,
  existingClientId: string | null,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return existingClientId;

  let clientId = existingClientId;

  if (!clientId) {
    try {
      const created = await prisma.client.create({
        data: { userId, tier: "NONE", status: "PROSPECT" },
        select: { id: true },
      });
      clientId = created.id;
    } catch (err) {
      const again = await prisma.client.findUnique({ where: { userId }, select: { id: true } });
      clientId = again?.id ?? null;
      if (!clientId) {
        console.error("[auth] could not create client profile", err);
        return null;
      }
    }
  }

  const linked = await prisma.discoveryIntake.updateMany({
    where: {
      contactEmail: { equals: normalized, mode: "insensitive" },
      clientId: null,
    },
    data: { clientId },
  });

  if (linked.count) {
    const { draftPlaybookIfMissing } = await import("../routes/playbook");
    await draftPlaybookIfMissing(clientId).catch(() => console.error("[playbook] linked assessment pending operator retry"));
  }
  return clientId;
}
