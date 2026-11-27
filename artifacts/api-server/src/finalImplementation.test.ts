import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { emptyBusinessContext } from "./lib/businessContext";
import { opportunity, readiness } from "./lib/consultingIntelligence";
import { forecast, ForecastInput, kpiRegistry, MeasurementPlan } from "./lib/engagementMeasurement";
import { FinancialEntry, sumFinancialLedger } from "./lib/financialBenefitLedger";
import { buildOperatingPlan, operatingGovernanceReasons, publishedOperatingPlan } from "./lib/operatingPlan";
import { SlaIncident, slaTiming } from "./lib/slaClock";
import { classifyThreads } from "./lib/prospectGmail";
import { assessProspect } from "./lib/prospecting";
import { contractBindingFor, newContractBinding } from "./lib/engagementContract";

import { transformationServices } from "./lib/transformationServices";
import { createEngagementWorkspaceRouter } from "./routes/engagementWorkspace";
import { createOperationsRouter } from "./routes/operations";
import { createPortalRouter } from "./routes/portal";
import { reviewedInvestment } from "./lib/customQuote";
import type { AuthedRequest } from "./lib/auth";
import { prisma } from "./lib/db";
import { isSuppressed, suppressProspect, suppressionKeys } from "./lib/prospectSuppression";

const evidence = {score: 4, evidence: "confidential reference 24"};
const scores = {infrastructure: evidence, data: evidence, process: evidence, adoption: evidence, governance: evidence, team: evidence};
const opportunityScores = {serviceId: "workflow-engineering", impact: evidence, roi: evidence, feasibility: evidence, urgency: evidence, confidence: evidence};
const cleared = (clientId: string) => ({...emptyBusinessContext(clientId), decisionOwner: "Operator",
  accessReview: "confirmed", dataReview: "confirmed", humanOversight: "confirmed", regulatedReview: "not-applicable"});

test("readiness preserves unknown dimensions and opportunity governance overrides the weighted score", () => {
  assert.equal(readiness(scores).score, 100);
  assert.deepEqual(readiness({...scores, data: {score: null, evidence: ""}}), {score: null, coverage: 5, total: 6, missing: ["data"]});
  assert.equal(opportunity({...opportunityScores, impact: {score: 0, evidence: "Reviewed"}}, cleared("scope"), "scope").score, 70);
  assert.equal(opportunity(opportunityScores, {...cleared("scope"), accessReview: "blocked"}, "scope").priority, "blocked");
  assert.equal(opportunity({...opportunityScores, serviceId: "voice-ai"}, cleared("scope"), "scope").priority, "discovery");
  assert.ok(transformationServices.every(service => kpiRegistry.some(kpi => kpi.serviceId === service.id)));
});

const scenario = {reductionPercent: 50, adoptionPercent: 100, effectivenessPercent: 100, realizablePercent: 50,
  incrementalMonthlyRevenueCents: 10000, contributionMarginPercent: 50, attributionPercent: 50, rampMonths: 0};
const assumption = ForecastInput.parse({monthlyWorkload: 60, minutesPerUnit: 60, hourlyCostCents: 1000,
  implementationFeeCents: 10000, recurringFeeCents: 10000, monthlyExpenseCents: 0, months: 4,
  conservative: {...scenario, reductionPercent: 0}, expected: scenario, optimistic: {...scenario, rampMonths: 2}});

test("three-scenario ROI keeps capacity and attributable profit separate and handles unknown and zero denominators", () => {
  const result = forecast(assumption);
  assert.equal(result.expected.capacityHours, 30);
  assert.equal(result.expected.capacityValueCents, 30000);
  assert.equal(result.expected.monthlyBenefitCents, 17500);
  assert.equal(result.expected.cumulativeNetCents, 20000);
  assert.equal(result.expected.paybackMonth, 2);
  assert.equal(result.expected.roiPercent, 40);
  assert.equal(result.conservative.roiPercent, -80);
  assert.equal(result.conservative.paybackMonth, null);
  assert.equal(result.optimistic.paybackMonth, 3);
  assert.equal(forecast({...assumption, monthlyWorkload: null}).expected.roiPercent, null);
  assert.equal(forecast({...assumption, implementationFeeCents: 0, recurringFeeCents: 0}).expected.roiPercent, null);
});

