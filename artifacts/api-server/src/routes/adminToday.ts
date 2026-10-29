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
import { prisma } from "../lib/db";
import { withUser, requireAdmin } from "../lib/auth";

const router = Router();

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
    // Legacy intake count
    Promise.resolve(0), // legacy intake table dropped
    // Content approved but not yet published (ready to publish)
    prisma.content.count({ where: { status: "approved" } }),
  ]);

  // Task counts for nav badges
  const counts = {
    intakeReviews:    intakeReviews.length,
    proposalDrafts:   proposalDrafts.length,
    contentDrafts:    contentDrafts.filter((c) => c.status === "draft").length,
    contentApproved:  contentPublishable,
    catalogQueue:     catalogQueue.length,
    upcomingSessions: upcomingSessions.length,
    legacyIntakes:    0, // table dropped
    total: intakeReviews.length + proposalDrafts.length + contentDrafts.filter((c) => c.status === "draft").length + catalogQueue.length,
  };

  res.json({
    date: now.toISOString().split("T")[0],
    counts,
    tasks: {
      intakeReviews: intakeReviews.map((i) => ({
        type: "intake_review",
        id: i.id,
        label: i.contactName ?? i.contactEmail ?? "Anonymous intake",
        url: `/admin/discovery`,
        meta: i.decisionAuthority ? `authority: ${i.decisionAuthority}` : undefined,
        createdAt: i.createdAt,
      })),
      proposalDrafts: proposalDrafts.map((p) => ({
        type: "proposal_draft",
        id: p.id,
        label: `Proposal for intake ${p.discoveryIntakeId.slice(0, 8)}…`,
        url: `/admin/discovery`,
        createdAt: p.createdAt,
      })),
      contentDrafts: contentDrafts.map((c) => ({
        type: c.status === "draft" ? "content_draft" : "content_publish",
        id: c.id,
        label: c.title,
        url: `/admin/content`,
        meta: c.status === "approved" ? "Ready to publish" : `Source: ${c.source}`,
        createdAt: c.createdAt,
      })),
      catalogQueue: catalogQueue.map((item) => ({
        type: "catalog_verify",
        id: item.id,
        label: item.name,
        url: `/admin/catalog`,
        meta: item.sourceType,
        createdAt: item.createdAt,
      })),
      upcomingSessions: upcomingSessions.map((s) => ({
        type: "upcoming_session",
        id: s.id,
        label: `${s.title} — ${s.client?.user?.name ?? "—"}`,
        url: `/admin/clients/${s.clientId}`,
        meta: s.scheduledAt?.toISOString(),
      })),
      dfyAccess: dfyAccessClients.map((a) => ({
        type: "dfy_access",
        id: a.id,
        label: `${a.client?.user?.name ?? "DFY Client"} — ${a.accountSystem} (${a.accessType})`,
        url: `/admin/clients/${a.clientId}/access`,
        meta: `Granted: ${(a.grantedDate as Date).toLocaleDateString()}`,
      })),
    },
  });
});

export default router;
