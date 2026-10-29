/**
 * Verified sign-up provisioning.
 *
 * On the first authenticated request with a Clerk-verified email:
 *   - create a Client (tier NONE, status PROSPECT) if this user has none
 *   - attach DiscoveryIntake rows whose contact email matches and that are
 *     not already linked to a client
 *
 * Linking sets clientId only. It does not change intake status, so a new
 * submission stays in Shea's review queue.
 * An existing client's tier and status are left alone.
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

  await applyRequestedTier(clientId);

  return clientId;
}

const TIER_FROM_REQUEST: Record<string, string> = {
  SELF_SERVE: "SELF_SERVE",
  GUIDED: "GUIDED",
};

/** Copy a prospect's chosen Self-serve or Guided tier onto a still-unset client. */
async function applyRequestedTier(clientId: string): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { tier: true, guidedSessionsTotal: true },
  });
  if (!client || client.tier !== "NONE") return;

  const intake = await prisma.discoveryIntake.findFirst({
    where: { clientId, requestedTier: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { requestedTier: true, requestedSessions: true },
  });
  if (!intake?.requestedTier) return;

  if (intake.requestedTier === "WHITE_GLOVE") {
    await prisma.client.update({
      where: { id: clientId },
      data: { helpStyle: "done_for_you" },
    });
    return;
  }

  const tier = TIER_FROM_REQUEST[intake.requestedTier];
  if (!tier) return;
  const sessions = intake.requestedSessions === 5 ? 5 : 3;
  await prisma.client.update({
    where: { id: clientId },
    data: {
      tier,
      helpStyle: tier === "GUIDED" ? "guided" : "self_serve",
      ...(tier === "GUIDED" && client.guidedSessionsTotal == null ? { guidedSessionsTotal: sessions } : {}),
    },
  });
}