const financial = FinancialEntry.parse({
  reference: "BEN-001", title: "Reviewed cash savings", workstream: "Intake", financialPeriod: "2026-10",
  category: "expense-reduction", grossCents: 10000, incrementalCents: 0, incrementalCostRecord: "", attributableCents: 8000,
  attributionMethod: "Compare invoices tied to the verified retired service", attributionConfidence: "high",
  comparability: "Identical tier and coverage", sourceSystem: "Ledger", sourceRecord: "invoice-101",
  evidenceClass: "Document verified", capturedOn: "2026-11-02", evidenceMethod: "Reviewed finalized invoice",
  permissions: "Aggregate amount confirmed by client", limitations: "No other months inferred", adjustmentReason: "",
});

test("financial ledger excludes observed-only revenue and includes verified reversals on one cash basis", () => {
  const paid = FinancialEntry.parse({...financial, reference: "PAY-001", grossCents: 10000, attributableCents: 10000, category: "engagement-payment"});
  const reversal = FinancialEntry.parse({...financial, reference: "REV-001", financialPeriod: "2026-11", grossCents: -3000, attributableCents: -3000});
  const onlyObserved = FinancialEntry.parse({...financial, reference: "REV-002", category: "incremental-revenue", grossCents: 15000,
    attributableCents: 0, attributionConfidence: "low"});
  const out = sumFinancialLedger([financial, paid, reversal, onlyObserved]);
  assert.equal(out.observedRevenueCents, 15000);
  assert.equal(out.verifiedBenefitCents, 5000);
  assert.equal(out.roiPercent, -50);
  assert.equal(sumFinancialLedger([paid, onlyObserved]).roiPercent, null);
  assert.equal(FinancialEntry.safeParse({...onlyObserved, attributableCents: 1}).success, false);
  assert.equal(FinancialEntry.safeParse({...financial, incrementalCents: 1}).success, false);
});

const incident = SlaIncident.parse({
  title: "Example incident", reference: "INC-001", slaVersion: 3, severity: "P2", reportedAt: "2026-03-06T16:45:00-07:00",
  acknowledgedAt: "2026-03-09T10:05:00-06:00", respondedAt: "2026-03-09T10:15:00-06:00",
  restoredAt: "2026-03-10T09:30:00-06:00", resolvedAt: "2026-03-10T10:00:00-06:00",
  pauses: [{from: "2026-03-10T09:10:00-06:00", to: "2026-03-10T09:20:00-06:00", reason: "Client approved dependency", authorizationReference: "ref-44"}],
  escalations: "", exceptions: "", evidence: "ticket 2",
});
const targets = {responseMinutes: 30, restorationMinutes: 40};
test("SLA clock excludes holidays, off-hours and authorized pauses across DST", () => {
  const timing = slaTiming(incident, {intervals: (["Mon", "Tue", "Fri"] as const).map(day => ({day, startMinute: 540, endMinute: 1020})),
    excludedDates: ["2026-03-09"], targets: {P1: targets, P2: targets, P3: targets, P4: targets}}, "America/Denver");
  assert.equal(timing?.acknowledgment, 15);
  assert.equal(timing?.response, 15);
  assert.equal(timing?.restoration, 35);
  assert.equal(timing?.resolution, 65);
  assert.equal(timing?.metRestoration, true);
  assert.equal(slaTiming(incident, undefined, "America/Denver"), null);
  assert.equal(SlaIncident.safeParse({...incident, pauses: [...incident.pauses, ...incident.pauses]}).success, false);
});

test("legacy workflow classification, stale authorization, and private publication fields", () => {
  const plan = buildOperatingPlan(null);
  const prior = {...plan, workflows: [{...plan.workflows[0]!, id: "voice-ai", serviceId: "voice-ai", realm: "business" as const}]};
  const input = {prior, trustedIntake: plan, clientId: "first", today: "2026-11-26",
    context: {version: 2, profile: cleared("first")}};
  assert.match(operatingGovernanceReasons({...input, current: {...prior, workflows: [{...prior.workflows[0]!, serviceId: undefined}]}})[0]!, /original service/);
  assert.match(operatingGovernanceReasons({...input, current: {...prior, workflows: [{...prior.workflows[0]!, status: "live"}]}})[0]!, /pilot evidence/);
  const current = {...plan, workflows: [{...plan.workflows[0]!, id: "website-delivery", realm: "business" as const,
    status: "configured" as const, authorization: {contextVersion: 1, approvedOn: "2026-11-25", reference: "private", scope: "Authorized scope"}}]};
  const check = {...input, prior: current, current};
  assert.match(operatingGovernanceReasons(check)[0]!, /current Business Context/);
  assert.deepEqual(operatingGovernanceReasons({...check, context: {version: 1, profile: cleared("first")}}), []);
  assert.equal(publishedOperatingPlan(current).workflows[0]!.authorization, undefined);
});

