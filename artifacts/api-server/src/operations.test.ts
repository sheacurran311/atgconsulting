import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { buildOperatingPlan, OperatingPlanSchema, operatingPlanMarkdown } from "./lib/operatingPlan";
import { assessmentQuestions, assessmentStep, applicableAnswers } from "./lib/assessmentProfile";
import { createOperationsRouter } from "./routes/operations";
import { prisma } from "./lib/db";
import { resolveClerkUser, type AuthedRequest } from "./lib/auth";
import { blockIfImpersonating } from "./lib/impersonate";
import { reportEmailText } from "./lib/reportDelivery";
import { sendAssessmentReport } from "./lib/email";

test("audience branches retain audit essentials and separate family from business", () => {
  for (const audience of ["My business", "My personal and family life", "Both business and personal life"]) {
    const answers = [{ id: "audience", answer: audience }];
    const ids = assessmentQuestions(answers).map((q) => q.id);
    assert.ok(ids.includes("approval_preference"));
    assert.ok(ids.includes("data_boundaries"));
    assert.ok(ids.includes("task_frequency"));
    assert.ok(ids.length <= 30);
    assert.ok(!ids.includes("family_sources"));
    assert.equal(ids.includes("business_type"), audience !== "My personal and family life");
    const plan = buildOperatingPlan(JSON.stringify(answers));
    assert.deepEqual(plan.workflows.map(w=>w.name),["Define the first project"]);
    assert.ok(plan.workflows.every((w) => w.status === "planned" && w.baselineMinutes === null));
    assert.match(operatingPlanMarkdown(plan), /Not measured/);
  }
  const ids = assessmentQuestions([{ id: "decision_authority", answer: "Yes — I can approve it and grant access to the systems involved" }]).map((q) => q.id);
  assert.ok(!ids.includes("approver_email"));
});

test("status cannot claim successful installation without dated evidence", () => {
  const p = buildOperatingPlan(null);
  p.workflows[0]!.status = "live";
  assert.equal(OperatingPlanSchema.safeParse(p).success, false);
  Object.assign(p.workflows[0]!, { platform: "Customer test platform", evidence: "Verified output from approved test", checkedAt: "2026-11-13", lastSuccessAt: "2026-11-13" });
  assert.equal(OperatingPlanSchema.safeParse(p).success, true);
  p.phases[0]!.status = "complete";
  assert.equal(OperatingPlanSchema.safeParse(p).success, false);
});

test("unverified primary email cannot create or link an identity", async () => {
  const result = await resolveClerkUser({} as any, "unverified", { primaryEmailAddressId: "primary", emailAddresses: [{ id: "primary", emailAddress: "shea@atgconsulting.io", verification: { status: "unverified" } }] } as any);
  assert.equal(result, null); // No database available: any identity lookup would fail this test.
});

