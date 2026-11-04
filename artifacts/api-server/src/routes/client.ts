/**
 * Client portal routes — authenticated client accessing their own data.
 * All routes require auth. Clients can only see their own data.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, type AuthedRequest } from "../lib/auth";
import { helpStyleFromIntake } from "../lib/intakeHelpStyle";
import { adminTestMode } from "../lib/access";
import { clientProposalState, parseMilestones } from "../lib/clientProposal";
import { extractPersonalizedSlugs } from "../lib/personalization";
import { buildNextActions, workflowRowState } from "../lib/clientHome";

const router = Router();
router.use(withUser, requireAuth);

function getClient(req: AuthedRequest, res: Parameters<typeof requireAuth>[1]): string | null {
  const user = req.atgUser!;
  if (!user.clientId) {
    res.status(404).json({ error: "No client profile found. Complete the intake form first." });
    return null;
  }
  return user.clientId;
}

// ── Dashboard / profile ───────────────────────────────────────────────────────

router.get("/client/me", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const client = user.clientId
    ? await prisma.client.findUnique({
        where: { id: user.clientId },
        include: { plans: { orderBy: { createdAt: "desc" }, take: 1 } },
      })
    : null;

  const isAdmin = user.role === "ADMIN";
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
    role: user.role,
    isAdmin,
    clientId: user.clientId,
    tier: client?.tier ?? "NONE",
    status: client?.status ?? null,
    digestEmailOptIn: client?.digestEmailOptIn ?? true,
    helpStyle: client?.helpStyle ?? null,
  });
});

router.get("/client/dashboard", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;

  const [
    client,
    workflowItems,
    recentConsultation,
    recentReport,
    activeDocCount,
    intakes,
    approvedPlan,
    pendingOutputs,
    openActionItems,
    latestMessage,
    unreadMessages,
    tickets,
    dfy,
    accessCount,
    installSettings,
  ] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, include: { user: true } }),
    prisma.workflowItem.findMany({
      where: { clientId },
      orderBy: [{ done: "asc" }, { order: "asc" }],
      take: 10,
    }),
    prisma.consultation.findFirst({
      where: { clientId, scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.report.findFirst({
      where: { clientId, status: "PUBLISHED" },
      orderBy: { date: "desc" },
    }),
    prisma.document.count({ where: { clientId, visibleToClient: true } }),
    prisma.discoveryIntake.findMany({
      where: { clientId },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.toolPlan.findFirst({
      where: { clientId, status: "approved" },
      orderBy: { approvedAt: "desc" },
      select: { approvedAt: true, status: true },
    }),
    prisma.outputItem.count({ where: { clientId, status: "pending" } }),
    prisma.actionItem.count({ where: { owner: "CLIENT", done: false, consultation: { clientId } } }),
    prisma.clientMessage.findFirst({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      select: { body: true, fromAdmin: true, createdAt: true },
    }),
    prisma.clientMessage.count({ where: { clientId, fromAdmin: true, readAt: null } }),
    prisma.supportTicket.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, subject: true, status: true, createdAt: true },
    }),
    prisma.dfyApplication.findUnique({ where: { clientId }, select: { status: true, createdAt: true } }),
    prisma.clientAccessLog.count({ where: { clientId } }),
    prisma.clientWorkflowSettings.findMany({
      where: { clientId },
      select: { slug: true, enabled: true, installStatus: true, installedAt: true },
    }),
  ]);

  const intakeIds = intakes.map((row) => row.id);
  const proposals = intakeIds.length
    ? await prisma.discoveryProposal.findMany({
        where: { discoveryIntakeId: { in: intakeIds } },
        select: { status: true, approvedAt: true, milestones: true },
      })
    : [];
  const approvedProposal = proposals.find((row) => row.status === "approved" || row.status === "portal_published") ?? null;
  const proposalState = clientProposalState({
    clientId,
    intakeCount: intakes.length,
    hasApproved: !!approvedProposal,
  });
  const personalized = extractPersonalizedSlugs(client?.notes ?? null) ?? [];
  const templates = personalized.length
    ? await prisma.workflowTemplate.findMany({
        where: { slug: { in: personalized } },
        select: { slug: true, name: true, minTier: true, enabled: true },
      })
    : [];
  const templateBySlug = new Map(templates.map((row) => [row.slug, row]));
  const settingBySlug = new Map(installSettings.map((row) => [row.slug, row]));
  const testMode = adminTestMode();
  const tier = client?.tier ?? "NONE";
  const guidedTotal = client?.guidedSessionsTotal ?? null;
  const guidedUsed = client?.guidedSessionsUsed ?? 0;
  const guided = tier === "GUIDED" && guidedTotal != null
    ? { total: guidedTotal, used: guidedUsed, remaining: guidedTotal - guidedUsed }
    : null;

  res.json({
    client,
    workflowItems,
    recentConsultation,
    recentReport,
    activeDocCount,
    home: {
      where: {
        hasIntake: intakes.length > 0,
        intakeAt: intakes[0]?.createdAt ?? null,
        proposalState,
        proposalApprovedAt: approvedProposal?.approvedAt ?? null,
        planReady: !!approvedPlan,
        planApprovedAt: approvedPlan?.approvedAt ?? null,
      },
      plan: {
        tier,
        status: client?.status ?? null,
        testMode,
        helpStyle: client?.helpStyle ?? null,
      },
      toolPlan: {
        ready: !!approvedPlan,
        approvedAt: approvedPlan?.approvedAt ?? null,
      },
      nextActions: buildNextActions({
        guidedRemaining: guided?.remaining ?? null,
        unreadMessages,
        pendingOutputs,
        openActionItems,
      }),
      workflows: personalized.flatMap((slug) => {
        const template = templateBySlug.get(slug);
        if (!template) return [];
        const setting = settingBySlug.get(slug);
        return [{
          slug,
          name: template.name,
          state: workflowRowState({
            clientTier: tier,
            minTier: template.minTier,
            templateEnabled: template.enabled,
            overrideEnabled: setting?.enabled,
            installStatus: setting?.installStatus,
            installedAt: setting?.installedAt,
            testMode,
          }),
        }];
      }),
      guided,
      dfy: {
        show: client?.helpStyle === "done_for_you" || tier === "WHITE_GLOVE" || !!dfy,
        applicationStatus: dfy?.status ?? null,
        milestones: approvedProposal ? parseMilestones(approvedProposal.milestones) : [],
        accessCount,
      },
      message: latestMessage
        ? { body: latestMessage.body.slice(0, 280), fromAdmin: latestMessage.fromAdmin, createdAt: latestMessage.createdAt }
        : null,
      unreadMessages,
      tickets,
      report: recentReport
        ? { date: recentReport.date, publishedAt: recentReport.publishedAt }
        : null,
    },
  });
});

router.patch("/client/workflow/:id", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  const item = await prisma.workflowItem.findFirst({ where: { id: req.params.id, clientId } });
  if (!item) { res.status(404).json({ error: "Item not found." }); return; }
  const updated = await prisma.workflowItem.update({ where: { id: item.id }, data: { done: !item.done } });
  res.json(updated);
});

// ── Consultations ─────────────────────────────────────────────────────────────

router.get("/client/consultations", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  const consultations = await prisma.consultation.findMany({
    where: { clientId },
    include: { actionItems: { orderBy: { createdAt: "asc" } } },
    orderBy: { scheduledAt: "desc" },
  });
  res.json(consultations);
});

router.get("/client/consultations/:id", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  const c = await prisma.consultation.findFirst({
    where: { id: req.params.id, clientId },
    include: { actionItems: { orderBy: { createdAt: "asc" } } },
  });
  if (!c) { res.status(404).json({ error: "Not found." }); return; }
  res.json(c);
});

router.patch("/client/action-items/:id", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  // Clients can only toggle their own action items
  const ai = await prisma.actionItem.findFirst({
    where: { id: req.params.id, owner: "CLIENT", consultation: { clientId } },
  });
  if (!ai) { res.status(404).json({ error: "Not found." }); return; }
  const updated = await prisma.actionItem.update({ where: { id: ai.id }, data: { done: !ai.done } });
  res.json(updated);
});

// ── Documents ─────────────────────────────────────────────────────────────────

router.get("/client/documents", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  const user = (req as AuthedRequest).atgUser!;
  const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  const clientTierIdx = TIER_ORDER.indexOf(client?.tier ?? "NONE");
  const docs = await prisma.document.findMany({
    where: {
      visibleToClient: true,
      OR: [{ clientId }, { clientId: null }],
    },
    orderBy: { createdAt: "desc" },
  });
  // Filter by minTier
  const filtered = docs.filter((d) => {
    if (!d.minTier) return true;
    return TIER_ORDER.indexOf(d.minTier) <= clientTierIdx;
  });
  res.json(filtered);
});

// ── Reports ───────────────────────────────────────────────────────────────────

router.get("/client/reports", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  const reports = await prisma.report.findMany({
    where: { clientId, status: "PUBLISHED" },
    orderBy: { date: "desc" },
    take: 30,
  });
  res.json(reports);
});

router.get("/client/reports/:date", async (req, res) => {
  const clientId = getClient(req as AuthedRequest, res);
  if (!clientId) return;
  const report = await prisma.report.findUnique({
    where: { clientId_date_kind: { clientId, date: req.params.date, kind: "DAILY" } },
  });
  if (!report || report.status !== "PUBLISHED") { res.status(404).json({ error: "Not found." }); return; }
  res.json(report);
});

// ── Learn modules ─────────────────────────────────────────────────────────────

router.get("/modules", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const clientId = user.clientId;
  const client = clientId ? await prisma.client.findUnique({ where: { id: clientId } }) : null;
  const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];
  const clientTierIdx = TIER_ORDER.indexOf(client?.tier ?? "NONE");

  const [modules, progress] = await Promise.all([
    prisma.module.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
    prisma.moduleProgress.findMany({ where: { userId: user.id }, select: { moduleId: true } }),
  ]);

  const completedIds = new Set(progress.map((p) => p.moduleId));
  const result = modules.map((m) => ({
    ...m,
    locked: TIER_ORDER.indexOf(m.minTier) > clientTierIdx,
    completed: completedIds.has(m.id),
  }));
  res.json(result);
});

router.get("/modules/:slug", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const client = user.clientId ? await prisma.client.findUnique({ where: { id: user.clientId } }) : null;
  const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];
  const clientTierIdx = TIER_ORDER.indexOf(client?.tier ?? "NONE");

  const m = await prisma.module.findUnique({ where: { slug: req.params.slug } });
  if (!m || m.status !== "PUBLISHED") { res.status(404).json({ error: "Not found." }); return; }
  if (TIER_ORDER.indexOf(m.minTier) > clientTierIdx) {
    res.status(403).json({ error: "Upgrade your plan to access this module.", minTier: m.minTier });
    return;
  }
  res.json(m);
});

router.post("/modules/:slug/complete", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const m = await prisma.module.findUnique({ where: { slug: req.params.slug } });
  if (!m) { res.status(404).json({ error: "Not found." }); return; }
  await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId: user.id, moduleId: m.id } },
    create: { userId: user.id, moduleId: m.id },
    update: {},
  });
  res.json({ ok: true });
});

// ── Account settings ──────────────────────────────────────────────────────────

const AccountPatchSchema = z.object({
  digestEmailOptIn: z.boolean().optional(),
});

router.patch("/client/account", async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const parsed = AccountPatchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Invalid account update." }); return; }
  const { digestEmailOptIn } = parsed.data;
  if (user.clientId && digestEmailOptIn !== undefined) {
    await prisma.client.update({ where: { id: user.clientId }, data: { digestEmailOptIn } });
  }
  res.json({ ok: true });
});

// ── Intake summary — now served from DiscoveryIntake ─────────────────────────

router.get("/client/intake/latest", requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.json(null); return; }
  const intake = await prisma.discoveryIntake.findFirst({
    where: { clientId: user.clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, decisionAuthority: true, contactEmail: true, answers: true },
  });
  if (!intake) { res.json(null); return; }
  // Parse answers to extract legacy-compatible fields
  const answers: Record<string, unknown> = (() => { try { return JSON.parse(intake.answers) as Record<string, unknown>; } catch { return {}; } })();
  const findAns = (id: string) => (answers as Record<string, {answer?: string}>)[id]?.answer
    ?? (Array.isArray(answers) ? (answers as Array<{id?: string; answer?: string}>).find((a) => a.id === id)?.answer : undefined);
  res.json({
    id: intake.id,
    createdAt: intake.createdAt,
    aiComfort: parseInt(findAns("aiComfort") ?? "1", 10) || 1,
    hoursLost: parseInt(findAns("hoursLost") ?? "10", 10) || 10,
    helpStyle: findAns("preferredHelp") ?? "not_sure",
    areas: JSON.stringify([]),
    answers: intake.answers,
  });
});

router.get("/client/intake/history", requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.json([]); return; }
  const intakes = await prisma.discoveryIntake.findMany({
    where: { clientId: user.clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, answers: true, requestedTier: true },
    take: 20,
  });
  res.json(intakes.map((i) => ({
    id: i.id,
    createdAt: i.createdAt,
    helpStyle: helpStyleFromIntake({ answers: i.answers, requestedTier: i.requestedTier }),
  })));
});

router.get("/client/catalog-matches", requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.json({ matches: [] }); return; }
  const intake = await prisma.discoveryIntake.findFirst({
    where: { clientId: user.clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!intake) { res.json({ matches: [] }); return; }
  const rows = await prisma.catalogMatch.findMany({
    where: {
      intakeId: intake.id,
      isGap: false,
      catalogItem: { verified: true, enabled: true },
    },
    include: { catalogItem: { select: { id: true, name: true, sourceUrl: true, howItHelps: true, description: true, referralUrl: true } } },
    orderBy: { score: "desc" },
    take: 12,
  });
  res.json({
    matches: rows.map((row) => ({
      id: row.id,
      name: row.catalogItem.name,
      painPoint: row.painPoint,
      why: row.rankExplanation || row.catalogItem.howItHelps || row.catalogItem.description,
      url: row.catalogItem.referralUrl || row.catalogItem.sourceUrl || null,
    })),
  });
});

// ── Intake prefill for adaptive edit flow ─────────────────────────────────────

router.get("/client/intake/prefill", requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.json({ answers: [], sessionId: null }); return; }

  // First: try DiscoveryIntake (the adaptive intake)
  const discovery = await prisma.discoveryIntake.findFirst({
    where: { clientId: user.clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, answers: true, contactEmail: true, contactName: true },
  });

  if (discovery) {
    const answers: unknown[] = (() => { try { return JSON.parse(discovery.answers) as unknown[]; } catch { return []; } })();
    res.json({ answers, sessionId: discovery.id, source: "discovery" });
    return;
  }

  res.json({ answers: [], sessionId: null });
});

export default router;