test("Gmail reconciliation for a Sent transition excludes drafts and the qualification rubric uses approved weights", () => {
  const made = (labelIds: string[]) => [{messages: [{labelIds, internalDate: Date.now(), payload: {headers: [
    {name: "From", value: "shea@atgconsulting.io"}, {name: "To", value: "office@example.org"},
  ]}}]}];
  assert.equal(classifyThreads(made(["DRAFT"]), "office@example.org", "shea@atgconsulting.io", true).lastOutboundAt, null);
  assert.equal(classifyThreads(made(["SENT"]), "office@example.org", "shea@atgconsulting.io", true).status, "outbound_found");
  const review = {industryFit: 0, sizeFit: 0, urgency: 0, contactConfidence: 5, observableNeed: 5, suppressed: false,
    qualification: {economicPotential: 5, serviceFit: 0, feasibility: 0, expansion: 0},
    evidence: [{claim: "Observed", sourceUrl: "https://example.org", observedAt: "2026-11-26", verified: true}]};
  assert.equal(assessProspect(review).total, 65);
  assert.equal(assessProspect(review).priority, "qualified");
  assert.equal(assessProspect({...review, suppressed: true}).label, "HOLD");
});

const plan = MeasurementPlan.parse({
  title: "Original measurement plan", objectives: "Decrease handling time", cadence: "Monthly", evaluationOn: "2026-12-01",
  registryVersion: 1, calculationVersion: 1, forecast: assumption,
  metrics: [{kpiId: "processing-time", workstream: "Requests", owner: "Client", source: "Operator sample",
    evidence: "Timed cases", comparableWorkload: "Standard service requests", baseline: null, target: 5,
    baselineStart: "2026-11-01", baselineEnd: "2026-11-23", collectionPlan: "Collect ten baseline timings",
    evidenceClass: "Not yet measurable", attribution: "Compare timed cases", limitations: "Small sample", dependencies: ""}],
});

