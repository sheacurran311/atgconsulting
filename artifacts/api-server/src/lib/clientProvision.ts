/**
 * Verified sign-up provisioning.
 *
 * On the first authenticated request with a Clerk-verified email:
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

  await prisma.discoveryIntake.updateMany({
    where: {
      contactEmail: { equals: email, mode: "insensitive" },
      clientId: null,
    },
    data: { clientId },
  });

  return clientId;
}
