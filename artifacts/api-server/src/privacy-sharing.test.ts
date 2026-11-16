import test from "node:test";
import assert from "node:assert/strict";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { prisma } from "./lib/db";
import { type AuthedRequest } from "./lib/auth";
import { blockIfImpersonating } from "./lib/impersonate";
import { createSessionsRouter } from "./routes/sessions";
import { createClientRouter } from "./routes/client";
import { createKnowledgeRouter } from "./routes/knowledge";
import { createTiersRouter } from "./routes/tiers";
import { createAiAssistRouter } from "./routes/ai-assist";
import { buildClientContext } from "./lib/ai-assist";
import { articleAllowed, contentTierAllowed, parseArticleTags } from "./lib/contentAccess";
import { customerProfile, customerDocument, customerReport, customerConsultation, customerToolPlan } from "./lib/clientViews";
import { renderProposalHTML, generateProposalDraft } from "./routes/discovery";
import { generateReportDraft } from "./lib/discoveryAI";
import { getGrokClient, grokHealthCheck } from "./lib/grokClient";
import { summarizeSession, generateToolPlan, generateClientPlaybook } from "./lib/llm";

// Inject test identities, retaining the production authorization and impersonation guards.
const resolve: RequestHandler = (req, res, next) => {
  const role = req.headers["x-role"];
  if (role) (req as AuthedRequest).atgUser = { id: "user-a", role, clientId: req.headers["x-client"] ?? "client-a", isImpersonating: req.headers["x-view-only"] === "true", impersonateAllowEdits: false } as any;
  blockIfImpersonating(req, res, next);
};
function appFor(...routers: express.Router[]) { const app = express(); app.use(express.json()); routers.forEach((r) => app.use("/api", r)); return app; }
function patches() {
  const undo: Array<() => void> = [];
  return { set(target: any, key: string, value: any) { const original = target[key]; target[key] = value; undo.push(() => { target[key] = original; }); }, restore() { undo.reverse().forEach((fn) => fn()); } };
}
function env(values: Record<string, string | undefined>) {
  const old = Object.fromEntries(Object.keys(values).map((k) => [k, process.env[k]]));
  const apply = (items: typeof values) => { for (const [k, v] of Object.entries(items)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } };
  apply(values); return () => apply(old);
}

test("customer contracts omit private and newly added database fields", () => {
  const row: any = { id: "a", title: "Shared", notes: "PRIVATE", adminNotes: "PRIVATE", stripeCustomerId: "PRIVATE", stripeSubscriptionId: "PRIVATE", storageKey: "PRIVATE", approvedById: "PRIVATE", user: { email: "PRIVATE" }, unexpectedFutureColumn: "PRIVATE" };
  for (const serialize of [customerProfile, customerDocument, customerReport, customerToolPlan]) assert.ok(!JSON.stringify(serialize(row)).includes("PRIVATE"));
  // Consultation notes are explicitly shared; SessionRecord.adminNotes are never shared.
  assert.ok(!JSON.stringify(customerConsultation({ ...row, notes: "Shared call notes" })).includes("PRIVATE"));
});

