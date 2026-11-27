import { SlaIncident, slaTiming } from "../lib/slaClock";
import { FinancialEntry, financialEvidenceReferences, normalizeFinancialReference, sumFinancialLedger, type FinancialEntryInput } from "../lib/financialBenefitLedger";
import { contractBindingFor, digestOf } from "../lib/engagementContract";
import { workflowEstimateCatalog, workflowEstimateCatalogVersion } from "../lib/workflowEstimateCatalog";
import { SeoEvidenceInput, summarizeSeo } from "../lib/seoEvidence";
import { Router, type Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, requireAuth, type AuthedRequest } from "../lib/auth";
import { answerMap } from "../lib/intakeAnswers";
import { parseFitCallAnswers } from "../lib/fitCall";
import { cents, reviewedInvestment, savedQuote } from "../lib/customQuote";
import {
  AdvisoryInput, ChangeOrderInput, changeReference, IntakeSource, SavedEstimate, SlaInput, ValueReportInput,
  estimateFormula, priceEngagement, reviewedEstimateProvenance, quoteFromEstimate, reportPeriod, summarizeValue,
} from "../lib/engagementWorkspace";

import {
  assessmentReference, forecast, kpiRegistry, kpiRegistryVersion, MeasurementPlan, OpportunityReview,
  ReadinessReview, readinessLevels, readinessRubric,
} from "../lib/engagementMeasurement";
import { opportunity, readiness } from "../lib/consultingIntelligence";
import { emptyBusinessContext } from "../lib/businessContext";
import { transformationServices } from "../lib/transformationServices";

const schemas = {estimate: SavedEstimate, sla: SlaInput, value: ValueReportInput, advisory: AdvisoryInput, seo: SeoEvidenceInput, change: ChangeOrderInput, readiness: ReadinessReview, opportunity: OpportunityReview, measurement: MeasurementPlan, financial: FinancialEntry, "sla-incident": SlaIncident};
const kinds = z.enum(["estimate", "sla", "value", "advisory", "seo", "change", "readiness", "opportunity", "measurement", "financial", "sla-incident"]);
const version = z.number().int().min(0).max(1_000_000);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const unlinked = "unlinked";
const reply = (res: Response, code: number, error: string) => res.status(code).json({error});
const draftRequest = z.object({expectedVersion: version, content: z.unknown()}).strict();
type Database = Pick<Prisma.TransactionClient, "engagementRevision" | "discoveryIntake" | "discoveryProposal" | "client" | "businessContextVersion">;
const validPeriod = (kind: string, input: unknown) => kind === "change" ? changeReference.safeParse(input).success :
  ["opportunity", "financial", "sla-incident"].includes(kind) ? assessmentReference.safeParse(input).success : usesPeriod(kind) ? reportPeriod.safeParse(input).success : input === "";
const usesPeriod = (kind: string) => ["value", "seo", "advisory", "readiness"].includes(kind);
type Workspace = {clientId: string; workspace: string};

async function belongs(db: Database, scope: Workspace) {
  return scope.workspace === unlinked
    ? !!await db.client.findUnique({where: {id: scope.clientId}, select: {id: true}})
    : !!await db.discoveryIntake.findFirst({where: {id: scope.workspace, clientId: scope.clientId}, select: {id: true}});
}

async function intakeSource(db: Database, scope: Workspace) {
  if (scope.workspace === unlinked) return null;
  const intake = await db.discoveryIntake.findFirst({
    where: {id: scope.workspace, clientId: scope.clientId, consentGiven: true},
    select: {id: true, engagementId: true, updatedAt: true, answers: true, fitCall: true},
  });
  if (!intake) return null;
  const proposal = await db.discoveryProposal.findUnique({where: {discoveryIntakeId: intake.id}});
  const fitCall = intake.fitCall?.status === "completed" ? intake.fitCall : null;
  const answers = answerMap(intake.answers);
  const fields = ["first_priority", "business_type", "team_size", "top_problems"];
  return {
    source: {
      intakeId: intake.id, engagementId: intake.engagementId, updatedAt: intake.updatedAt.toISOString(),
      fitCall: fitCall ? {id: fitCall.id, revision: fitCall.revision} : null,
      proposal: proposal ? {id: proposal.id, updatedAt: proposal.updatedAt.toISOString()} : null,
    },
    answers: Object.fromEntries(fields.filter(field => answers[field]).map(field => [field, answers[field].slice(0, 500)])),
    fitCall: fitCall ? parseFitCallAnswers(fitCall.answersJson) : null,
    proposal: proposal ? {
      status: proposal.status, workstreams: savedQuote(proposal.investment)?.workstreams ?? [],
      installments: savedQuote(proposal.investment)?.installments ?? [],
    } : null,
  };
}

