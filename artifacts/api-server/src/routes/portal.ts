import { savedQuote } from "../lib/customQuote";
import { livePaymentsEnabled, testPaymentsEnabled } from "../lib/quotePayments";
import { legacyAssessmentFor } from "../lib/assessmentPresence";
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

import { Router, type RequestHandler } from "express";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";
import { personalizeClientWorkspace, extractPersonalizedSlugs } from "../lib/personalization";
import { testModeForActor } from "../lib/access";
import { clientProposalState, toClientProposal } from "../lib/clientProposal";

export function createPortalRouter(resolve: RequestHandler = withUser) {
const router = Router();

// ── Portal status ─────────────────────────────────────────────────────────────

router.get("/portal/access-log", resolve, requireAuth, async (req, res) => {
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

router.get("/portal/status", resolve, requireAuth, async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  const user = (req as AuthedRequest).atgUser!;

  const client = user.clientId
    ? await prisma.client.findUnique({
        where: { id: user.clientId },
        include: { user: { select: { email: true, name: true } } },
      })
    : await prisma.client.findFirst({ where: { userId: user.id }, include: { user: { select: { email: true, name: true } } } });

  // Check if there's at least one DiscoveryIntake for this client
  const hasSubmittedIntake = client?.id
    ? (await prisma.discoveryIntake.count({ where: { clientId: client.id, consentGiven: true } })) > 0
    : false;
  const legacy = client?.id && !hasSubmittedIntake ? await legacyAssessmentFor(client.id) : null;
  const hasIntake = hasSubmittedIntake || !!legacy;
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
    assessmentSource: hasSubmittedIntake ? "discovery" : legacy ? "legacy" : "none",
    clientId:   client?.id ?? null,
    tier:       client?.tier ?? "NONE",
    /** True only for an admin while ADMIN_TEST_MODE=true. */
    testMode:   testModeForActor(user.role),
    personalizedSlugs: personalizedSlugs ?? [],
    intakePrefill: {
      email: user.isImpersonating ? client?.user?.email ?? null : user.email,
      name:  user.isImpersonating ? client?.user?.name ?? null : user.name,
    },
    /** Non-null when an approved proposal is available for this client to view */
    discoveryProposal: discoveryProposal
      ? { id: discoveryProposal.id, status: discoveryProposal.status, approvedAt: discoveryProposal.approvedAt }
      : null,
  });
});

// ── Approved proposal ─────────────────────────────────────────────────────────
// Drafts and Shea's internal review notes are not returned.

router.get("/portal/proposal", resolve, requireAuth, async (req, res) => {
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
  const testPayments = testPaymentsEnabled();
  const livePayments = livePaymentsEnabled();
  const stages = testPayments || livePayments ? savedQuote(proposal.investment)?.installments ?? [] : [];
  const payments = stages.length && proposal.acceptedAt ? await prisma.quoteInstallment.findMany({
    where:{proposalId:proposal.id, clientId:user.clientId}, select:{stage:true, paidAt:true, refundedCents:true, liveMode:true, authorizedAt:true},
  }) : [];
  res.json({
    state,
    proposal: {
      ...toClientProposal(proposal, intake?.contactName ?? null),
      testInstallments: testPayments ? stages.flatMap((item, stage) => {
        const payment = payments.find(row => row.stage === stage);
        return payment?.liveMode ? [] : [{...item, stage, status:payment?.refundedCents ? "Refund recorded" : payment?.paidAt ? "Paid" : "Unpaid"}];
      }) : [],
      liveInstallments: livePayments ? stages.flatMap((item, stage) => {
        const payment = payments.find(row => row.stage === stage);
        return payment?.liveMode && payment.authorizedAt
          ? [{...item, stage, status:payment.refundedCents ? "Refund recorded" : payment.paidAt ? "Paid" : "Unpaid"}] : [];
      }) : [],
    },
  });
});

router.post("/portal/proposal/accept", resolve, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (user.isImpersonating) {
    res.status(403).json({ error: "Exit view-as-client before accepting a proposal." });
    return;
  }
  if (!user.clientId) { res.status(404).json({ error: "No client profile." }); return; }
  const intakes = await prisma.discoveryIntake.findMany({
    where: { clientId: user.clientId },
    select: { id: true, contactName: true },
  });
  const proposal = await prisma.discoveryProposal.findFirst({
    where: {
      discoveryIntakeId: { in: intakes.map((i) => i.id) },
      status: { in: ["approved", "portal_published"] },
    },
    orderBy: { approvedAt: "desc" },
  });
  if (!proposal) { res.status(404).json({ error: "No approved proposal to accept." }); return; }
  const requiresVersion = !!savedQuote(proposal.investment) || req.body?.proposalId !== undefined;
  if (requiresVersion && (req.body?.proposalId !== proposal.id || req.body?.approvedAt !== proposal.approvedAt?.toISOString())) {
    res.status(409).json({error:"The approved proposal changed. Reload and review before accepting."});
    return;
  }
  if (proposal.acceptedAt) {
    res.json({ ok: true, acceptedAt: proposal.acceptedAt, acceptedByName: proposal.acceptedByName });
    return;
  }
  const name = user.name ?? intakes.find((i) => i.id === proposal.discoveryIntakeId)?.contactName ?? "Client";
  await prisma.discoveryProposal.updateMany({
    where: { id: proposal.id, approvedAt: proposal.approvedAt, acceptedAt: null, status: { in: ["approved", "portal_published"] } },
    data: { acceptedAt: new Date(), acceptedByName: name },
  });
  const updated = await prisma.discoveryProposal.findUniqueOrThrow({ where: {id: proposal.id} });
  if (!updated.acceptedAt) { res.status(409).json({error:"Reload the current proposal."}); return; }
  res.json({ ok: true, acceptedAt: updated.acceptedAt, acceptedByName: updated.acceptedByName });
});

// ── Personalize (client-initiated) ────────────────────────────────────────────

router.post("/portal/personalize", resolve, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.status(404).json({ error: "No client profile. Complete the intake first." }); return; }
  await personalizeClientWorkspace(user.clientId);
  res.json({ ok: true });
});

// ── Admin: re-run personalization ─────────────────────────────────────────────

router.post("/admin/clients/:id/personalize", resolve, requireAdmin, async (req, res) => {
  const client = await prisma.client.findUnique({ where: { id: req.params.id as string } });
  if (!client) { res.status(404).json({ error: "Client not found." }); return; }
  await personalizeClientWorkspace(client.id);
  res.json({ ok: true, message: "Workspace personalized from latest intake." });
});

return router;
}
export default createPortalRouter();