test("session draft, generation and publication enforce ownership, consent and saved versions", async () => {
  const mock = patches(); const restoreEnv = env({ AI_ASSIST_ENABLED: "false", XAI_API_KEY: "fake-disabled-key" });
  let row: any = { id: "session-a", clientId: "client-a", sessionDate: new Date(), sessionType: "other", sessionNumber: null, recordingUrl: "https://example.com/recording", consentGiven: false, transcript: "Speaker A:\nFirst decision\n\nSpeaker B:\nNext steps", adminNotes: "PRIVATE NOTES", summaryJson: null, summarySource: null, shareRecap: true, recapText: "Previously reviewed recap", createdAt: new Date(), updatedAt: new Date("2026-11-15T10:00:00.000Z"), packageCounted: false };
  let writes = 0; let race = false;
  mock.set(prisma.client, "findUnique", async () => ({ tier: "GUIDED" }));
  mock.set(prisma.sessionRecord, "findFirst", async ({ where }: any) => where.id === row.id && where.clientId === row.clientId ? { ...row } : null);
  mock.set(prisma.sessionRecord, "findUnique", async () => ({ ...row }));
  mock.set(prisma.sessionRecord, "create", async ({ data }: any) => { assert.equal(data.transcript, "First line\n\nSecond line"); return { ...row, ...data }; });
  mock.set(prisma.sessionRecord, "findMany", async ({ where }: any) => where.clientId === row.clientId && row.shareRecap ? [{ ...row }] : []);
  mock.set(prisma.sessionRecord, "updateMany", async ({ where, data }: any) => {
    if (race) { race = false; row.updatedAt = new Date(row.updatedAt.getTime() + 1); return { count: 0 }; }
    if (where.clientId !== row.clientId || where.updatedAt.getTime() !== row.updatedAt.getTime()) return { count: 0 };
    writes++; row = { ...row, ...data }; return { count: 1 };
  });
  const app = appFor(createSessionsRouter(resolve));
  const path = "/api/admin/clients/client-a/sessions/session-a";
  const call = (verb: "post" | "put" | "patch", suffix: string, body: any) => request(app)[verb](path + suffix).set("x-role", "ADMIN").send(body);
  try {
    const created = await request(app).post("/api/admin/clients/client-a/sessions").set("x-role", "ADMIN").send({ sessionDate: "2026-11-15", sessionType: "other", transcript: "First line\r\n\r\nSecond line" });
    assert.equal(created.status, 201);
    assert.equal((await request(app).get(path)).status, 401);
    assert.equal((await request(app).get(path).set("x-role", "CLIENT")).status, 403);
    assert.equal((await request(app).get(path.replace("client-a", "client-b")).set("x-role", "ADMIN")).status, 404);
    assert.equal((await request(app).patch(path).set("x-role", "ADMIN").set("x-view-only", "true").send({ expectedUpdatedAt: row.updatedAt, consentGiven: true })).status, 403);
    assert.equal((await call("post", "/summarize", { expectedUpdatedAt: row.updatedAt })).status, 422);
    assert.equal(writes, 0);
    assert.equal((await call("patch", "", { shareRecap: true, recapText: "bypass", expectedUpdatedAt: row.updatedAt })).status, 422);
    assert.equal((await call("patch", "", { consentGiven: true })).status, 422);
    assert.equal((await call("patch", "", { consentGiven: true, expectedUpdatedAt: row.updatedAt })).status, 200);
    const source = row.transcript;
    const generated = await call("post", "/summarize", { expectedUpdatedAt: row.updatedAt });
    assert.equal(generated.status, 200); assert.equal(generated.body.summary.source, "TEMPLATE");
    assert.equal(row.recapText, "Previously reviewed recap"); assert.equal(row.transcript, source);
    const stale = row.updatedAt.toISOString();
    assert.equal((await call("put", "/recap-draft", { expectedUpdatedAt: stale, recapText: "Reviewed new recap" })).status, 200);
    assert.equal(row.recapText, "Previously reviewed recap");
    assert.equal((await call("post", "/recap/publish", { expectedUpdatedAt: stale })).status, 409);
    assert.equal((await call("post", "/recap/publish", { expectedUpdatedAt: row.updatedAt })).status, 200);
    assert.equal(row.recapText, "Reviewed new recap");
    const visible = await request(app).get("/api/client/sessions?clientId=client-b").set("x-role", "CLIENT");
    assert.equal(visible.status, 200); assert.equal(visible.body[0].recapText, "Reviewed new recap");
    for (const field of ["transcript", "adminNotes", "summaryJson", "consentGiven", "clientId"]) assert.ok(!(field in visible.body[0]), field);
    assert.deepEqual((await request(app).get("/api/client/sessions").set("x-role", "CLIENT").set("x-client", "client-b")).body, []);
    race = true;
    assert.equal((await call("post", "/summarize", { expectedUpdatedAt: row.updatedAt })).status, 409);
    assert.equal(row.recapText, "Reviewed new recap");
    assert.equal((await call("patch", "", { expectedUpdatedAt: row.updatedAt, shareRecap: false, consentGiven: false })).status, 200);
    assert.equal((await call("post", "/recap/publish", { expectedUpdatedAt: row.updatedAt })).status, 422);
    assert.equal((await call("patch", "", { expectedUpdatedAt: row.updatedAt, transcript: "Line one\r\n\r\nLine two" })).status, 200);
    assert.equal(row.transcript, "Line one\n\nLine two");
    const uploaded = await request(app).post(path + "/transcript").set("x-role", "ADMIN").set("x-session-version", row.updatedAt.toISOString()).set("Content-Type", "text/plain").send("Uploaded speaker:\n\nNew line");
    assert.equal(uploaded.status, 200); assert.equal(row.transcript, "Uploaded speaker:\n\nNew line");
    row.transcript = "x".repeat(20_001); row.consentGiven = true;
    const partial = await call("post", "/summarize", { expectedUpdatedAt: row.updatedAt });
    assert.equal(partial.status, 200); assert.match(partial.body.warning, /20,000/);
    assert.equal(JSON.parse(row.summaryJson).sourceWarning, partial.body.warning);
    assert.equal(row.recapText, "Reviewed new recap");
  } finally { mock.restore(); restoreEnv(); }
});