const sameSource = (a: IntakeSource | null, b: IntakeSource | null) =>
  JSON.stringify(a === null ? null : IntakeSource.parse(a)) === JSON.stringify(b === null ? null : IntakeSource.parse(b));

async function contextFor(db: Database, clientId: string) {
  const row = await db.businessContextVersion.findFirst({where: {clientId}, orderBy: {version: "desc"}});
  return {version: row?.version ?? 0, profile: row ? JSON.parse(row.content) : emptyBusinessContext(clientId)};
}

function record(row: {kind: string; version: number; status: string; period: string; content: string; createdAt: Date; workspace: string}) {
  const kind = kinds.parse(row.kind);
  const content = schemas[kind].parse(JSON.parse(row.content));
  const result = {kind, workspace: row.workspace, version: row.version, status: row.status, period: row.period, createdAt: row.createdAt, content};
  if (kind === "readiness") return {...result, calculation: readiness(ReadinessReview.parse(content).scores)};
  if (kind === "measurement") {
    const plan = MeasurementPlan.parse(content);
    return {...result, calculation: plan.forecast ? forecast(plan.forecast) : null,
      definitions: kpiRegistry.filter(item => plan.metrics.some(metric => metric.kpiId === item.id))};
  }
  if (kind === "estimate") return {...result, calculation: priceEngagement(SavedEstimate.parse(content).input)};
  if (kind === "value") return {...result, calculation: summarizeValue(ValueReportInput.parse(content))};
  if (kind === "seo") return {...result, findings: summarizeSeo(SeoEvidenceInput.parse(content))};
  return result;
}

function clientRecord(row: Parameters<typeof record>[0]) {
  if (row.kind !== "readiness") return record(row);
  const summary = ReadinessReview.parse(JSON.parse(row.content));
  const scores = Object.fromEntries(Object.entries(summary.scores).map(([key, dimension]) => [key, {...dimension, evidence: ""}]));
  return {...record(row), content: {...summary, scores}};
}

async function approvedFinancialEntries(db: Database, scope: Workspace) {
  return db.engagementRevision.findMany({
    where: {...scope, kind: "financial", status: "published"}, distinct: ["period"], orderBy: {version: "desc"},
  });
}

async function transaction<T>(work: (db: Prisma.TransactionClient) => Promise<T>): Promise<T | "conflict"> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(work, {isolationLevel: Prisma.TransactionIsolationLevel.Serializable});
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
      if (error.code === "P2002") return "conflict";
      if (error.code !== "P2034") throw error;
    }
  }
  return "conflict";
}

