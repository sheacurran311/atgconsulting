/**
 * Admin "View as client" impersonation routes.
 *
 * POST   /api/admin/impersonate         — start impersonation for a client
 * DELETE /api/admin/impersonate         — exit impersonation
 * PATCH  /api/admin/impersonate         — toggle allowEdits
 * GET    /api/admin/impersonate/status  — current impersonation state
 * POST   /api/admin/test-client         — create or retrieve a test client per tier
 * POST   /api/admin/impersonate/self    — view the admin's own client profile
 *
 * All routes require admin auth. Non-admins get 403.
 * Impersonation events are written to AuditLog.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { gateAdminRouter, type AuthedRequest } from "../lib/auth";
import { audit } from "../lib/audit";
import {
  createImpToken, verify as verifyImp,
  setImpCookie, clearImpCookie, IMP_COOKIE,
} from "../lib/impersonate";

const router = Router();
router.use(gateAdminRouter);

// ── Start impersonation ───────────────────────────────────────────────────────

const StartBody = z.object({
  clientId: z.string().min(1).max(50),
});

router.post("/admin/impersonate", async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const parsed = StartBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "clientId is required." }); return; }

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!client) { res.status(404).json({ error: "Client not found." }); return; }

  const token = createImpToken(client.id, actor.id, false);
  setImpCookie(res, token);

  await audit({
    action: "IMPERSONATE_START",
    entity: "Client",
    entityId: client.id,
    actorUserId: actor.id,
    meta: { adminEmail: actor.email, clientName: client.user?.name ?? "—", clientTier: client.tier },
  });

  res.json({
    ok: true,
    clientId: client.id,
    clientName: client.user?.name ?? "Client",
    clientTier: client.tier,
    allowEdits: false,
    message: `Now viewing as ${client.user?.name ?? "client"} (${client.tier})`,
  });
});

// ── Exit impersonation ────────────────────────────────────────────────────────

router.delete("/admin/impersonate", async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const rawCookie = (req.cookies as Record<string, string> | undefined)?.[IMP_COOKIE];
  const token = rawCookie ? verifyImp(rawCookie) : null;

  clearImpCookie(res);

  if (token) {
    await audit({
      action: "IMPERSONATE_STOP",
      entity: "Client",
      entityId: token.clientId,
      actorUserId: actor.id,
      meta: { adminEmail: actor.email },
    });
  }

  res.json({ ok: true, message: "Impersonation ended. Returning to admin view." });
});

// ── Toggle allowEdits ─────────────────────────────────────────────────────────

const PatchBody = z.object({ allowEdits: z.boolean() });

router.patch("/admin/impersonate", async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const parsed = PatchBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "allowEdits (boolean) is required." }); return; }

  const rawCookie = (req.cookies as Record<string, string> | undefined)?.[IMP_COOKIE];
  const existing = rawCookie ? verifyImp(rawCookie) : null;
  if (!existing) { res.status(400).json({ error: "No active impersonation session." }); return; }
  if (existing.adminId !== actor.id) { res.status(403).json({ error: "Impersonation mismatch." }); return; }

  const newToken = createImpToken(existing.clientId, actor.id, parsed.data.allowEdits);
  setImpCookie(res, newToken);

  await audit({
    action: parsed.data.allowEdits ? "IMPERSONATE_EDITS_ENABLED" : "IMPERSONATE_EDITS_DISABLED",
    entity: "Client",
    entityId: existing.clientId,
    actorUserId: actor.id,
    meta: { adminEmail: actor.email, allowEdits: parsed.data.allowEdits },
  });

  res.json({ ok: true, allowEdits: parsed.data.allowEdits });
});

// ── Status ────────────────────────────────────────────────────────────────────

router.get("/admin/impersonate/status", async (req, res) => {
  const rawCookie = (req.cookies as Record<string, string> | undefined)?.[IMP_COOKIE];
  if (!rawCookie) { res.json({ active: false }); return; }
  const token = verifyImp(rawCookie);
  if (!token) { res.json({ active: false }); return; }

  const client = await prisma.client.findUnique({
    where: { id: token.clientId },
    include: { user: { select: { name: true } } },
  });

  res.json({
    active: true,
    clientId: token.clientId,
    clientName: client?.user?.name ?? "—",
    clientTier: client?.tier ?? "—",
    allowEdits: token.allowEdits,
    expiresAt: new Date(token.expiresAt).toISOString(),
  });
});

// ── Test client ───────────────────────────────────────────────────────────────

const TEST_CLIENT_TIERS = ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"] as const;
type TestTier = typeof TEST_CLIENT_TIERS[number];

const TestClientBody = z.object({
  tier: z.enum(TEST_CLIENT_TIERS),
});

const TEST_INTAKE_ANSWERS: Record<TestTier, object> = {
  SELF_SERVE: {
    name: "Alex Test", email: "test-self-serve@atg-test.internal",
    role: "Business owner", industry: "professional_services", bizSize: "solo",
    areas: ["sales", "executive_assistant"], aiComfort: 2, hoursLost: 12,
    helpStyle: "self_serve", timeSinks: ["email", "followups"],
    automateFirst: "Follow-up emails after client meetings",
    toolBudget: "$50-150/mo", currentSoftware: "Gmail, Google Sheets, Calendly",
    weeklyVolumes: "10-50/wk",
    aiPlatforms: ["grok_bot", "claude"],
    setupComfort: "somewhat_comfortable",
  },
  GUIDED: {
    name: "Sam Test", email: "test-guided@atg-test.internal",
    role: "Agency owner", industry: "marketing", bizSize: "2-10",
    areas: ["marketing", "sales"], aiComfort: 2, hoursLost: 18,
    helpStyle: "guided", timeSinks: ["social_content", "followups", "email"],
    automateFirst: "Weekly social content calendar",
    toolBudget: "$150-500/mo", currentSoftware: "Gmail, HubSpot, Buffer",
    weeklyVolumes: "50-200/wk",
    aiPlatforms: ["grok_bot"],
    setupComfort: "very_comfortable",
  },
  WHITE_GLOVE: {
    name: "Jordan Test", email: "test-dfy@atg-test.internal",
    role: "Owner", industry: "home_services", bizSize: "2-10",
    areas: ["sales", "customer_support"], aiComfort: 1, hoursLost: 25,
    helpStyle: "done_for_you", timeSinks: ["followups", "email", "admin"],
    automateFirst: "Customer follow-ups after service calls",
    toolBudget: "$150-500/mo", currentSoftware: "Gmail, QuickBooks",
    weeklyVolumes: "50-200/wk",
    aiPlatforms: ["grok_bot", "claude"],
    setupComfort: "need_guidance",
  },
};

router.post("/admin/test-client", async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const parsed = TestClientBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "tier must be SELF_SERVE, GUIDED, or WHITE_GLOVE." }); return; }

  const { tier } = parsed.data;
  const answers = TEST_INTAKE_ANSWERS[tier];
  const testTag = `test-${tier.toLowerCase()}`;

  // Reuse existing test client if present (idempotent)
  const existing = await prisma.client.findFirst({
    where: { notes: { contains: `__TEST__${testTag}` } },
    select: { id: true, tier: true, user: { select: { name: true } } },
  });

  if (existing) {
    const token = createImpToken(existing.id, actor.id, false);
    setImpCookie(res, token);
    await audit({ action: "IMPERSONATE_START", entity: "Client", entityId: existing.id, actorUserId: actor.id, meta: { adminEmail: actor.email, testClient: true, tier } });
    res.json({ ok: true, clientId: existing.id, clientName: existing.user?.name ?? "Test Client", isNew: false });
    return;
  }

  // Create test user + client + intake
  const testUser = await prisma.user.create({
    data: {
      email: null, // no real email — internal test only
      name: (answers as { name: string }).name,
      role: "CLIENT",
    },
  });

  const testClient = await prisma.client.create({
    data: {
      userId: testUser.id,
      tier,
      status: "ACTIVE",
      industry: (answers as Record<string, string>).industry,
      roleTitle: (answers as Record<string, string>).role,
      size: (answers as Record<string, string>).bizSize,
      aiLevel: (answers as Record<string, number>).aiComfort,
      areas: JSON.stringify((answers as Record<string, unknown>).areas),
      helpStyle: (answers as Record<string, string>).helpStyle,
      notes: `__TEST__${testTag}\n__RANK__{"personalizedSlugs":["follow-up","inbox-triage","social-calendar"]}`,
    },
  });


  const token = createImpToken(testClient.id, actor.id, false);
  setImpCookie(res, token);

  await audit({ action: "IMPERSONATE_START", entity: "Client", entityId: testClient.id, actorUserId: actor.id, meta: { adminEmail: actor.email, testClient: true, tier, isNew: true } });

  res.status(201).json({ ok: true, clientId: testClient.id, clientName: testUser.name ?? "Test Client", clientTier: tier, isNew: true });
});

// ── My account as client ──────────────────────────────────────────────────────

router.post("/admin/impersonate/self", async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const client = await prisma.client.findUnique({
    where: { userId: actor.id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!client) {
    res.status(404).json({
      error: "Your account has no client profile yet. Pick a test client or a real client.",
    });
    return;
  }

  const token = createImpToken(client.id, actor.id, false);
  setImpCookie(res, token);
  await audit({
    action: "IMPERSONATE_START",
    entity: "Client",
    entityId: client.id,
    actorUserId: actor.id,
    meta: { adminEmail: actor.email, self: true, clientTier: client.tier },
  });

  const clientName = client.user?.name ?? actor.name ?? "My account";
  res.json({
    ok: true,
    clientId: client.id,
    clientName,
    clientTier: client.tier,
    message: `Now viewing as ${clientName} (${client.tier})`,
  });
});

export default router;
