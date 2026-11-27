import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { prisma } from "./lib/db";
import type { AuthedRequest } from "./lib/auth";
import { EstimateInput, ValueReportInput, priceEngagement, quoteFromEstimate, summarizeValue } from "./lib/engagementWorkspace";
import { createEngagementWorkspaceRouter } from "./routes/engagementWorkspace";

const line = {
  label: "Workflow setup", serviceId: "workflow-engineering", quantity: 2, complexity: "medium",
  discovery: 1, implementation: 2, testing: 1, documentation: 1, training: 1,
  advisory: 2, support: 0, monitoring: 0, setupDirectCents: 1000, monthlyDirectCents: 0,
  setupFeeCents: 50000, monthlyFeeCents: 10000,
} as const;

const estimate = {
  label: "Scoped work", engagement: "monthly", months: 3, internalHourlyCents: 3500, additionalHourlyCents: 10000,
  sharedSetupCents: 0, sharedMonthlyCents: 0, monthlyReserveCents: 0, contingencyPercent: 0, marginPercent: 50,
  slaCoverage: "Weekday coverage", workstreams: [line],
} as const;

const evidence = {classification: "system export", reference: "Case 123", capturedOn: "2026-11-24", method: "Report export"} as const;
const value = {
  period: "2026-11", summary: "Documented outcome", nextSteps: "Review", limitations: "Seasonality",
  kpis: [{
    name: "Processing time", unit: "minutes", direction: "decrease", owner: "Operations",
    baselineStart: "2026-10-01", baselineEnd: "2026-10-15", observationStart: "2026-11-01", observationEnd: "2026-11-15",
    baseline: 8, projected: 4, observed: 5, baselineEvidence: evidence, observationEvidence: evidence,
    attribution: "medium", comparable: true, dependencies: "Training and staff allocation",
  }],
  projectedCapacityHours: 20, projectedCashCents: 30000, realized: [],
  actualCostCents: null, actualCostEvidence: null,
} as const;

test("workspace prices quantities, support, overrides and term without reusing client ROI", () => {
  const input = EstimateInput.parse(estimate);
  const priced = priceEngagement(input);
  assert.equal(priced.setup.costCents, 44_000);
  assert.equal(priced.setup.feeCents, 100_000);
  assert.equal(priced.monthly.feeCents, 20_000);
  assert.equal(priced.term.feeCents, 160_000);
  assert.equal(priced.firstYear.feeCents, 340_000);
  assert.equal(quoteFromEstimate(input, [{label: "Deposit", amount: "800"}, {label: "Balance", amount: "800"}]).success, true);
  assert.equal(quoteFromEstimate(input, [{label: "Invalid", amount: "1599.99"}]).success, false);
  assert.equal(EstimateInput.safeParse({...estimate, additionalHourlyCents: 9999}).success, false);
  assert.equal(EstimateInput.safeParse({...estimate, engagement: "project"}).success, false);
  assert.equal(priceEngagement(EstimateInput.parse({...estimate, workstreams: [{...line, implementation: 0, discovery: 0,
    testing: 0, documentation: 0, training: 0}]})).setup.effectiveHourlyCents, null);
});

test("value reports require comparable observations and financial records before reporting realized value", () => {
  const parsed = ValueReportInput.parse(value);
  assert.deepEqual(summarizeValue(parsed), {realizedCashCents: null, netCashCents: null, actualRoiPercent: null, observedChanges: [-3]});
  const financial = {...evidence, classification: "financial record" as const};
  const realized = {label: "Verified lower expense", amountCents: 40000, evidence: financial};
  const accounted = ValueReportInput.parse({...value, realized: [realized], actualCostCents: 20000, actualCostEvidence: financial});
  assert.equal(summarizeValue(accounted).actualRoiPercent, 100);
  assert.equal(ValueReportInput.safeParse({...value, realized: [realized, realized]}).success, false);
  assert.equal(ValueReportInput.safeParse({...value, actualCostCents: 0}).success, false);
  assert.equal(ValueReportInput.safeParse({...value, kpis: [{...value.kpis[0], observationEnd: "2026-11-16"}]}).success, false);
  assert.equal(ValueReportInput.safeParse({...value, kpis: [{...value.kpis[0], observationEvidence: {...evidence, classification: "estimate"}}]}).success, false);
});