test("locked modules reveal metadata only and agree with detail and completion access", async () => {
  const mock = patches(); const restoreEnv = env({ ADMIN_TEST_MODE: "true" }); let tier = "NONE";
  const module = { id: "module", slug: "paid", title: "Preview", description: "Preview description", minTier: "SELF_SERVE", status: "PUBLISHED", body: "PAID BODY", videoUrl: "https://example.com/paid-video", order: 1 };
  mock.set(prisma.client, "findUnique", async () => ({ tier }));
  mock.set(prisma.module, "findMany", async () => [module]); mock.set(prisma.module, "findUnique", async () => module);
  mock.set(prisma.moduleProgress, "findMany", async () => []); mock.set(prisma.moduleProgress, "upsert", async () => ({}));
  const app = appFor(createClientRouter(resolve));
  try {
    assert.equal((await request(app).get("/api/modules")).status, 401);
    const free = await request(app).get("/api/modules").set("x-role", "CLIENT");
    assert.equal(free.body[0].title, "Preview"); assert.equal(free.body[0].locked, true);
    assert.ok(!JSON.stringify(free.body).includes("PAID BODY")); assert.ok(!("videoUrl" in free.body[0]));
    assert.equal((await request(app).get("/api/modules/paid").set("x-role", "CLIENT")).status, 403);
    assert.equal((await request(app).post("/api/modules/paid/complete").set("x-role", "CLIENT")).status, 403);
    for (tier of ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"]) {
      const allowed = await request(app).get("/api/modules").set("x-role", "CLIENT"); assert.equal(allowed.body[0].body, "PAID BODY");
      assert.equal((await request(app).get("/api/modules/paid").set("x-role", "CLIENT")).status, 200);
      assert.equal((await request(app).post("/api/modules/paid/complete").set("x-role", "CLIENT")).status, 200);
    }
    tier = "NONE"; assert.equal((await request(app).get("/api/modules/paid").set("x-role", "ADMIN")).status, 200);
    assert.equal(contentTierAllowed("GUIDED", "TYPO", true), false);
  } finally { mock.restore(); restoreEnv(); }
});

test("knowledge fallback, direct links, platform guides and coach preserve tier eligibility", async () => {
  const mock = patches(); const restoreEnv = env({ ADMIN_TEST_MODE: "false" }); let tier = "NONE";
  const articles = [
    { id: "free", slug: "chatgpt-getting-started", title: "Free article", body: "Free text", sortOrder: 1, tags: JSON.stringify({ verticals: ["other-industry"], tiers: ["NONE"] }) },
    { id: "paid", slug: "claude-getting-started", title: "PAID TITLE", body: "PAID BODY", sortOrder: 2, tags: JSON.stringify({ tiers: ["SELF_SERVE"] }) },
    { id: "bad", slug: "bad", title: "INVALID TITLE", body: "INVALID BODY", tags: "{bad" },
  ];
  mock.set(prisma.client, "findUnique", async ({ where }: any) => { assert.equal(where.id, "client-a"); return { tier, industry: "retail", areas: "[]", user: { name: "Customer A" } }; });
  mock.set(prisma.discoveryIntake, "findFirst", async () => null);
  mock.set(prisma.knowledgeArticle, "findMany", async () => articles);
  mock.set(prisma.knowledgeArticle, "findFirst", async ({ where }: any) => articles.find((a) => a.slug === where.slug));
  mock.set(prisma.toolPlan, "findFirst", async ({ where }: any) => { assert.equal(where.status, "approved"); assert.equal(where.clientId, "client-a"); return { toolsJson: "[]" }; });
  const app = appFor(createKnowledgeRouter(resolve));
  try {
    for (const path of ["/api/knowledge", "/api/resources/platform-guides"]) {
      assert.equal((await request(app).get(path)).status, 401);
      const result = await request(app).get(path + "?clientId=client-b").set("x-role", "CLIENT");
      assert.equal(result.status, 200); assert.equal(result.body.length, 1); assert.ok(!JSON.stringify(result.body).includes("PAID"));
    }
    assert.equal((await request(app).get("/api/knowledge/claude-getting-started").set("x-role", "CLIENT")).status, 403);
    assert.equal((await request(app).get("/api/knowledge/bad").set("x-role", "CLIENT")).status, 403);
    assert.ok(!JSON.stringify(await buildClientContext("client-a")).includes("PAID"));
    tier = "WHITE_GLOVE";
    assert.equal((await request(app).get("/api/knowledge/claude-getting-started").set("x-role", "CLIENT")).status, 200);
    assert.ok(articleAllowed(parseArticleTags(JSON.stringify({ tiers: ["SELF_SERVE"] })), tier));
    assert.equal(articleAllowed(parseArticleTags("not json"), tier), false);
  } finally { mock.restore(); restoreEnv(); }
});

