import { Router } from "express";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, type AuthedRequest } from "../lib/auth";
import { cents, savedQuote } from "../lib/customQuote";
import { SavedEstimate, priceEngagement } from "../lib/engagementWorkspace";
import { contractBindingFor } from "../lib/engagementContract";
import { FinancialEntry } from "../lib/financialBenefitLedger";

const router = Router();
const maximumProposals = 250;
router.get("/admin/owner-metrics", withUser, requireAdmin, async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  if ((req as AuthedRequest).atgUser?.isImpersonating) {res.sendStatus(403); return;}
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 86400_000);
  const [pipeline, proposals, paid, stats, activeClients, finance] = await Promise.all([
    prisma.atgProspect.groupBy({by: ["status"], _count: {_all: true}}),
    prisma.discoveryProposal.findMany({orderBy: [{createdAt: "desc"}, {id: "asc"}], take: maximumProposals + 1,
      select: {id: true, discoveryIntakeId: true, investment: true, status: true, approvedAt: true, acceptedAt: true}}),
    prisma.quoteInstallment.aggregate({where: {liveMode: true, paidAt: {not: null}}, _sum: {amountCents: true, refundedCents: true}, _count: {_all: true}}),
    Promise.all([
      prisma.discoveryIntake.count({where: {consentGiven: true}}),
      prisma.fitCallOutcome.count({where: {status: "completed"}}),
      prisma.consultation.count({where: {status: "SCHEDULED", scheduledAt: {gte: now, lt: thirtyDays}}}),
      prisma.consultation.count({where: {status: "COMPLETED"}}),
      prisma.actionItem.count({where: {sourceMilestoneKey: {not: null}, done: false}}),
      prisma.actionItem.count({where: {sourceMilestoneKey: {not: null}, dueAt: {lt: now}, done: false}}),
      prisma.atgProspectSuppression.count(),
    ]),
    prisma.client.findMany({where: {status: "ACTIVE"}, select: {id: true}}),
    prisma.engagementRevision.findMany({where: {kind: "financial", status: "published"}, orderBy: {version: "desc"},
      distinct: ["clientId", "workspace", "period"], select: {content: true}}),
  ]);
  const [completedIntakes, completedFitCalls, upcomingConsultations, heldConsultations, openMilestones, overdueMilestones, suppressedIdentities] = stats;
  const accepted = proposals.filter(row => row.acceptedAt);
  const draft = proposals.filter(row => row.status === "draft");
  const approved = proposals.filter(row => row.approvedAt && !row.acceptedAt);
  const quoteTotal = (rows: typeof proposals) => rows.reduce((sum, row) =>
    sum + (savedQuote(row.investment)?.workstreams.reduce((total, stream) => total + cents(stream.amount), 0) ?? 0), 0);
  const active = new Set(activeClients.map(row => row.id));
  const estimates = [];
  const supported = new Set<string>();
  const intakes = await prisma.discoveryIntake.findMany({where: {id: {in: accepted.map(row => row.discoveryIntakeId)}}, select: {id: true, clientId: true}});
  const clientByIntake = new Map(intakes.map(row => [row.id, row.clientId]));
  for (const proposal of accepted) {
    const clientId = clientByIntake.get(proposal.discoveryIntakeId);
    if (!clientId || !active.has(clientId)) continue;
    const scope = {clientId, workspace: proposal.discoveryIntakeId};
    supported.add(proposal.id);
    const binding = await contractBindingFor(prisma, scope, proposal.id);
    if (!binding?.estimateVersion) continue;
    const row = await prisma.engagementRevision.findFirst({
      where: {...scope, kind: "estimate", version: binding.estimateVersion, period: ""}, select: {content: true},
    });
    if (!row) continue;
    const estimate = SavedEstimate.parse(JSON.parse(row.content));
    estimates.push({pricing: priceEngagement(estimate.input),
      monthlyAdvisory: estimate.input.workstreams.reduce((sum, line) => sum + line.advisory * line.quantity, 0)});
  }
  const manual = finance.map(row => FinancialEntry.parse(JSON.parse(row.content))).filter(row => row.category === "engagement-payment");
  const openStatuses = Object.fromEntries(pipeline.map(row => [row.status, row._count._all]));
  const recurring = estimates.filter(row => row.pricing.termMonths > 0);
  res.json({
    asOf: now.toISOString(), completeProposalCoverage: proposals.length <= maximumProposals,
    pipeline: openStatuses, funnel: {completedIntakes, completedFitCalls, upcomingConsultations, heldConsultations, suppressedIdentities},
    proposals: {draft: draft.length, approvedAwaitingAcceptance: approved.length, accepted: accepted.length,
      indicativeDraftCents: quoteTotal(draft), offeredCents: quoteTotal(approved), contractedCents: quoteTotal(accepted)},
    collection: {stripeRecords: paid._count._all, stripeNetCents: (paid._sum.amountCents ?? 0) - (paid._sum.refundedCents ?? 0),
      clientLedgerRecords: manual.length, clientLedgerNetCents: manual.reduce((sum, row) => sum + row.grossCents, 0)},
    delivery: {openMilestones, overdueMilestones, activeClients: active.size, acceptedActive: supported.size,
      modeledAcceptedActive: estimates.length, estimatedSetupHours: estimates.reduce((sum, row) => sum + row.pricing.setup.includedHours, 0),
      estimatedRecurringHours: recurring.reduce((sum, row) => sum + row.pricing.monthly.includedHours, 0),
      includedAdvisoryHours: recurring.reduce((sum, row) => sum + row.monthlyAdvisory, 0),
      modeledRecurringFeeCents: recurring.reduce((sum, row) => sum + row.pricing.monthly.feeCents, 0),
      modeledRecurringContributionCents: recurring.reduce((sum, row) => sum + row.pricing.monthly.contributionCents, 0)},
  });
});

export default router;