test("PostgreSQL revision routes keep published evidence private and enforce immutable reviewed relationships", {
  skip: !process.env.ATG_INTEGRATION_DATABASE_URL,
}, async () => {
  process.env.DATABASE_URL = process.env.ATG_INTEGRATION_DATABASE_URL;
  const prefix = "final-" + randomUUID();
  const users = await Promise.all(["first", "other"].map(name => prisma.user.create({data: {
    email: prefix + name + "@example.invalid", client: {create: {company: name}},
  }, include: {client: true}})));
  const clientId = users[0]!.client!.id;
  const otherId = users[1]!.client!.id;
  const intake = await prisma.discoveryIntake.create({data: {clientId, consentGiven: true, expiresAt: new Date("2030-01-01")}});
  const auth: RequestHandler = (req, _res, next) => {
    const mode = req.get("x-fixture");
    if (mode) (req as AuthedRequest).atgUser = {id: users[0]!.id, clientId: mode === "other" ? otherId : clientId,
      role: mode === "admin" || mode === "impersonator" ? "ADMIN" : "CLIENT", isImpersonating: mode === "impersonator"} as AuthedRequest["atgUser"];
    next();
  };
  const app = express();
  app.use(express.json());
  app.use(createEngagementWorkspaceRouter([auth], [auth]));
  app.use(createOperationsRouter(auth));
  app.use(createPortalRouter(auth));
  const api = request(app);
  const base = "/admin/clients/" + clientId + "/engagement-workspace/" + intake.id;
  const save = (kind: string, content: unknown, expectedVersion = 0) =>
    api.put(base + "/" + kind).set("x-fixture", "admin").send({content, expectedVersion});
  const publish = (kind: string, period?: string, expectedVersion = 1) =>
    api.post(base + "/" + kind + "/publish").set("x-fixture", "admin").send({expectedVersion, period});
  const client = (mode = "client") => api.get("/client/engagement-workspace").set("x-fixture", mode);
  const suppressionHost = prefix + ".example.invalid";
  try {
    const original = {title: "Readiness", period: "2026-10", scores, summary: "Reviewed client findings", recommendations: []};
    assert.equal((await save("readiness", original)).status, 201);
    assert.equal((await publish("readiness", original.period)).status, 201);
    assert.equal((await save("readiness", {...original, summary: "Updated" }, 2)).status, 201);
    assert.equal((await publish("readiness", original.period, 3)).status, 201);
    const visible = (await client()).body;
    assert.equal(visible.readinessBaselines[0].version, 2);
    assert.equal(visible.records[0].version, 4);
    assert.ok(!JSON.stringify(visible).includes("confidential reference"));
    assert.equal((await client("other")).body.records.length, 0);
    assert.equal((await client("impersonator")).status, 403);

    assert.equal((await save("measurement", plan)).status, 201);
    assert.equal((await publish("measurement")).status, 201);
    const approvedAt = new Date();
    const proposal = await prisma.discoveryProposal.create({data: {discoveryIntakeId: intake.id, status: "approved", approvedAt,
      investment: JSON.stringify(reviewedInvestment({workstreams: [{label: "Setup", amount: "100"}], installments: [{label: "Final", amount: "100"}]}))}});
    const binding = newContractBinding({proposalId: proposal.id, approvedAt: approvedAt.toISOString(), statementOfWorkDigest: "fixture",
      measurementVersion: 2, additionalHourlyCents: 10000, slaVersion: null, estimateVersion: null, opportunities: []});
    await prisma.engagementRevision.create({data: {clientId, workspace: intake.id, kind: "contract-binding", version: 1,
      status: "internal", content: JSON.stringify(binding), actorUserId: users[0]!.id}});
    assert.equal((await save("measurement", {...plan, title: "Reforecast"}, 2)).status, 201);
    assert.equal((await publish("measurement", undefined, 3)).status, 201);
    assert.equal((await contractBindingFor(prisma, {clientId, workspace: intake.id}, proposal.id))?.measurementVersion, 2);
    const quote = (await api.get("/portal/proposal").set("x-fixture", "client")).body.proposal;
    assert.equal(quote.commercialTerms.measurement.content.title, plan.title);
    assert.ok(!JSON.stringify(quote).includes("estimateVersion"));
    const accept = (digest?: string) => api.post("/portal/proposal/accept").set("x-fixture", "client")
      .send({proposalId: proposal.id, approvedAt: approvedAt.toISOString(), bindingDigest: digest});
    assert.equal((await accept()).status, 409);
    assert.equal((await accept(binding.digest)).status, 200);

    assert.equal((await save("financial", financial)).status, 201);
    assert.equal((await publish("financial", financial.reference)).status, 201);
    const second = {...financial, reference: "BEN-002", financialPeriod: "2026-11", sourceRecord: " INVOICE-101 "};
    assert.equal((await save("financial", second)).status, 201);
    assert.equal((await publish("financial", second.reference)).status, 409);
    assert.equal((await save("financial", {...financial, attributableCents: 7000}, 2)).status, 422);
    assert.equal((await save("financial", {...financial, attributableCents: 7000, adjustmentReason: "Corrected source total"}, 2)).status, 201);
    assert.equal((await publish("financial", financial.reference, 3)).status, 201);
    const finance = (await client()).body.finance[0];
    assert.equal(finance.verifiedBenefitCents, 7000);
    assert.equal(finance.contractedFeeCents, 10000);
    assert.ok(!JSON.stringify(finance).includes(financial.sourceRecord));

    const ops = buildOperatingPlan(null);
    const workflows = [{...ops.workflows[0]!, id: "website-delivery", realm: "business", status: "configured",
      authorization: {contextVersion: 1, approvedOn: "2026-11-25", reference: "external signed scope", scope: "website"}}];
    await prisma.operatingPlan.create({data: {clientId, content: JSON.stringify({...ops, workflows})}});
    await prisma.businessContextVersion.create({data: {clientId, content: JSON.stringify({...cleared(clientId), version: 2}),
      version: 2, actorUserId: users[0]!.id}});
    const opsBase = "/admin/clients/" + clientId + "/operations";
    assert.equal((await api.post(opsBase + "/publish").set("x-fixture", "admin").send({version: 1})).status, 409);
    assert.equal((await api.post(opsBase + "/publish").set("x-fixture", "impersonator").send({version: 1})).status, 403);

    await suppressProspect(prisma, suppressionKeys(suppressionHost, "Office@" + suppressionHost), users[0]!.id, "fixture");
    await suppressProspect(prisma, suppressionKeys(suppressionHost), users[0]!.id, "repeat");
    assert.equal(await prisma.atgProspectSuppression.count({where: {key: {contains: suppressionHost}}}), 2);
    assert.equal(await isSuppressed(prisma, suppressionKeys("unrelated.example", "office@" + suppressionHost)), true);
  } finally {
    await prisma.atgProspectSuppression.deleteMany({where: {key: {contains: suppressionHost}}});
    await prisma.discoveryProposal.deleteMany({where: {discoveryIntakeId: intake.id}});
    await prisma.discoveryIntake.deleteMany({where: {id: intake.id}});
    await prisma.client.deleteMany({where: {id: {in: [clientId, otherId]}}});
    await prisma.user.deleteMany({where: {id: {in: users.map(user => user.id)}}});
    await prisma.$disconnect();
  }
});