const targets = {definition: "Defined", response: "Four covered hours", updates: "Daily", restoration: "One business day"};
const sla = {
  title: "Scoped SLA", atgParty: "ATG", clientParty: "Fixture", contractReference: "SOW 1", effectiveDate: "2026-11-01",
  term: "Three months", scope: "Workflow", deliverables: "Monitoring", exclusions: "Vendor outages", dependencies: "Account access",
  timezone: "America/Denver", coverage: "Business hours", channels: "Client portal",
  severity: {P1: targets, P2: targets, P3: targets, P4: targets}, measurementClock: "Covered hours from acknowledged incident",
  availabilityAndMaintenance: "No uptime commitment", governance: "No confidential test records", responsibilities: "Named owners",
  reporting: "Monthly", commercialTerms: "Agreed under SOW 1", includedHours: 6, additionalHourlyCents: 10000,
  changeAuthorization: "Written approval before additional work", escalation: "ATG operator", terminationAndHandoff: "Manual export",
};

test("workspace routes enforce tenancy, fresh sources, publication and locked proposals on PostgreSQL", {
  skip: !process.env.ATG_INTEGRATION_DATABASE_URL,
}, async () => {
  process.env.DATABASE_URL = process.env.ATG_INTEGRATION_DATABASE_URL;
  const marker = "test-" + randomUUID();
  const [first, second] = await Promise.all([1, 2].map(number => prisma.user.create({
    data: {email: marker + number + "@example.invalid", client: {create: {company: "Engagement fixture"}}},
    include: {client: true},
  })));
  const clientId = first!.client!.id;
  const otherClientId = second!.client!.id;
  const intake = await prisma.discoveryIntake.create({
    data: {clientId, expiresAt: new Date("2030-01-01"), consentGiven: true, answers: JSON.stringify({first_priority: "Workflow"})},
  });
  const proposal = await prisma.discoveryProposal.create({data: {discoveryIntakeId: intake.id}});
  const auth: RequestHandler = (req, _res, next) => {
    const mode = req.get("x-fixture-account");
    if (mode) (req as AuthedRequest).atgUser = {
      id: first!.id, role: mode === "admin" || mode === "impersonator" ? "ADMIN" : "CLIENT",
      clientId: mode === "second" ? otherClientId : clientId,
      isImpersonating: mode === "impersonator",
    } as AuthedRequest["atgUser"];
    next();
  };
  const app = express().use(express.json(), createEngagementWorkspaceRouter([auth], [auth]));
  const base = "/admin/clients/" + clientId + "/engagement-workspace";
  const workspace = base + "/" + intake.id;
  const portal = "/client/engagement-workspace";
  const operator = () => request(app);
  const admin = {"x-fixture-account": "admin"};
  const customer = {"x-fixture-account": "first"};

  try {
    await operator().get(workspace).expect(403);
    await operator().get(workspace).set(customer).expect(403);
    const references = (await operator().get(base).set(admin).expect(200)).body.catalog;
    assert.equal(references.length, 50);
    assert.equal(new Set(references.map((item: {id: string}) => item.id)).size, 50);
    await operator().get(workspace).set({"x-fixture-account": "impersonator"}).expect(403);
    await operator().get(workspace.replace(clientId, otherClientId)).set(admin).expect(404);
    const source = (await operator().get(workspace).set(admin).expect(200)).body.source.source;
    await prisma.discoveryIntake.update({where: {id: intake.id}, data: {status: "reviewed"}});
    const draft = {expectedVersion: 0, content: {input: estimate, source, formulaVersion: 1}};
    await operator().put(workspace + "/estimate").set(admin).send(draft).expect(409);
    draft.content.source = (await operator().get(workspace).set(admin).expect(200)).body.source.source;
    await operator().put(workspace + "/estimate").set(admin).send({...draft, content: {...draft.content,
      input: {...estimate, additionalHourlyCents: 9999}}}).expect(422);
    const concurrent = await Promise.all([0, 1].map(() => operator().put(workspace + "/estimate").set(admin).send(draft)));
    assert.deepEqual(concurrent.map(response => response.status).sort(), [201, 409]);
    const copy = {expectedVersion: 1, expectedProposalUpdatedAt: proposal.updatedAt.toISOString(),
      installments: [{label: "Deposit", amount: "800"}, {label: "Balance", amount: "800"}]};
    await operator().post(workspace + "/estimate/copy-quote").set(admin).send(copy).expect(200);
    const written = await prisma.discoveryProposal.findUniqueOrThrow({where: {id: proposal.id}});
    assert.match(written.investment, /Hourly rate: \$100\.00/);
    await prisma.discoveryProposal.update({where: {id: proposal.id}, data: {status: "approved", approvedAt: new Date(), acceptedAt: new Date()}});
    await operator().post(workspace + "/estimate/copy-quote").set(admin).send(copy).expect(409);

    await operator().put(workspace + "/sla").set(admin).send({expectedVersion: 0, content: sla}).expect(201);
    await operator().put(workspace + "/value").set(admin).send({expectedVersion: 0, content: value}).expect(201);
    assert.deepEqual((await operator().get(portal).set(customer).expect(200)).body.records, []);
    await operator().post(workspace + "/sla/publish").set(admin).send({expectedVersion: 1}).expect(201);
    await operator().post(workspace + "/sla/execute").set(admin).send({
      expectedVersion: 2, signatureReference: "Private reference", executedOn: "2026-11-01",
    }).expect(201);
    await operator().post(workspace + "/value/publish").set(admin).send({expectedVersion: 1, period: value.period}).expect(201);
    await operator().put(workspace + "/value").set(admin).send({expectedVersion: 2, content: {...value, summary: "Private next draft"}}).expect(201);
    const published = await operator().get(portal).set(customer).expect(200);
    assert.match(published.headers["cache-control"], /no-store/);
    assert.deepEqual(published.body.records.map((row: {kind: string}) => row.kind).sort(), ["sla", "value"]);
    assert.doesNotMatch(JSON.stringify(published.body), /Private reference|Private next draft|internalHourlyCents/);
    assert.deepEqual((await operator().get(portal).set({"x-fixture-account": "second"}).expect(200)).body.records, []);
    await operator().get(workspace).set(admin).expect(200);

    const advisory = {title: "Advisory month", objectives: "Prioritize adoption", meetingCadence: "Monthly", decisionOwner: "Client",
      scope: "Advisory", exclusions: "Implementation", includedHours: 6, hoursUsed: 3, period: "2026-11", nextReview: "2026-12-10",
      roadmap: [{item: "Evaluate options", owner: "Client", due: "2026-12-10", status: "planned"}], decisions: [],
      vendors: [{name: "Provider under review", purpose: "Document review", owner: "Client", reviewDate: "2026-12-10"}]};
    await operator().put(workspace + "/advisory").set(admin).send({expectedVersion: 0, content: advisory}).expect(201);
    await operator().post(workspace + "/advisory/publish").set(admin).send({expectedVersion: 1, period: advisory.period}).expect(201);
    const advisoryRecord = (await operator().get(portal).set(customer).expect(200)).body.records.find((row: {kind: string}) => row.kind === "advisory");
    assert.deepEqual(advisoryRecord.content.roadmap, advisory.roadmap);

    const gsc = {start: "2026-10-01", end: "2026-10-14", clicks: 100, impressions: 1000, ctr: .1, averagePosition: 8};
    const seo = {period: "2026-11", gsc: {property: "sc-domain:example.invalid", baselineReference: "Baseline", currentReference: "Current"}, ga4: null,
      previous: {searchConsole: gsc}, current: {searchConsole: {...gsc, start: "2026-11-01", end: "2026-11-14", clicks: 65}},
      notes: "Review seasonality", actions: [], aeo: []};
    await operator().put(workspace + "/seo").set(admin).send({expectedVersion: 0, content: seo}).expect(201);
    await operator().post(workspace + "/seo/publish").set(admin).send({expectedVersion: 1, period: seo.period}).expect(201);
    const seoRecord = (await operator().get(portal).set(customer).expect(200)).body.records.find((row: {kind: string}) => row.kind === "seo");
    assert.equal(seoRecord.findings[0].id, "gsc-click-decline");

    const change = {reference: "CO-001", title: "Extra training", scope: "Train support staff", reason: "New team",
      timeline: "Week 2", acceptance: "Attend a session", includedHours: 2, additionalHourlyCents: 10000,
      additionalFeeCents: 20000, commercialTerms: "Separate invoice after written acceptance"};
    await operator().put(workspace + "/change").set(admin).send({expectedVersion: 0, content: {...change, additionalFeeCents: 19999}}).expect(422);
    await operator().put(workspace + "/change").set(admin).send({expectedVersion: 0, content: change}).expect(201);
    await operator().post(workspace + "/change/publish").set(admin).send({expectedVersion: 1, period: change.reference}).expect(201);
    const acceptPath = portal + "/change/accept";
    const acceptance = {workspace: intake.id, reference: change.reference, expectedVersion: 2, authorized: true};
    await operator().post(acceptPath).set({"x-fixture-account": "second"}).send(acceptance).expect(404);
    await operator().post(acceptPath).set(customer).send({...acceptance, expectedVersion: 1}).expect(409);
    await operator().post(acceptPath).set(customer).send(acceptance).expect(200);
    await operator().post(acceptPath).set(customer).send(acceptance).expect(200);
    await operator().put(workspace + "/change").set(admin).send({expectedVersion: 3, content: change}).expect(409);
  } finally {
    await prisma.discoveryProposal.delete({where: {id: proposal.id}});
    await prisma.discoveryIntake.delete({where: {id: intake.id}});
    await prisma.user.deleteMany({where: {id: {in: [first!.id, second!.id]}}});
    await prisma.$disconnect();
  }
});