test("approved recommendations stay visible while generation and refresh return private draft metadata", async () => {
  const mock = patches(); const restoreEnv = env({ AI_ASSIST_ENABLED: "true", XAI_API_KEY: undefined }); const queries: any[] = []; const created: any[] = [];
  mock.set(prisma.client, "findUnique", async () => ({ tier: "GUIDED", industry: "retail", areas: "[]", user: { name: "A" } }));
  mock.set(prisma.discoveryIntake, "findFirst", async () => ({ id: "intake-a", answers: "[]" }));
  mock.set(prisma.tool, "findMany", async () => []);
  mock.set(prisma.toolPlan, "findFirst", async (args: any) => { queries.push(args); return args.where.status === "approved" ? { id: "approved-a", status: "approved", toolsJson: '[{"name":"Approved tool","why":"Reviewed","costNote":"Free"}]', stepsJson: "[]", adminNotes: "PRIVATE NOTES" } : null; });
  mock.set(prisma.toolPlan, "create", async ({ data }: any) => { created.push(data); return { id: "draft-a", ...data }; });
  mock.set(prisma.aIAssistUsage, "findUnique", async () => null); mock.set(prisma.aIAssistUsage, "upsert", async () => ({}));
  mock.set(prisma, "$transaction", async (items: any[]) => Promise.all(items));
  mock.set(prisma.plan, "create", async () => { throw new Error("Refresh must not create a published legacy snapshot"); });
  const app = appFor(createKnowledgeRouter(resolve), createTiersRouter(resolve), createAiAssistRouter(resolve));
  try {
    const plan = await request(app).get("/api/tool-plan?clientId=client-b").set("x-role", "CLIENT");
    assert.equal(plan.status, 200); assert.ok(!JSON.stringify(plan.body).includes("PRIVATE"));
    const tools = await request(app).get("/api/resources/tools").set("x-role", "CLIENT");
    assert.equal(tools.body.planTools[0].name, "Approved tool");
    assert.equal((await request(app).post("/api/tool-plan/generate").set("x-role", "CLIENT").send({})).body.reviewRequired, true);
    const refreshed = await request(app).post("/api/ai-assist/report-refresh").set("x-role", "CLIENT").send({});
    assert.equal(refreshed.status, 200); assert.equal(refreshed.body.reviewRequired, true);
    assert.ok(!("snapshot" in refreshed.body)); assert.ok(!("toolsJson" in refreshed.body));
    assert.equal(created.length, 2); created.forEach((data) => { assert.equal(data.clientId, "client-a"); assert.equal(data.status, "draft"); assert.equal(data.approvedAt, null); });
    assert.equal((await request(app).get("/api/tool-plan").set("x-role", "CLIENT")).body.id, "approved-a");
    queries.forEach(({ where }) => { assert.equal(where.clientId, "client-a"); assert.ok(["approved", "draft"].includes(where.status)); });
  } finally { mock.restore(); restoreEnv(); }
});

test("proposal HTML escapes customer, operator and model text in every section", () => {
  const attack = '<img src=x onerror="alert(1)"><script>alert(2)</script>&\'"';
  const html = renderProposalHTML({ intake: { contactName: attack, contactEmail: attack }, proposal: { execSummary: attack, understanding: attack, scope: attack, howWeConnect: attack, acceptanceClause: attack, approvedAt: null }, companyName: attack, investment: { tier: attack, price: attack, care: attack, notes: attack }, milestones: [{ label: attack, description: attack }], authority: { decisionAuthority: "none", approverName: attack, approverRole: attack, approverEmail: attack } });
  assert.ok(!html.includes('<img')); assert.ok(!html.includes('<script')); assert.ok(!html.includes(attack));
  assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')); assert.ok(html.includes('&amp;&#39;&quot;'));
});

