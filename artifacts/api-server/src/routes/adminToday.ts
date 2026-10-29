/**
 * Admin Today dashboard — aggregates pending tasks for Shea.
 *
 * GET /api/admin/today
 *
 * Returns task counts + items for:
 *   - Intake reviews (new DiscoveryIntake submissions)
 *   - Report drafts awaiting approval (DiscoveryProposal status=draft)
 *   - Content drafts awaiting approval
 *   - Catalog items in review queue
 *   - Upcoming sessions (Guided/DFY consultations in next 7 days)
 *   - DFY access checklist (active WHITE_GLOVE clients with no revoked access)
 *   - AI health (last known fallback count)
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, type AuthedRequest } from "../lib/auth";
import { getCachedHealth, grokHealthCheck, GROK_MODEL, isGrokEnabled, recentFallbacks } from "../lib/grokClient";
import { lastHarvestReport } from "../lib/catalogHarvest";

const router = Router();

function isMissingActionTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /TodayItemAction|does not exist|P2021/i.test(msg);
}

async function hiddenItemKeys(now: Date): Promise<{ hidden: Set<string>; actionsReady: boolean }> {
  try {
    const rows = await prisma.todayItemAction.findMany({
      select: { itemKey: true, action: true, snoozeUntil: true },
    });
    const hidden = new Set<string>();
    for (const row of rows) {
      if (row.action === "done") hidden.add(row.itemKey);
      else if (row.action === "snoozed" && row.snoozeUntil && row.snoozeUntil > now) hidden.add(row.itemKey);
    }
    return { hidden, actionsReady: true };
  } catch (err) {
    if (!isMissingActionTable(err)) throw err;
    console.warn("[today] TodayItemAction is missing. Run: pnpm --filter @workspace/api-server db:push");
    return { hidden: new Set(), actionsReady: false };
  }
}

router.get("/admin/today", withUser, requireAdmin, async (_req, res) => {
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    intakeReviews,
    proposalDrafts,
    contentDrafts,
    catalogQueue,
    upcomingSessions,
    dfyAccessClients,
    contentPublishable,
    openTickets,
    unreadMessages,
    openRequests,
  ] = await Promise.all([
    // New intake submissions needing review
    prisma.discoveryIntake.findMany({
      where: { status: "new" },
      select: { id: true, contactName: true, contactEmail: true, createdAt: true, decisionAuthority: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // Proposal drafts awaiting approval
    prisma.discoveryProposal.findMany({
      where: { status: "draft" },
      select: { id: true, discoveryIntakeId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // Content drafts awaiting approval
    prisma.content.findMany({
      where: { status: { in: ["draft", "approved"] } },
      select: { id: true, title: true, slug: true, status: true, source: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // Catalog items in review queue
    prisma.catalogItem.findMany({
      where: { reviewStatus: "pending", enabled: true },
      select: { id: true, name: true, sourceType: true, sourceUrl: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
    // Upcoming Guided/DFY consultations (next 7 days)
    prisma.consultation.findMany({
      where: {
        scheduledAt: { gte: now, lte: in7d },
        status: { not: "CANCELLED" },
        client: { tier: { in: ["GUIDED", "WHITE_GLOVE"] } },
      },
      include: { client: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { scheduledAt: "asc" },
      take: 20,
    }),
    // DFY clients with active (un-revoked) access log entries
    prisma.clientAccessLog.findMany({
      where: { revokedDate: null, client: { tier: "WHITE_GLOVE" } },
      include: { client: { include: { user: { select: { name: true } } } } },
      orderBy: { grantedDate: "asc" },
      take: 20,
    }),
    // Content approved but not yet published (ready to publish)
    prisma.content.count({ where: { status: "approved" } }),
    prisma.supportTicket.findMany({
      where: { status: "open" },
      include: { client: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.clientMessage.findMany({
      where: { fromAdmin: false, readAt: null },
      include: { client: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.workflowRequest.findMany({
      where: { status: "open" },
      include: { client: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const { hidden, actionsReady } = await hiddenItemKeys(now);
  const visible = <T extends { type: string; id: string }>(items: T[]) =>
    items.filter((item) => !hidden.has(`${item.type}:${item.id}`));

  const tasks = {
    intakeReviews: visible(intakeReviews.map((i) => ({
      type: "intake_review",
      id: i.id,
      label: i.contactName ?? i.contactEmail ?? "Anonymous intake",
      url: `/admin/discovery`,
      meta: i.decisionAuthority ? `authority: ${i.decisionAuthority}` : undefined,
      createdAt: i.createdAt,
    }))),
    proposalDrafts: visible(proposalDrafts.map((p) => ({
      type: "proposal_draft",
      id: p.id,
      label: `Proposal for intake ${p.discoveryIntakeId.slice(0, 8)}…`,
      url: `/admin/discovery`,
      createdAt: p.createdAt,
    }))),
    contentDrafts: visible(contentDrafts.map((c) => ({
      type: c.status === "draft" ? "content_draft" : "content_publish",
      id: c.id,
      label: c.title,
      url: `/admin/content`,
      meta: c.status === "approved" ? "Ready to publish" : `Source: ${c.source}`,
      createdAt: c.createdAt,
    }))),
    catalogQueue: visible(catalogQueue.map((item) => ({
      type: "catalog_verify",
      id: item.id,
      label: item.name,
      url: `/admin/catalog`,
      meta: item.sourceType,
      createdAt: item.createdAt,
    }))),
    upcomingSessions: visible(upcomingSessions.map((s) => ({
      type: "upcoming_session",
      id: s.id,
      label: `${s.title} — ${s.client?.user?.name ?? "—"}`,
      url: `/admin/clients/${s.clientId}`,
      meta: s.scheduledAt?.toISOString(),
    }))),
    dfyAccess: visible(dfyAccessClients.map((a) => ({
      type: "dfy_access",
      id: a.id,
      label: `${a.client?.user?.name ?? "DFY Client"} — ${a.accountSystem} (${a.accessType})`,
      url: `/admin/clients/${a.clientId}/access`,
      meta: `Granted: ${(a.grantedDate as Date).toLocaleDateString()}`,
    }))),
    supportTickets: visible(openTickets.map((ticket) => ({
      type: "support_ticket",
      id: ticket.id,
      label: `${ticket.client.user?.name ?? ticket.client.user?.email ?? "Client"} — ${ticket.subject}`,
      url: `/admin/today`,
      meta: ticket.message.slice(0, 140),
      createdAt: ticket.createdAt,
    }))),
    clientMessages: visible(unreadMessages.map((message) => ({
      type: "client_message",
      id: message.id,
      label: `${message.client.user?.name ?? "Client"} sent a message`,
      url: `/admin/messages`,
      meta: message.body.slice(0, 140),
      createdAt: message.createdAt,
    }))),
    workflowRequests: visible(openRequests.map((request) => ({
      type: "workflow_request",
      id: request.id,
      label: `${request.client.user?.name ?? "Client"} requested a workflow`,
      url: `/admin/clients/${request.clientId}`,
      meta: request.description.slice(0, 140),
      createdAt: request.createdAt,
    }))),
  };

  const counts = {
    intakeReviews:    tasks.intakeReviews.length,
    proposalDrafts:   tasks.proposalDrafts.length,
    contentDrafts:    tasks.contentDrafts.filter((c) => c.type === "content_draft").length,
    contentApproved:  contentPublishable,
    catalogQueue:     tasks.catalogQueue.length,
    upcomingSessions: tasks.upcomingSessions.length,
    legacyIntakes:    0,
    supportTickets:   tasks.supportTickets.length,
    clientMessages:   tasks.clientMessages.length,
    workflowRequests: tasks.workflowRequests.length,
    total: tasks.intakeReviews.length + tasks.proposalDrafts.length + tasks.contentDrafts.filter((c) => c.type === "content_draft").length + tasks.catalogQueue.length + tasks.supportTickets.length + tasks.clientMessages.length + tasks.workflowRequests.length,
  };

  res.json({
    date: now.toISOString().split("T")[0],
    counts,
    actionsReady,
    tasks,
    ai: {
      enabled: isGrokEnabled(),
      keyConfigured: Boolean(process.env.XAI_API_KEY),
      model: GROK_MODEL,
      health: getCachedHealth(),
      fallbacks: recentFallbacks().slice(0, 20),
    },
    catalogHarvest: lastHarvestReport(),
  });
});

const ActionBody = z.object({
  itemKey: z.string().regex(/^[a-z_]+:[A-Za-z0-9_-]+$/),
  action: z.enum(["done", "snooze"]),
  snoozeHours: z.number().int().min(1).max(24 * 30).optional(),
});

router.post("/admin/today/action", withUser, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const parsed = ActionBody.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "itemKey and action are required." }); return; }

  const { itemKey, action } = parsed.data;
  const snoozeHours = parsed.data.snoozeHours ?? 24;
  const data = action === "done"
    ? { action: "done", snoozeUntil: null, actorUserId: actor.id }
    : { action: "snoozed", snoozeUntil: new Date(Date.now() + snoozeHours * 60 * 60 * 1000), actorUserId: actor.id };

  try {
    const row = await prisma.todayItemAction.upsert({
      where: { itemKey },
      create: { itemKey, ...data },
      update: data,
    });
    res.json({ ok: true, itemKey: row.itemKey, action: row.action, snoozeUntil: row.snoozeUntil });
  } catch (err) {
    if (isMissingActionTable(err)) {
      res.status(503).json({ error: "Today actions are not available until db:push creates TodayItemAction." });
      return;
    }
    throw err;
  }
});

router.post("/admin/today/health", withUser, requireAdmin, async (_req, res) => {
  const health = await grokHealthCheck();
  res.json({
    enabled: isGrokEnabled(),
    keyConfigured: Boolean(process.env.XAI_API_KEY),
    model: GROK_MODEL,
    health,
    fallbacks: recentFallbacks().slice(0, 20),
  });
});

export default router;
