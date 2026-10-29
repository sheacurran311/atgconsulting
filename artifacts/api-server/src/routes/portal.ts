/**
 * Portal onboarding and personalization routes.
 *
 * GET  /api/portal/status           — intake-gate check for the client portal
 * POST /api/portal/personalize      — re-run workspace personalization
 * POST /api/admin/clients/:id/personalize — admin triggers personalization
 */

import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import type { Request } from "express";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";
import { personalizeClientWorkspace, extractPersonalizedSlugs } from "../lib/personalization";
import { ensureDayProfile } from "../lib/dayProfile";
import { billingActive } from "../lib/access";

const router = Router();

// ── Portal status ─────────────────────────────────────────────────────────────

router.get("/portal/status", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;

  // Verify the Clerk primary email is confirmed before using it for linking.
  // We check this here (not in resolveUser) to avoid an extra Clerk API call on every request.
  let isEmailVerified = false;
  if (user.email) {
    try {
      const { userId: clerkId } = getAuth(req as Request);
      if (clerkId) {
        const clerkUser = await clerkClient.users.getUser(clerkId);
        const primary = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId);
        isEmailVerified = primary?.verification?.status === "verified";
      }
    } catch { /* non-fatal */ }
  }

  // Legacy intake auto-link removed (Intake table dropped)

  // Auto-link DiscoveryIntake records when verified email matches (on any sign-in).
  // Only link if email is Clerk-verified. Never link on unverified emails.
  if (user.email && isEmailVerified) {
    const resolvedClientId = user.clientId
      ?? (await prisma.client.findFirst({ where: { userId: user.id }, select: { id: true } }))?.id;

    if (resolvedClientId) {
      // Find unlinked DiscoveryIntakes with matching email (case-insensitive)
      const unlinked = await prisma.discoveryIntake.findMany({
        where: {
          contactEmail: { equals: user.email, mode: "insensitive" },
          clientId: null,
          status: { not: "converted" },
        },
        select: { id: true },
        take: 5,
      });
      for (const di of unlinked) {
        await prisma.discoveryIntake.update({
          where: { id: di.id },
          data: { clientId: resolvedClientId, status: "converted" },
        }).catch(console.error);
      }
    }
  }

  // Re-resolve after potential auto-link
  const client = user.clientId
    ? await prisma.client.findUnique({
        where: { id: user.clientId },
      })
    : await prisma.client.findFirst({ where: { userId: user.id }, });

  // Check if there's at least one DiscoveryIntake for this client
  const hasIntake = client?.id
    ? (await prisma.discoveryIntake.count({ where: { clientId: client.id } })) > 0
    : false;
  const personalizedSlugs = extractPersonalizedSlugs(client?.notes ?? null);

  // Check for an approved discovery proposal linked to this client via intake
  const linkedIntakes = client?.id
    ? await prisma.discoveryIntake.findMany({
        where: { clientId: client.id },
        select: { id: true },
      }).catch(() => [])
    : [];
  const linkedIntakeIds = linkedIntakes.map((i) => i.id);
  const discoveryProposal = linkedIntakeIds.length > 0
    ? await prisma.discoveryProposal.findFirst({
        where: {
          discoveryIntakeId: { in: linkedIntakeIds },
          status: { in: ["approved", "portal_published"] },
        },
        select: { id: true, status: true, approvedAt: true },
        orderBy: { approvedAt: "desc" },
      }).catch(() => null)
    : null;

  res.json({
    hasClient:  !!client,
    hasIntake,
    clientId:   client?.id ?? null,
    tier:       client?.tier ?? "NONE",
    /** If true, all workflow tiers are unlocked (BILLING_ENABLED not set to "true"). */
    testMode:   !billingActive(),
    personalizedSlugs: personalizedSlugs ?? [],
    intakePrefill: {
      email: user.email,
      name:  user.name,
    },
    /** Non-null when an approved proposal is available for this client to view */
    discoveryProposal: discoveryProposal
      ? { id: discoveryProposal.id, status: discoveryProposal.status, approvedAt: discoveryProposal.approvedAt }
      : null,
  });
});

// ── Personalize (client-initiated) ────────────────────────────────────────────

router.post("/portal/personalize", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.status(404).json({ error: "No client profile. Complete the intake first." }); return; }
  await personalizeClientWorkspace(user.clientId);
  res.json({ ok: true });
});

// ── Admin: re-run personalization ─────────────────────────────────────────────

router.post("/admin/clients/:id/personalize", withUser, requireAdmin, async (req, res) => {
  const client = await prisma.client.findUnique({ where: { id: req.params.id as string } });
  if (!client) { res.status(404).json({ error: "Client not found." }); return; }
  await personalizeClientWorkspace(client.id);
  res.json({ ok: true, message: "Workspace personalized from latest intake." });
});

export default router;
