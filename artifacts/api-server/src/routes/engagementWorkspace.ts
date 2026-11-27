import { workflowEstimateCatalog, workflowEstimateCatalogVersion } from "../lib/workflowEstimateCatalog";
import { SeoEvidenceInput, summarizeSeo } from "../lib/seoEvidence";
import { Router, type Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, requireAuth, type AuthedRequest } from "../lib/auth";
import { answerMap } from "../lib/intakeAnswers";
import { parseFitCallAnswers } from "../lib/fitCall";
import { reviewedInvestment, savedQuote } from "../lib/customQuote";
import {
  AdvisoryInput, ChangeOrderInput, changeReference, IntakeSource, SavedEstimate, SlaInput, ValueReportInput,
  estimateFormula, priceEngagement, quoteFromEstimate, reportPeriod, summarizeValue,
} from "../lib/engagementWorkspace";

const schemas = {estimate: SavedEstimate, sla: SlaInput, value: ValueReportInput, advisory: AdvisoryInput, seo: SeoEvidenceInput, change: ChangeOrderInput};
const kinds = z.enum(["estimate", "sla", "value", "advisory", "seo", "change"]);
const version = z.number().int().min(0).max(1_000_000);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const unlinked = "unlinked";
const reply = (res: Response, code: number, error: string) => res.status(code).json({error});
const draftRequest = z.object({expectedVersion: version, content: z.unknown()}).strict();
type Database = Pick<Prisma.TransactionClient, "engagementRevision" | "discoveryIntake" | "discoveryProposal" | "client">;
const validPeriod = (kind: string, input: unknown) => kind === "change" ? changeReference.safeParse(input).success :
  usesPeriod(kind) ? reportPeriod.safeParse(input).success : input === "";
const usesPeriod = (kind: string) => ["value", "seo", "advisory"].includes(kind);
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

function record(row: {kind: string; version: number; status: string; period: string; content: string; createdAt: Date; workspace: string}) {
  const kind = kinds.parse(row.kind);
  const content = schemas[kind].parse(JSON.parse(row.content));
  const result = {kind, workspace: row.workspace, version: row.version, status: row.status, period: row.period, createdAt: row.createdAt, content};
  if (kind === "estimate") return {...result, calculation: priceEngagement(SavedEstimate.parse(content).input)};
  if (kind === "value") return {...result, calculation: summarizeValue(ValueReportInput.parse(content))};
  if (kind === "seo") return {...result, findings: summarizeSeo(SeoEvidenceInput.parse(content))};
  return result;
}

async function transaction<T>(work: (db: Prisma.TransactionClient) => Promise<T>): Promise<T | "conflict"> {
  try {
    return await prisma.$transaction(work, {isolationLevel: Prisma.TransactionIsolationLevel.Serializable});
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) return "conflict";
    throw error;
  }
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
    const [rows, source] = await Promise.all([
      prisma.engagementRevision.findMany({where: {...scope, kind: {in: kinds.options}}, distinct: ["kind", "period"], orderBy: {version: "desc"}, take: 400}),
      intakeSource(prisma, scope),
    ]);
    res.json({records: rows.map(record), source});
  });

  router.get(admin + "/:workspace/:kind/history", async (req, res) => {
    const scope = {clientId: String(req.params.clientId), workspace: String(req.params.workspace)};
    const kind = kinds.safeParse(req.params.kind);
    const period = req.query.period ?? "";
    if (!kind.success || !validPeriod(kind.data, period)) {
      reply(res, 422, "Invalid history request."); return;
    }
    if (!await belongs(prisma, scope)) { reply(res, 404, "Client engagement not found."); return; }
    const rows = await prisma.engagementRevision.findMany({
      where: {...scope, kind: kind.data, period: String(period)}, orderBy: {version: "desc"}, take: 25,
    });
    res.json({records: rows.map(row => ({...record(row), actorUserId: row.actorUserId}))});
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
      if (kind.data === "estimate") {
        const {source} = SavedEstimate.parse(content.data);
        if (source && !sameSource(source, (await intakeSource(db, scope))?.source ?? null)) return "stale";
      }
      const where = {...scope, kind: kind.data, period};
      const latest = await db.engagementRevision.findFirst({where, orderBy: {version: "desc"}});
      if ((latest?.version ?? 0) !== parsed.data.expectedVersion || latest?.status === "accepted") return "conflict";
      return db.engagementRevision.create({
        data: {...where, version: parsed.data.expectedVersion + 1, content: JSON.stringify(content.data), status: "draft", actorUserId: actor.id},
      });
    });
    if (outcome === "missing") { reply(res, 404, "Client engagement not found."); return; }
    if (outcome === "stale") { reply(res, 409, "A linked source changed. Review the current sources before saving."); return; }
    if (outcome === "conflict") { reply(res, 409, "This draft changed. Reload before saving."); return; }
    res.status(201).json(record(outcome));
  });

  const publishRequest = z.object({expectedVersion: version.min(1), period: z.string().max(27).optional()}).strict();
  router.post(admin + "/:workspace/:kind/publish", async (req, res) => {
    const scope = {clientId: String(req.params.clientId), workspace: String(req.params.workspace)};
    const actor = (req as AuthedRequest).atgUser!;
    const kind = z.enum(["sla", "value", "advisory", "seo", "change"]).safeParse(req.params.kind);
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
      return db.engagementRevision.create({
        data: {...where, version: latest.version + 1, content: latest.content, status: "published", actorUserId: actor.id},
      });
    });
    if (outcome === "missing") { reply(res, 404, "Client engagement not found."); return; }
    if (outcome === "proposal") {reply(res, 409, "Link an accepted proposal before publishing a change order."); return;}
    if (outcome === "conflict") { reply(res, 409, "A current saved draft is required. Reload before publishing."); return; }
    res.status(201).json(record(outcome));
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
      await db.engagementRevision.create({
        data: {...where, kind: "sla-signature", version: latest.version + 1, content: JSON.stringify({signatureReference, executedOn}),
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
        data: {...scope, kind: "quote-transfer", version: latest.version, content: JSON.stringify({proposalId: proposal.id}),
          status: "internal", actorUserId: actor.id},
      });
      return "ok";
    });
    if (outcome === "missing") { reply(res, 404, "Client engagement not found."); return; }
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
          {kind: {in: ["sla", "value", "advisory", "seo", "change"]}, status: "published"}],
      },
      distinct: ["workspace", "kind", "period", "status"], orderBy: [{createdAt: "desc"}, {version: "desc"}], take: 250,
    });
    // Keep the current executed SLA visible alongside a more recent review copy.
    const executed = new Map(rows.filter(row => row.kind === "sla" && row.status === "executed")
      .map(row => [row.workspace, row.version]));
    const acceptedChanges = new Set(rows.filter(row => row.kind === "change" && row.status === "accepted").map(row => row.workspace + ":" + row.period));
    res.json({records: rows.filter(row => {
      if (row.kind === "change" && row.status === "published") return !acceptedChanges.has(row.workspace + ":" + row.period);
      return row.kind !== "sla" || row.status === "executed" || row.version > (executed.get(row.workspace) ?? 0);
    }).map(record)});
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
