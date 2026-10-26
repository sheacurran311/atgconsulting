/**
 * Portal onboarding and personalization routes.
 *
 * GET  /api/portal/status           — intake-gate check for the client portal
 * POST /api/portal/personalize      — re-run workspace personalization
 * POST /api/admin/clients/:id/personalize — admin triggers personalization
 */

import { Router } from "express";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";
import { personalizeClientWorkspace, extractPersonalizedSlugs } from "../lib/personalization";
import { billingActive } from "../lib/access";

const router = Router();

// ── Portal status ─────────────────────────────────────────────────────────────

router.get("/portal/status", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;

  // Attempt to auto-link any anonymous intake by email if still unlinked
  if (user.email && !user.clientId) {
    const latestIntake = await prisma.intake.findFirst({
      where: { email: user.email.toLowerCase(), clientId: null },
      orderBy: { createdAt: "desc" },
    });
    if (latestIntake) {
      // Claim it — creates the Client row if absent
      const age = Date.now() - latestIntake.createdAt.getTime();
      const within7d = age < 7 * 24 * 60 * 60 * 1000;
      if (within7d) {
        // reuse the plan-claim logic — create Client and link
        let client = await prisma.client.findFirst({ where: { userId: user.id } });
        if (!client) {
          const answers = latestIntake.answers
            ? (() => { try { return JSON.parse(latestIntake.answers) as Record<string, string>; } catch { return null; } })()
            : null;
          client = await prisma.client.create({
            data: {
              userId: user.id,
              industry:  answers?.industry ?? null,
              roleTitle: answers?.role ?? null,
              aiLevel:   latestIntake.aiComfort,
              areas:     latestIntake.areas,
              helpStyle: latestIntake.helpStyle,
              tier: "NONE",
              status: "PROSPECT",
            },
          });
          await prisma.intake.update({ where: { id: latestIntake.id }, data: { clientId: client.id, status: "CONVERTED" } });
          await personalizeClientWorkspace(client.id).catch(console.error);
        }
      }
    }
  }

  // Re-resolve after potential auto-link
  const client = user.clientId
    ? await prisma.client.findUnique({
        where: { id: user.clientId },
        include: { intakes: { orderBy: { createdAt: "desc" }, take: 1 } },
      })
    : await prisma.client.findFirst({ where: { userId: user.id }, include: { intakes: { orderBy: { createdAt: "desc" }, take: 1 } } });

  const hasIntake = (client?.intakes?.length ?? 0) > 0;
  const personalizedSlugs = extractPersonalizedSlugs(client?.notes ?? null);

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
