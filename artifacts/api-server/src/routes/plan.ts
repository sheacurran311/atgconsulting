/**
 * Plan routes — legacy plan result + claim.
 *
 * NOTE: These routes used to link to the old Intake model which has been removed.
 * The /plan/:intakeId routes are kept as a redirect/404 to avoid breaking bookmarks.
 * New intake flow: /intake (DiscoveryIntake) → DiscoveryProposal → client portal.
 */

import { Router } from "express";
import { prisma } from "../lib/db";
import { personalizeClientWorkspace } from "../lib/personalization";
import { ensureDayProfile } from "../lib/dayProfile";
import { withUser, requireAuth, type AuthedRequest } from "../lib/auth";

const router = Router();

// Legacy plan view — Plans still exist but are no longer created via the old intake form.
// This endpoint is kept so existing bookmarked plan links don't hard-404.
router.get("/plan/:intakeId", withUser, async (req, res) => {
  const intakeIdStr = Array.isArray(req.params.intakeId) ? req.params.intakeId[0]! : req.params.intakeId;

  // Check if a Plan exists for this intakeId (could be a pre-removal plan)
  const plan = await prisma.plan.findFirst({ where: { intakeId: intakeIdStr }, orderBy: { createdAt: "desc" } });
  if (!plan) { res.status(404).json({ error: "Plan not found. The intake system has been updated — please use the new assessment at /intake." }); return; }

  res.json({
    intakeId: intakeIdStr,
    plan: {
      id: plan.id,
      aiReadinessLabel: plan.aiReadinessLabel,
      aiReadinessSummary: plan.aiReadinessSummary,
      focusAreas: (() => { try { return JSON.parse(plan.focusAreas); } catch { return []; } })(),
      recommendedTier: plan.recommendedTier,
      tierRationale: plan.tierRationale,
      ctaText: plan.ctaText,
      source: plan.source,
    },
    legacy: true,
    message: "This plan was created with the old intake system. Start a new assessment at /intake for an updated recommendation.",
  });
});

// Legacy claim — kept so old claim links work, but simplified
router.post("/plan/:intakeId/claim", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const intakeIdStr = Array.isArray(req.params.intakeId) ? req.params.intakeId[0]! : req.params.intakeId;

  // Check if a plan exists for this intakeId
  const plan = await prisma.plan.findFirst({ where: { intakeId: intakeIdStr } });
  if (!plan) {
    res.status(404).json({ error: "Plan not found. The intake system has been updated — please use /intake for a new assessment." });
    return;
  }

  // If already linked to a client, just return ok
  if (plan.clientId) { res.json({ ok: true, message: "Plan already claimed." }); return; }

  // Link to user's existing client profile, or create one
  let client = await prisma.client.findFirst({ where: { userId: user.id } });
  if (!client) {
    client = await prisma.client.create({
      data: { userId: user.id, tier: "NONE", status: "PROSPECT", aiLevel: 1, areas: "[]" },
    });
  }

  await prisma.plan.update({ where: { id: plan.id }, data: { clientId: client.id } });

  personalizeClientWorkspace(client.id).catch(console.error);
  await ensureDayProfile(client.id).catch(console.error);

  res.json({ ok: true, clientId: client.id, legacy: true });
});

export default router;