test("global AI off switch prevents provider construction even with a configured key", async () => {
  const restoreEnv = env({ AI_ASSIST_ENABLED: "false", XAI_API_KEY: "fake-disabled-key" }); const mock = patches();
  mock.set(prisma.tool, "findMany", async () => []);
  try {
    assert.equal(getGrokClient(), null);
    const health = await grokHealthCheck(); assert.equal(health.ok, false);
    assert.equal((await summarizeSession("Decision: review first", "guided")).source, "TEMPLATE");
    assert.equal((await generateToolPlan({ industry: "retail", areas: [], aiComfort: 1, timeSinks: [] })).source, "TEMPLATE");
    assert.equal((await generateProposalDraft([], {}, "A")).tokensUsed, 0);
    assert.equal((await generateReportDraft([], "A", "Example company", [])).tokensUsed, 0);
    assert.equal((await generateClientPlaybook({ clientName: "A", role: "Owner", industry: "retail", bizSize: "small", tier: "GUIDED", vertical: "retail", areas: [], aiComfort: 1, hoursLost: null, helpStyle: "guided", timeSinks: [] })).source, "TEMPLATE");
  } finally { mock.restore(); restoreEnv(); }
});

test("dashboard and document responses remain customer-scoped and omit operator context", async () => {
  const mock = patches(); const queries: any[] = [];
  const client = { id: "client-a", userId: "user-a", tier: "NONE", company: "Customer A", notes: "PRIVATE OPERATOR NOTES", stripeCustomerId: "PRIVATE STRIPE", stripeSubscriptionId: "PRIVATE SUBSCRIPTION", user: { email: "PRIVATE USER" }, guidedSessionsTotal: null, guidedSessionsUsed: 0 };
  mock.set(prisma.client, "findUnique", async ({ where }: any) => { assert.equal(where.id, "client-a"); return client; });
  for (const [model, method, result] of [
    [prisma.workflowItem, "findMany", []], [prisma.consultation, "findFirst", { id: "call-a", title: "Shared call", notes: "Shared call notes", adminNotes: "PRIVATE" }],
    [prisma.report, "findFirst", { id: "report-a", contentMarkdown: "Published report", adminNotes: "PRIVATE", status: "PUBLISHED" }],
    [prisma.plan, "findFirst", null], [prisma.document, "count", 0], [prisma.discoveryIntake, "findMany", []], [prisma.toolPlan, "findFirst", null], [prisma.outputItem, "count", 0],
    [prisma.actionItem, "count", 0], [prisma.clientMessage, "findFirst", null], [prisma.clientMessage, "count", 0], [prisma.supportTicket, "findMany", []],
    [prisma.dfyApplication, "findUnique", null], [prisma.clientAccessLog, "count", 0], [prisma.clientWorkflowSettings, "findMany", []],
    [prisma.document, "findMany", [{ id: "doc-a", title: "Shared document", minTier: "NONE", visibleToClient: true, storageKey: "PRIVATE STORAGE", adminNotes: "PRIVATE" }]],
  ] as const) mock.set(model, method, async (args: any) => { queries.push(args); return result; });
  const app = appFor(createClientRouter(resolve));
  try {
    assert.equal((await request(app).get("/api/client/dashboard")).status, 401);
    const dashboard = await request(app).get("/api/client/dashboard?clientId=client-b").set("x-role", "CLIENT");
    assert.equal(dashboard.status, 200); assert.equal(dashboard.body.client.company, "Customer A"); assert.ok(!JSON.stringify(dashboard.body).includes("PRIVATE"));
    const docs = await request(app).get("/api/client/documents?clientId=client-b").set("x-role", "CLIENT");
    assert.equal(docs.status, 200); assert.equal(docs.body[0].title, "Shared document"); assert.ok(!JSON.stringify(docs.body).includes("PRIVATE"));
    queries.forEach(({ where }) => { if (where.OR) assert.deepEqual(where.OR, [{ clientId: "client-a" }, { clientId: null }]); else assert.equal(where.clientId ?? where.consultation?.clientId, "client-a"); });
    // Projections do not mutate the stored operator record.
    assert.equal(client.notes, "PRIVATE OPERATOR NOTES");
  } finally { mock.restore(); }
});