export function createEngagementWorkspaceRouter(
  adminAuth = [withUser, requireAdmin],
  clientAuth = [withUser, requireAuth],
) {
  const router = Router();
  const admin = "/admin/clients/:clientId/engagement-workspace";
  router.use(admin, ...adminAuth, (req, res, next) => {
    const actor = (req as AuthedRequest).atgUser;
    res.set("Cache-Control", "private, no-store");
    if (!actor || actor.role !== "ADMIN" || actor.isImpersonating) {
      reply(res, 403, "Admin access is required.");
      return;
    }
    next();
  });
  router.get(admin, async (req, res) => {
    const clientId = String(req.params.clientId);
    if (!await prisma.client.findUnique({where: {id: clientId}, select: {id: true}})) {
      reply(res, 404, "Client not found.");
      return;
    }
    const intakes = await prisma.discoveryIntake.findMany({
      where: {clientId}, orderBy: [{createdAt: "desc"}, {id: "asc"}], take: 100,
      select: {id: true, createdAt: true, status: true, engagementId: true},
    });
    res.json({intakes, catalog: workflowEstimateCatalog, catalogVersion: workflowEstimateCatalogVersion});
  });
  router.get(admin + "/:workspace", async (req, res) => {
    const scope = {clientId: String(req.params.clientId), workspace: String(req.params.workspace)};
    if (!await belongs(prisma, scope)) { reply(res, 404, "Client engagement not found."); return; }
    const [rows, source, context, ledger, executedSlas] = await Promise.all([
      prisma.engagementRevision.findMany({where: {...scope, kind: {in: kinds.options}}, distinct: ["kind", "period"], orderBy: {version: "desc"}, take: 400}),
      intakeSource(prisma, scope),
      contextFor(prisma, scope.clientId), approvedFinancialEntries(prisma, scope),
      prisma.engagementRevision.findMany({where: {...scope, kind: "sla", status: "executed"},
        orderBy: {version: "desc"}, select: {version: true}}),
    ]);
    res.json({
      records: rows.map(row => row.kind === "opportunity"
        ? {...record(row), calculation: opportunity(OpportunityReview.parse(JSON.parse(row.content)).scores, context.profile, scope.clientId)}
        : record(row)),
      source, contextVersion: context.version,
      latestSlaVersion: (await prisma.engagementRevision.findFirst({
        where: {...scope, kind: "sla", status: {in: ["published", "executed"]}}, orderBy: {version: "desc"}, select: {version: true},
      }))?.version ?? null,
      executedSlaVersions: executedSlas.map(row => row.version),
      financialSummary: sumFinancialLedger(ledger.map(item => FinancialEntry.parse(JSON.parse(item.content)))),
      measurement: {registry: kpiRegistry, registryVersion: kpiRegistryVersion, readinessRubric, readinessLevels,
        services: transformationServices.map(({id, name}) => ({id, name}))},
    });
  });

  router.get(admin + "/:workspace/:kind/history", async (req, res) => {
    const scope = {clientId: String(req.params.clientId), workspace: String(req.params.workspace)};
    const kind = kinds.safeParse(req.params.kind);
    const period = req.query.period ?? "";
    if (!kind.success || !validPeriod(kind.data, period)) {
      reply(res, 422, "Invalid history request."); return;
    }
    if (!await belongs(prisma, scope)) { reply(res, 404, "Client engagement not found."); return; }
    const before = z.coerce.number().int().positive().max(1_000_001).safeParse(req.query.before ?? 1_000_001);
    if (!before.success) { reply(res, 422, "Invalid history cursor."); return; }
    const rows = await prisma.engagementRevision.findMany({
      where: {...scope, kind: kind.data, period: String(period), version: {lt: before.data}},
      orderBy: {version: "desc"}, take: 26,
    });
    const records = rows.slice(0, 25).map(row => ({...record(row), actorUserId: row.actorUserId}));
    res.json({records, nextBefore: rows.length > 25 ? records.at(-1)?.version : null});
  });

  router.put(admin + "/:workspace/:kind", async (req, res) => {
    const scope = {clientId: String(req.params.clientId), workspace: String(req.params.workspace)};
    const actor = (req as AuthedRequest).atgUser!;
    const kind = kinds.safeParse(req.params.kind);
    const parsed = draftRequest.safeParse(req.body);
    if (!kind.success || !parsed.success) { reply(res, 422, "Invalid workspace draft."); return; }
    const content = schemas[kind.data].safeParse(parsed.data.content);
    if (!content.success) { reply(res, 422, content.error.issues.map(issue => [issue.path.join("."), issue.message].filter(Boolean).join(" · ")).join(" / ")); return; }
    const period = "period" in content.data ? content.data.period : "reference" in content.data ? content.data.reference : "";
    const outcome = await transaction(async db => {
      if (!await belongs(db, scope)) return "missing";
      let savedContent = content.data;
      if (kind.data === "estimate") {
        const estimate = SavedEstimate.parse(content.data);
        const intake = await intakeSource(db, scope);
        if (estimate.source && !sameSource(estimate.source, intake?.source ?? null)) return "stale";
        const {provenance, unknownFields} = reviewedEstimateProvenance(estimate, new Date().toISOString());
        const currentSla = Object.values(provenance).some(item => item.origin === "sla") ? await db.engagementRevision.findFirst({
          where: {...scope, kind: "sla", status: {in: ["executed", "published"]}}, orderBy: {version: "desc"},
        }) : null;
        if (unknownFields.length) return "invalid-provenance";
        for (const [field, item] of Object.entries(provenance)) {
          if (item.origin === "manual" || item.origin === "ai") continue;
          if (item.origin === "catalog") {
            const index = Number(field.split(".")[1]);
            const reference = estimate.input.workstreams[index]?.catalog;
            if (!reference || item.reference !== reference.id || item.revision !== String(reference.version)) return "invalid-provenance";
          }
          if (item.origin === "proposal" && (!intake?.source.proposal || item.reference !== intake.source.proposal.id || item.revision !== intake.source.proposal.updatedAt)) return "stale";
          if (item.origin === "intake" && (!intake || item.reference !== intake.source.intakeId || item.revision !== intake.source.updatedAt)) return "stale";
          if (item.origin === "fit-call" && (!intake?.source.fitCall || item.reference !== intake.source.fitCall.id || item.revision !== String(intake.source.fitCall.revision))) return "stale";
          if (item.origin === "sla" && (!currentSla || item.reference !== "sla" || item.revision !== String(currentSla.version))) return "stale";
        }
        savedContent = {...estimate, provenance};
      }
      const where = {...scope, kind: kind.data, period};
      const latest = await db.engagementRevision.findFirst({where, orderBy: {version: "desc"}});
      if ((latest?.version ?? 0) !== parsed.data.expectedVersion || latest?.status === "accepted") return "conflict";
      if (kind.data === "sla-incident") {
        const incident = SlaIncident.parse(content.data);
        const sla = await db.engagementRevision.findFirst({where: {...scope, kind: "sla", period: "",
          version: incident.slaVersion, status: "executed"}});
        if (!sla) return "incident-agreement";
        if (latest && SlaIncident.parse(JSON.parse(latest.content)).slaVersion !== incident.slaVersion) return "incident-agreement";
      }
      if (kind.data === "financial" && latest) {
        const prior = FinancialEntry.parse(JSON.parse(latest.content));
        const entry = FinancialEntry.parse(content.data);
        if ([["sourceRecord", prior.sourceRecord, entry.sourceRecord], ["sourceSystem", prior.sourceSystem, entry.sourceSystem],
          ["financialPeriod", prior.financialPeriod, entry.financialPeriod], ["category", prior.category, entry.category]]
          .some(([, before, after]) => normalizeFinancialReference(before!) !== normalizeFinancialReference(after!))) return "financial-identity";
        if (latest.status === "published" && !entry.adjustmentReason) return "financial-reason";
      }
      if (kind.data === "opportunity" && latest) {
        const previous = OpportunityReview.parse(JSON.parse(latest.content));
        const next = OpportunityReview.parse(content.data);
        if (previous.scores.serviceId !== next.scores.serviceId) return "service";
        const adjusted = Object.entries(next.scores).some(([key, value]) => typeof value === "object" &&
          value.score !== previous.scores[key as Exclude<keyof OpportunityReview["scores"], "serviceId">].score);
        if (adjusted && (!next.adjustmentReason || next.adjustmentReason === previous.adjustmentReason)) return "reason";
      }
      return db.engagementRevision.create({
        data: {...where, version: parsed.data.expectedVersion + 1, content: JSON.stringify(savedContent), status: "draft", actorUserId: actor.id},
      });
    });
    if (outcome === "missing") { reply(res, 404, "Client engagement not found."); return; }
    if (outcome === "invalid-provenance") { reply(res, 422, "Review the pricing fields and their source references."); return; }
    if (outcome === "incident-agreement") { reply(res, 409, "Use the executed SLA revision governing this incident."); return; }
    if (outcome === "financial-identity") { reply(res, 409, "A ledger entry keeps its original source, period, and category. Record a correction or reversal with its own evidence."); return; }
    if (outcome === "financial-reason") { reply(res, 422, "Explain the correction to the published financial evidence."); return; }
    if (outcome === "service") { reply(res, 409, "Use a new opportunity reference for a different service."); return; }
    if (outcome === "reason") { reply(res, 422, "Record a fresh reason for changed opportunity scores."); return; }
    if (outcome === "stale") { reply(res, 409, "A linked source changed. Review the current sources before saving."); return; }
    if (outcome === "conflict") { reply(res, 409, "This draft changed. Reload before saving."); return; }
    const result = record(outcome);
    if (kind.data !== "opportunity") { res.status(201).json(result); return; }
    const context = await contextFor(prisma, scope.clientId);
    res.status(201).json({...result, calculation: opportunity(OpportunityReview.parse(result.content).scores, context.profile, scope.clientId)});
  });

  const publishRequest = z.object({expectedVersion: version.min(1), period: z.string().max(27).optional()}).strict();
  router.post(admin + "/:workspace/:kind/publish", async (req, res) => {
    const scope = {clientId: String(req.params.clientId), workspace: String(req.params.workspace)};
    const actor = (req as AuthedRequest).atgUser!;
    const kind = z.enum(["sla", "value", "advisory", "seo", "change", "readiness", "opportunity", "measurement", "financial", "sla-incident"]).safeParse(req.params.kind);
    const input = publishRequest.safeParse(req.body);
    if (!kind.success || !input.success || !validPeriod(kind.data, input.data.period ?? "")) {
      reply(res, 422, "Invalid publication request."); return;
    }
    const outcome = await transaction(async db => {
      if (!await belongs(db, scope)) return "missing";
      if (kind.data === "change") {
        const proposal = await db.discoveryProposal.findUnique({where: {discoveryIntakeId: scope.workspace}});
        if (!proposal?.acceptedAt || !proposal.approvedAt || !["approved", "portal_published"].includes(proposal.status)) return "proposal";
      }
      const where = {...scope, kind: kind.data, period: input.data.period ?? ""};
      const latest = await db.engagementRevision.findFirst({where, orderBy: {version: "desc"}});
      if (!latest || latest.version !== input.data.expectedVersion || latest.status !== "draft") return "conflict";
      if (kind.data === "sla-incident") {
        const incident = SlaIncident.parse(JSON.parse(latest.content));
        const sla = await db.engagementRevision.findFirst({where: {...scope, kind: "sla", period: "", version: incident.slaVersion, status: "executed"}});
        if (!sla) return "incident-agreement";
        const agreement = SlaInput.parse(JSON.parse(sla.content));
        const timing = slaTiming(incident, agreement.calendar, agreement.timezone);
        await db.engagementRevision.create({data: {...where, kind: "sla-incident-timing",
          version: latest.version + 1, content: JSON.stringify(timing), status: "internal", actorUserId: actor.id}});
      }
      if (kind.data === "financial" || kind.data === "value") {
        const [entries, reports] = await Promise.all([
          db.engagementRevision.findMany({where: {...scope, kind: "financial", status: "published"}}),
          db.engagementRevision.findMany({where: {...scope, kind: "value", status: "published"}}),
        ]);
        const legacyRefs = (report: ValueReportInput) => [
          ...report.realized.map(item => item.evidence.reference),
          ...(report.actualCostEvidence ? [report.actualCostEvidence.reference] : []),
        ].map(normalizeFinancialReference);
        if (kind.data === "financial") {
          const entry = FinancialEntry.parse(JSON.parse(latest.content));
          const refs = financialEvidenceReferences(entry);
          if (reports.some(report => legacyRefs(ValueReportInput.parse(JSON.parse(report.content))).some(ref => refs.includes(ref)))) return "duplicate-financial";
          const found = entries.some(row => row.period !== latest.period &&
            financialEvidenceReferences(FinancialEntry.parse(JSON.parse(row.content))).some(ref => refs.includes(ref)));
          if (found) return "duplicate-financial";
        } else {
          const proposedRefs = legacyRefs(ValueReportInput.parse(JSON.parse(latest.content)));
          const historicalRefs = new Set([
            ...reports.filter(row => row.period !== latest.period).flatMap(row => legacyRefs(ValueReportInput.parse(JSON.parse(row.content)))),
            ...entries.flatMap(row => financialEvidenceReferences(FinancialEntry.parse(JSON.parse(row.content)))),
          ]);
          if (new Set(proposedRefs).size !== proposedRefs.length || proposedRefs.some(ref => historicalRefs.has(ref))) return "duplicate-financial";
        }
      }
      if (["readiness", "opportunity", "measurement"].includes(kind.data)) {
        const [context, source] = await Promise.all([contextFor(db, scope.clientId), intakeSource(db, scope)]);
        const evaluation = kind.data === "opportunity"
          ? opportunity(OpportunityReview.parse(JSON.parse(latest.content)).scores, context.profile, scope.clientId)
          : undefined;
        if (kind.data === "readiness" && !readiness(ReadinessReview.parse(JSON.parse(latest.content)).scores).coverage) return "evidence";
        await db.engagementRevision.create({
          data: {...where, kind: kind.data + "-review-source", version: latest.version + 1, status: "internal", actorUserId: actor.id,
            content: JSON.stringify({contextVersion: context.version, intake: source?.source ?? null, evaluation})},
        });
      }
      return db.engagementRevision.create({
        data: {...where, version: latest.version + 1, content: latest.content,
          status: kind.data === "opportunity" ? "reviewed" : "published", actorUserId: actor.id},
      });
    });
    if (outcome === "missing") { reply(res, 404, "Client engagement not found."); return; }
    if (outcome === "incident-agreement") { reply(res, 409, "An executed SLA is required before publishing incident performance."); return; }
    if (outcome === "duplicate-financial") { reply(res, 409, "This financial evidence is already counted in the engagement. Revise the original record."); return; }
    if (outcome === "evidence") { reply(res, 422, "Record evidence for at least one readiness dimension before publication."); return; }
    if (outcome === "proposal") {reply(res, 409, "Link an accepted proposal before publishing a change order."); return;}
    if (outcome === "conflict") { reply(res, 409, "A current saved draft is required. Reload before publishing."); return; }
    const result = record(outcome);
    if (kind.data !== "opportunity") { res.status(201).json(result); return; }
    const context = await contextFor(prisma, scope.clientId);
    res.status(201).json({...result, calculation: opportunity(OpportunityReview.parse(result.content).scores, context.profile, scope.clientId)});
  });

  const executedRequest = z.object({
    expectedVersion: version.min(1), signatureReference: z.string().trim().min(1).max(200), executedOn: z.string().date(),
  }).strict();
  router.post(admin + "/:workspace/sla/execute", async (req, res) => {
    const scope = {clientId: String(req.params.clientId), workspace: String(req.params.workspace)};
    const actor = (req as AuthedRequest).atgUser!;
    const input = executedRequest.safeParse(req.body);
    if (!input.success || input.data.executedOn > new Date().toISOString().slice(0, 10)) {
      reply(res, 422, "Enter the reference and date of the signed agreement."); return;
    }
    const outcome = await transaction(async db => {
      if (!await belongs(db, scope)) return "missing";
      const where = {...scope, kind: "sla", period: ""};
      const latest = await db.engagementRevision.findFirst({where, orderBy: {version: "desc"}});
      if (!latest || latest.version !== input.data.expectedVersion || latest.status !== "published") return "conflict";
      const {signatureReference, executedOn} = input.data;
      const proposal = scope.workspace === unlinked ? null : await db.discoveryProposal.findUnique({where: {discoveryIntakeId: scope.workspace}});
      const binding = proposal ? await contractBindingFor(db, scope, proposal.id) : null;
      await db.engagementRevision.create({
        data: {...where, kind: "sla-signature", version: latest.version + 1, content: JSON.stringify({signatureReference, executedOn, reviewedSlaVersion: latest.version,
          proposalId: proposal?.acceptedAt ? proposal.id : null, proposalApprovedAt: proposal?.acceptedAt ? proposal.approvedAt : null,
          originalBindingDigest: proposal?.acceptedAt ? binding?.digest ?? null : null}),
          status: "internal", actorUserId: actor.id},
      });
      return db.engagementRevision.create({
        data: {...where, version: latest.version + 1, content: latest.content, status: "executed", actorUserId: actor.id},
      });
    });
    if (outcome === "missing") { reply(res, 404, "Client engagement not found."); return; }
    if (outcome === "conflict") { reply(res, 409, "A current published SLA is required. Reload before recording execution."); return; }
    res.status(201).json(record(outcome));
  });

  const copyRequest = z.object({
    expectedVersion: version.min(1), expectedProposalUpdatedAt: z.string().datetime(), installments: z.unknown(),
  }).strict();
  router.post(admin + "/:workspace/estimate/copy-quote", async (req, res) => {
    const scope = {clientId: String(req.params.clientId), workspace: String(req.params.workspace)};
    const actor = (req as AuthedRequest).atgUser!;
    const input = copyRequest.safeParse(req.body);
    if (!input.success || scope.workspace === unlinked || !id.safeParse(scope.workspace).success) {
      reply(res, 422, "Select a linked proposal and a balanced installment schedule."); return;
    }
    const outcome = await transaction(async db => {
      if (!await belongs(db, scope)) return "missing";
      const latest = await db.engagementRevision.findFirst({where: {...scope, kind: "estimate", period: ""}, orderBy: {version: "desc"}});
      const proposal = await db.discoveryProposal.findUnique({where: {discoveryIntakeId: scope.workspace}});
      if (!latest || !proposal || proposal.approvedAt || proposal.acceptedAt || proposal.status !== "draft" ||
        latest.version !== input.data.expectedVersion || proposal.updatedAt.toISOString() !== input.data.expectedProposalUpdatedAt) return "conflict";
      const saved = SavedEstimate.parse(JSON.parse(latest.content));
      if (saved.source && !sameSource(saved.source, (await intakeSource(db, scope))?.source ?? null)) return "stale";
      const origins = Object.values(saved.provenance ?? {});
      if (origins.some(item => item.origin === "ai" && !item.reviewed)) return "ai-review";
      if (origins.some(item => item.origin === "sla")) {
        const sla = await db.engagementRevision.findFirst({
          where: {...scope, kind: "sla", status: {in: ["published", "executed"]}}, orderBy: {version: "desc"},
        });
        if (origins.some(item => item.origin === "sla" && item.revision !== String(sla?.version))) return "stale";
      }
      const quote = quoteFromEstimate(saved.input, input.data.installments);
      if (!quote.success) return "quote";
      const investment = reviewedInvestment(quote.data);
      const rate = (saved.input.additionalHourlyCents / 100).toLocaleString("en-US", {style: "currency", currency: "USD"});
      investment.notes += "\n\nAdditional work outside the agreed scope requires prior written authorization and a separate change order. Hourly rate: " + rate + ".";
      if (saved.input.engagement === "monthly") investment.notes += "\nThe quote covers " + saved.input.months + " months of recurring work.";
      const updated = await db.discoveryProposal.updateMany({
        where: {id: proposal.id, status: "draft", approvedAt: null, acceptedAt: null, updatedAt: proposal.updatedAt},
        data: {investment: JSON.stringify(investment)},
      });
      if (updated.count !== 1) return "conflict";
      await db.engagementRevision.create({
        data: {...scope, kind: "quote-transfer", version: latest.version, content: JSON.stringify({proposalId: proposal.id, investmentDigest: digestOf(JSON.stringify(investment))}),
          status: "internal", actorUserId: actor.id},
      });
      return "ok";
    });
    if (outcome === "missing") { reply(res, 404, "Client engagement not found."); return; }
    if (outcome === "ai-review") { reply(res, 409, "Review AI-suggested pricing assumptions before transferring the quote."); return; }
    if (outcome === "quote") { reply(res, 422, "Installments must equal the scoped quote and each amount must be valid."); return; }
    if (outcome === "stale") { reply(res, 409, "The imported source changed. Review it and save a new estimate revision."); return; }
    if (outcome === "conflict") { reply(res, 409, "Quote or estimate has changed, is locked, or this revision has already been copied. Reload before retrying."); return; }
    res.json({ok: true});
  });

  router.get("/client/engagement-workspace", ...clientAuth, async (req, res) => {
    const actor = (req as AuthedRequest).atgUser;
    res.set("Cache-Control", "private, no-store");
    if (!actor?.clientId || actor.isImpersonating) { reply(res, 403, "Client access is required."); return; }
    const intakes = await prisma.discoveryIntake.findMany({where: {clientId: actor.clientId}, select: {id: true}});
    const rows = await prisma.engagementRevision.findMany({
      where: {
        clientId: actor.clientId, workspace: {in: [unlinked, ...intakes.map(intake => intake.id)]},
        OR: [{kind: "sla", status: "executed"}, {kind: "change", status: "accepted"},
          {kind: {in: ["sla", "value", "advisory", "seo", "change", "readiness", "measurement", "sla-incident"]}, status: "published"}],
      },
      distinct: ["workspace", "kind", "period", "status"], orderBy: [{createdAt: "desc"}, {version: "desc"}], take: 250,
    });
    const sites = [unlinked, ...intakes.map(intake => intake.id)];
    const financialRows = await prisma.engagementRevision.findMany({
      where: {clientId: actor.clientId, workspace: {in: sites}, kind: "financial", status: "published"},
      orderBy: {version: "desc"}, distinct: ["workspace", "period"],
    });
    const financialScopes = new Map<string, FinancialEntryInput[]>();
    for (const row of financialRows) {
      const group = financialScopes.get(row.workspace) ?? [];
      group.push(FinancialEntry.parse(JSON.parse(row.content)));
      financialScopes.set(row.workspace, group);
    }
    const finance = await Promise.all([...financialScopes.entries()].map(async ([workspace, entries]) => {
      const proposal = workspace === unlinked ? null : await prisma.discoveryProposal.findUnique({where: {discoveryIntakeId: workspace}});
      const quote = proposal?.acceptedAt ? savedQuote(proposal.investment) : null;
      return {workspace, contractedFeeCents: quote ? quote.workstreams.reduce((sum, row) => sum + cents(row.amount), 0) : null, ...sumFinancialLedger(entries)};
    }));
    const baselines = await prisma.engagementRevision.findMany({
      where: {clientId: actor.clientId, workspace: {in: [unlinked, ...intakes.map(intake => intake.id)]},
        kind: "readiness", status: "published"},
      orderBy: [{createdAt: "asc"}, {version: "asc"}], distinct: ["workspace"],
    });
    const readinessBaselines = baselines.map(clientRecord);
    const timingRows = await prisma.engagementRevision.findMany({
      where: {clientId: actor.clientId, kind: "sla-incident-timing", workspace: {in: sites}},
      orderBy: {version: "desc"}, distinct: ["workspace", "period"],
    });
    const timing = new Map(timingRows.map(row => [JSON.stringify([row.workspace, row.period, row.version]), JSON.parse(row.content)]));
    const incidents = rows.filter(row => row.kind === "sla-incident").map(row => {
      const incident = SlaIncident.parse(JSON.parse(row.content));
      return {workspace: row.workspace, reference: incident.reference, title: incident.title, severity: incident.severity,
        slaVersion: incident.slaVersion, reportedAt: incident.reportedAt, acknowledgedAt: incident.acknowledgedAt,
        respondedAt: incident.respondedAt, restoredAt: incident.restoredAt, resolvedAt: incident.resolvedAt,
        exceptions: incident.exceptions, timing: timing.get(JSON.stringify([row.workspace, row.period, row.version])) ?? null};
    });
    // Keep the current executed SLA visible alongside a more recent review copy.
    const executed = new Map(rows.filter(row => row.kind === "sla" && row.status === "executed")
      .map(row => [row.workspace, row.version]));
    const acceptedChanges = new Set(rows.filter(row => row.kind === "change" && row.status === "accepted").map(row => row.workspace + ":" + row.period));
    res.json({records: rows.filter(row => {
      if (row.kind === "sla-incident") return false;
      if (row.kind === "change" && row.status === "published") return !acceptedChanges.has(row.workspace + ":" + row.period);
      return row.kind !== "sla" || row.status === "executed" || row.version > (executed.get(row.workspace) ?? 0);
    }).map(clientRecord), readinessBaselines, finance, incidents});
  });
  router.post("/client/engagement-workspace/change/accept", ...clientAuth, async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    const actor = (req as AuthedRequest).atgUser;
    if (!actor?.clientId || actor.isImpersonating || req.get("sec-fetch-site") === "cross-site" || !req.is("application/json")) {
      res.sendStatus(403); return;
    }
    const input = z.object({workspace: id, reference: changeReference, expectedVersion: version.min(1), authorized: z.literal(true)}).strict().safeParse(req.body);
    if (!input.success) {reply(res, 422, "Confirm that you are authorized to accept this exact change order."); return;}
    const scope = {clientId: actor.clientId, workspace: input.data.workspace};
    const outcome = await transaction(async db => {
      if (!await belongs(db, scope)) return "missing";
      const proposal = await db.discoveryProposal.findUnique({where: {discoveryIntakeId: scope.workspace}});
      if (!proposal?.acceptedAt || !proposal.approvedAt || !["approved", "portal_published"].includes(proposal.status)) return "missing";
      const where = {...scope, kind: "change", period: input.data.reference};
      const latest = await db.engagementRevision.findFirst({where, orderBy: {version: "desc"}});
      if (latest?.status === "accepted" && latest.version === input.data.expectedVersion + 1) return latest;
      if (!latest || latest.version !== input.data.expectedVersion || latest.status !== "published") return "conflict";
      const binding = await contractBindingFor(db, scope, proposal.id);
      await db.engagementRevision.create({data: {...where, kind: "change-binding", version: latest.version + 1, status: "internal",
        content: JSON.stringify({proposalId: proposal.id, approvedAt: proposal.approvedAt, originalBindingDigest: binding?.digest ?? null,
          reviewedChangeVersion: latest.version}), actorUserId: actor.id}});
      return db.engagementRevision.create({data: {...where, version: latest.version + 1,
        status: "accepted", content: latest.content, actorUserId: actor.id}});
    });
    if (outcome === "missing") {res.sendStatus(404); return;}
    if (outcome === "conflict") {reply(res, 409, "The change order revision changed. Reload before accepting."); return;}
    res.json(record(outcome));
  });
  return router;
}

export default createEngagementWorkspaceRouter();
