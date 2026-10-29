/**
 * Portal onboarding and personalization routes.
 *
 * GET  /api/portal/status           — intake-gate check for the client portal
 * GET  /api/portal/proposal         — approved proposal for the signed-in client
 * POST /api/portal/personalize      — re-run workspace personalization
 * POST /api/admin/clients/:id/personalize — admin triggers personalization
 *
 * Client creation and intake linking happen in resolveUser for a
 * Clerk-verified email. This router only reads the result.
 */

import { Router } from "express";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";
import { personalizeClientWorkspace, extractPersonalizedSlugs } from "../lib/personalization";
import { billingActive } from "../lib/access";
import { clientProposalState, toClientProposal } from "../lib/clientProposal";

const router = Router();

// ── Portal status ─────────────────────────────────────────────────────────────

router.get("/portal/access-log", withUser, requireAuth, async (req, res) => {
  const clientId = (req as AuthedRequest).atgUser?.clientId;
  if (!clientId) { res.json([]); return; }
  const entries = await prisma.clientAccessLog.findMany({
    where: { clientId },
    orderBy: { grantedDate: "desc" },
    select: {
      id: true,
      accountSystem: true,
      accessType: true,
      grantedDate: true,
      revokedDate: true,
      notes: true,
    },
  });
  res.json(entries);
});

router.get("/portal/status", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;

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

// ── Approved proposal ─────────────────────────────────────────────────────────
// Drafts and Shea's internal review notes are not returned.

router.get("/portal/proposal", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) {
    res.json({ state: clientProposalState({ clientId: null, intakeCount: 0, hasApproved: false }) });
    return;
  }

  const intakes = await prisma.discoveryIntake.findMany({
    where: { clientId: user.clientId },
    select: { id: true, contactName: true },
    orderBy: { createdAt: "desc" },
  });

  const proposal = intakes.length === 0
    ? null
    : await prisma.discoveryProposal.findFirst({
        where: {
          discoveryIntakeId: { in: intakes.map((i) => i.id) },
          status: { in: ["approved", "portal_published"] },
        },
        orderBy: { approvedAt: "desc" },
      });

  const state = clientProposalState({
    clientId: user.clientId,
    intakeCount: intakes.length,
    hasApproved: !!proposal,
  });

  if (!proposal || state !== "ready") {
    res.json({ state });
    return;
  }

  const intake = intakes.find((i) => i.id === proposal.discoveryIntakeId);
  res.json({
    state,
    proposal: toClientProposal(proposal, intake?.contactName ?? null),
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
