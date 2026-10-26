/**
 * Plan routes — public plan result + claim into account.
 * GET  /api/plan/:intakeId          — public, time-limited (7 days)
 * POST /api/plan/:intakeId/claim    — claim plan to authenticated user's client
 */

import { Router } from "express";
import { prisma } from "../lib/db";
import { personalizeClientWorkspace } from "../lib/personalization";
import { withUser, requireAuth, type AuthedRequest } from "../lib/auth";

const router = Router();
const CLAIM_WINDOW_DAYS = 7;

router.get("/plan/:intakeId", withUser, async (req, res) => {
  const { intakeId } = req.params;
  const intakeIdStr = Array.isArray(intakeId) ? intakeId[0] : intakeId;
  const intake = await prisma.intake.findUnique({
    where: { id: intakeIdStr },
  });
  if (!intake) { res.status(404).json({ error: "Plan not found." }); return; }

  const plan = await prisma.plan.findFirst({ where: { intakeId: intakeIdStr }, orderBy: { createdAt: "desc" } });

  const ageDays = (Date.now() - intake.createdAt.getTime()) / 86_400_000;
  const user = (req as AuthedRequest).atgUser;
  const isOwner = user && (user.email?.toLowerCase() === intake.email.toLowerCase() || intake.clientId === user.clientId);
  const isAdmin = user?.role === "ADMIN";

  if (ageDays > CLAIM_WINDOW_DAYS && !isOwner && !isAdmin) {
    res.status(410).json({ error: "This plan link has expired. Sign in to access your saved plan." });
    return;
  }

  res.json({
    intakeId: intake.id,
    name: intake.name,
    email: intake.email,
    claimed: !!intake.clientId,
    plan: plan
      ? {
          id: plan.id,
          aiReadinessLabel: plan.aiReadinessLabel,
          aiReadinessSummary: plan.aiReadinessSummary,
          focusAreas: JSON.parse(plan.focusAreas),
          recommendedTier: plan.recommendedTier,
          tierRationale: plan.tierRationale,
          ctaText: plan.ctaText,
          source: plan.source,
        }
      : null,
  });
});

router.post("/plan/:intakeId/claim", withUser, requireAuth, async (req, res) => {
  const intakeId = Array.isArray(req.params.intakeId) ? req.params.intakeId[0]! : req.params.intakeId;
  const user = (req as AuthedRequest).atgUser!;

  const intake = await prisma.intake.findUnique({ where: { id: intakeId } });
  if (!intake) { res.status(404).json({ error: "Plan not found." }); return; }

  if (user.role !== "ADMIN") {
    const userEmail = user.email?.trim().toLowerCase() ?? "";
    if (!userEmail) {
      res.status(403).json({ error: "Add an email to your account before saving this plan." });
      return;
    }
    if (userEmail !== intake.email.trim().toLowerCase()) {
      res.status(403).json({ error: "Sign in with the email you used on the intake to save this plan." });
      return;
    }
  }

  if (intake.clientId) { res.json({ ok: true, message: "Plan already claimed." }); return; }

  const ageDays = (Date.now() - intake.createdAt.getTime()) / 86_400_000;
  if (ageDays > CLAIM_WINDOW_DAYS) { res.status(410).json({ error: "Claim window has expired." }); return; }

  let client = await prisma.client.findUnique({ where: { userId: user.id } });
  if (!client) {
    const answers = intake.answers ? (() => { try { return JSON.parse(intake.answers) as Record<string, string>; } catch { return null; } })() : null;
    client = await prisma.client.create({
      data: {
        userId: user.id,
        industry: answers?.industry ?? null,
        roleTitle: answers?.role ?? null,
        aiLevel: intake.aiComfort,
        areas: intake.areas,
        helpStyle: intake.helpStyle,
        tier: "NONE",
        status: "PROSPECT",
      },
    });
  }

  await prisma.intake.update({ where: { id: intakeId }, data: { clientId: client.id, status: "CONVERTED" } });

  const plans = await prisma.plan.findMany({ where: { intakeId } });
  for (const plan of plans) {
    await prisma.plan.update({ where: { id: plan.id }, data: { clientId: client.id } });
    const focusAreas: { area: string; name: string }[] = (() => {
      try { return JSON.parse(plan.focusAreas) as { area: string; name: string }[]; } catch { return []; }
    })();
    for (let i = 0; i < focusAreas.length; i++) {
      await prisma.workflowItem.upsert({
        where: { id: `${plan.id}-${i}` },
        update: {},
        create: { id: `${plan.id}-${i}`, clientId: client.id, planId: plan.id, area: focusAreas[i]!.area, title: focusAreas[i]!.name, order: i },
      });
    }
  }

  // Seed personalized workspace from intake data
  personalizeClientWorkspace(client.id).catch(console.error);

  res.json({ ok: true, clientId: client.id });
});

export default router;