test("operating guide API isolates customers, preserves drafts, and requires a reviewed version", async () => {
  const published = JSON.stringify(buildOperatingPlan(null));
  const originalFind = prisma.operatingPlan.findUnique;
  const originalUpdate = prisma.operatingPlan.updateMany;
  let where: any;
  prisma.operatingPlan.findUnique = (async (args: any) => {
    where = args.where;
    const row: any = { id: "plan-a", clientId: "client-a", content: "PRIVATE DRAFT", internalNotes: "PRIVATE NOTES", version: 2, publishedContent: published, publishedVersion: 1, publishedAt: new Date(), acceptedAt: null, acceptedVersion: null, events: [] };
    return args.select ? Object.fromEntries(Object.keys(args.select).map((key) => [key, row[key]])) : row;
  }) as any;
  prisma.operatingPlan.updateMany = (async (args: any) => { where = args.where; return { count: 0 }; }) as any;
  const app = express(); app.use(express.json());
  app.use("/api", createOperationsRouter((req, res, next) => {
    if (req.headers["x-test-role"]) (req as AuthedRequest).atgUser = { id: "user-a", clientId: "client-a", role: req.headers["x-test-role"], isImpersonating: req.headers["x-view-only"] === "true", impersonateAllowEdits: false } as any;
    blockIfImpersonating(req, res, next);
  }));
  try {
    assert.equal((await request(app).get("/api/client/operations")).status, 401);
    assert.equal((await request(app).get("/api/admin/clients/client-b/operations").set("x-test-role", "CLIENT")).status, 403);
    const result = await request(app).get("/api/client/operations?clientId=client-b").set("x-test-role", "CLIENT");
    assert.equal(result.status, 200);
    assert.deepEqual(where, { clientId: "client-a" });
    assert.ok(!JSON.stringify(result.body).includes("PRIVATE"));
    const download = await request(app).get("/api/client/operations/download").set("x-test-role", "CLIENT");
    assert.equal(download.status, 200); assert.match(download.text, /Your AI operating guide/);
    assert.equal((await request(app).get("/api/client/operations/download?workflow=not-owned").set("x-test-role", "CLIENT")).status, 404);
    assert.equal((await request(app).post("/api/client/operations/accept").set("x-test-role", "CLIENT").send({ version: 1, confirmed: true })).status, 409);
    assert.equal((where as any).publishedVersion, 1);
    assert.equal(where.clientId, "client-a");
    assert.equal((await request(app).post("/api/client/operations/accept").set("x-test-role", "ADMIN").set("x-view-only", "true").send({ version: 1, confirmed: true })).status, 403);
    assert.equal((await request(app).put("/api/admin/clients/client-a/operations").set("x-test-role", "ADMIN").send({ version: 2, content: buildOperatingPlan(null), internalNotes: "private" })).status, 409);
  } finally { prisma.operatingPlan.findUnique = originalFind; prisma.operatingPlan.updateMany = originalUpdate; }
});

test("report delivery does not claim success without a configured mail provider", async () => {
  const saved = process.env.EMAIL_PROVIDER; process.env.EMAIL_PROVIDER = "console";
  try { assert.equal((await sendAssessmentReport("prospect@example.com", "Reviewed report")).sent, false); }
  finally { if (saved === undefined) delete process.env.EMAIL_PROVIDER; else process.env.EMAIL_PROVIDER = saved; }
  const message = reportEmailText(JSON.stringify({ summary: "Summary", keyFindings: ["Finding"], painPoints: ["Time"], recommendedWorkflows: [{ name: "Pilot", why: "Test fit" }], nextSteps: ["Review"], privateNotes: "Do not expose" }));
  assert.ok(!message.includes("Do not expose"));
  assert.match(message, /Creating an account is optional/);
});

test("guided assessment branches by priorities and clears deselected paths", () => {
  const a = [{ id: "audience", answer: "Both business and personal life" }, { id: "top_problems", answer: '["Family and sports travel","Sales follow-ups and outreach"]' }];
  const plan = assessmentQuestions(a);
  assert.ok(plan.some(q=>q.id==="first_priority"));
  assert.ok(plan.some(q => q.id === "travel_needs") && !plan.some(q => q.id === "sales_pipeline_stage"));
  assert.equal(assessmentStep(a, "top_problems").questions[0]?.id, "first_priority");
  const changed = [{ id: "audience", answer: "My personal and family life" }, { id: "top_problems", answer: '["School and sports schedules"]' }, { id: "sales_pipeline_stage", answer: "stale" }, { id: "travel_needs", answer: "stale" }];
  assert.deepEqual(applicableAnswers(changed).map(a => a.id), ["audience", "top_problems"]);
});

test("mixed audience priorities have labeled groups and support every selection", () => {
  const answers = [{ id: "audience", answer: "Both business and personal life" }];
  const q = assessmentQuestions(answers).find((q) => q.id === "top_problems")!;
  assert.deepEqual(q.optionGroups?.map((group) => group.label), ["Projects and technical support", "Business operations and growth", "AI strategy and transformation", "Personal & household"]);
  assert.ok(q.options!.length > 3);
  const selected = q.options!;
  const next = assessmentStep([...answers, { id: q.id, answer: JSON.stringify(selected) }], q.id);
  assert.equal(next.questions[0]?.id, "first_priority");
  for (const audience of ["My business", "My personal and family life"]) {
    const question = assessmentQuestions([{ id: "audience", answer: audience }]).find((q) => q.id === "top_problems")!;
    assert.equal(question.optionGroups?.length, audience === "My business" ? 3 : 1);
  }
});
