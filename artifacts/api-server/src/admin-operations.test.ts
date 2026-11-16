import test from "node:test";
import assert from "node:assert/strict";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { prisma } from "./lib/db";
import { type AuthedRequest } from "./lib/auth";
import { blockIfImpersonating } from "./lib/impersonate";
import { createContentRouter } from "./routes/content";
import { createCatalogRouter } from "./routes/catalog";
import { createAdminTodayRouter } from "./routes/adminToday";
import { createAutomationLibraryRouter } from "./routes/automation-library";
import { automationBots, nativePlatforms, recommendAutomationBots } from "./lib/automationLibrary";
import { deliveryGuide } from "./lib/masterPlaybook";
import { createClientDeploymentRouter, deploymentBodyParser } from "./routes/client-deployment";
import { DeploymentPlan, blankDeploymentEntry, buildClientDeployment, validateDeploymentScope } from "./lib/clientDeployment";
import { parseMarketplace, rankMarketplaceCandidates, discoverNativeMarketplaces } from "./lib/nativeMarketplaces";
const resolve: RequestHandler = (req, res, next) => {
  if (req.headers["x-role"]) (req as AuthedRequest).atgUser = { id: "user-a", clientId: "client-a", email: "operator@example.com", role: req.headers["x-role"], isImpersonating: req.headers["x-view"] === "true", impersonateAllowEdits: false } as any;
  blockIfImpersonating(req, res, next);
};
function appFor(...routers: express.Router[]) { const app = express(); app.use("/api/admin/clients/:id/playbook/:pbId/deployment", deploymentBodyParser); app.use(express.json()); routers.forEach((r) => app.use("/api", r)); return app; }
function mockDb() {
  const undo: Array<() => void> = [];
  const set = (object: any, key: string, value: any) => { const old = object[key]; object[key] = value; undo.push(() => { object[key] = old; }); };
  // Every database delegate is isolated; overrides below provide the relevant domain state.
  for (const key of Object.keys(prisma)) {
    const model = (prisma as any)[key];
    if (!model || typeof model !== "object" || typeof model.findMany !== "function") continue;
    for (const name of ["findMany", "groupBy"]) if (typeof model[name] === "function") set(model, name, async () => []);
    for (const name of ["findFirst", "findUnique"]) if (typeof model[name] === "function") set(model, name, async () => null);
    if (typeof model.count === "function") set(model, "count", async () => 0);
    if (typeof model.create === "function") set(model, "create", async ({ data }: any) => ({ id: "fixture", ...data }));
  }
  return { set, restore() { undo.reverse().forEach((fn) => fn()); } };
}

function marketplacePage(rows: unknown[]) {
  const flight = `1:${JSON.stringify({ data: { items: rows } })}\n`;
  const mid = Math.floor(flight.length / 2);
  return [flight.slice(0, mid), flight.slice(mid)].map((chunk) => `<script>self.__next_f.push(${JSON.stringify([1, chunk])})</script>`).join("");
}
test("wider native catalogs preserve every exposed entry, real metrics and surfaces without evaluating scripts", async () => {
  const html = marketplacePage(Array.from({ length: 105 }, (_, i) => ({ _id: `${i === 104 ? "wf" : "directoryPlugin"}.${i}`, title: `Sales plugin ${i}`, slug: `sales-${i}`, subheading: "Sales research", installs: i ? i * 10 : null, worksWith: [{ label: i === 104 ? "Claude Code" : "Claude" }], anthropicVerified: true })));
  const claude = parseMarketplace("claude", html);
  assert.equal(claude.length, 105, "not capped at 30 or the catalog harvest's per-run limit");
  assert.equal(rankMarketplaceCandidates(claude, "sales", "claude", "rating")[0]!.installs, 1040);
  assert.equal(rankMarketplaceCandidates(claude, "sales", "claude", "rating").at(-1)!.installs, null);
  assert.ok(claude.every((r) => r.rating === null));
  assert.match(claude[0]!.url, /^https:\/\/claude.com\/marketplace\/plugins\/sales-/);
  assert.deepEqual(claude[104]!.surfaces, ["Claude Code"]);
  const grokHtml = marketplacePage([{ id: "sales-bot", name: "Sales bot", description: "Sales research", addHref: "/bot/test", installCount: 0 }]);
  assert.equal(parseMarketplace("grok_bot", grokHtml)[0]!.installs, null, "all-zero placeholder fields are unknown");
  assert.equal(rankMarketplaceCandidates([...claude, ...parseMarketplace("grok_bot", grokHtml)], "research", "grok_bot", "installs").length, 1);
  const calls: string[] = [];
  const snapshots = await discoverNativeMarketplaces((async (url: string) => { calls.push(url); return new Response(url.includes("claude") ? html : grokHtml); }) as typeof fetch);
  assert.equal(calls.length, 2); assert.ok(calls.every((s) => s === "https://claude.com/marketplace/plugins" || s === "https://x.ai/bot/marketplace"));
  assert.equal(snapshots.find((s) => s.provider === "chatgpt")!.status, "account_required");
  assert.equal(snapshots.find((s) => s.provider === "claude")!.count, 105);
  const failures = await discoverNativeMarketplaces((async () => { throw new Error("unavailable"); }) as typeof fetch);
  assert.equal(failures.filter((s) => s.status === "unavailable").length, 2);
});

test("client implementation lists honor provider preference and support up to 20 workflows plus components", () => {
  const seed = buildClientDeployment(JSON.stringify({ aiPlatforms: ["claude"], top_problems: "Sales follow-ups" }));
  assert.equal(seed.providerPreference, "claude"); assert.ok(seed.entries.length);
  assert.ok(seed.entries.every((e) => e.provider === "claude" && e.status === "candidate" && !e.nativeConfirmed));
  const entry = { ...blankDeploymentEntry(), id: "outside-thirty", name: "Client-specific sales routine", provider: "claude" as const, url: "https://claude.com/marketplace/plugins/sales", reason: "Fits the agreed sales pilot", apps: "Approved CRM", steps: "Configure and test native plugin", acceptanceTest: "Redacted lead yields an unsent draft", pause: "Pause native task", evidence: "Checked native app and scheduled execution in customer account", verifiedAt: "2026-11-16", nativeConfirmed: true, status: "ready" as const };
  assert.equal(DeploymentPlan.safeParse({ providerPreference: "claude", providerReason: "Client prefers Claude and its native CRM connector is available", entries: [entry] }).success, true);
  assert.equal(DeploymentPlan.safeParse({ providerPreference: "chatgpt", providerReason: "Client requested ChatGPT", entries: [entry] }).success, false);
  assert.equal(DeploymentPlan.safeParse({ providerPreference: "claude", providerReason: "Confirmed", entries: [{ ...entry, nativeConfirmed: false }] }).success, false);
  const plan = { providerPreference: "any" as const, providerReason: "", entries: Array.from({ length: 20 }, (_, i) => ({ ...blankDeploymentEntry(), id: `workflow-${i}`, name: `Workflow ${i}` })) };
  assert.equal(validateDeploymentScope(plan, "WHITE_GLOVE"), null);
  plan.entries.push({ ...blankDeploymentEntry(), id: "plugin", name: "Supporting plugin", kind: "component" });
  assert.equal(validateDeploymentScope(plan, "WHITE_GLOVE"), null);
  plan.entries.push({ ...blankDeploymentEntry(), id: "workflow-21", name: "Extra workflow" });
  assert.match(validateDeploymentScope(plan, "WHITE_GLOVE")!, /up to 20/);
});

test("per-client marketplace discovery and implementation saves enforce admin, ownership, final versions and optimistic concurrency", async () => {
  const db = mockDb(); let catalogCalls = 0; let stored = { id: "pb-a", clientId: "client-a", status: "draft", updatedAt: new Date("2026-11-16T08:00:00.000Z"), content: JSON.stringify({ clientSummary: "Preserve this", privateField: "untouched" }) };
  db.set(prisma.client, "findUnique", async ({ where }: any) => where.id === "missing" ? null : { id: where.id, tier: "WHITE_GLOVE" });
  db.set(prisma.discoveryIntake, "findFirst", async ({ where }: any) => { assert.equal(where.clientId, "client-a"); return { answers: JSON.stringify({ aiPlatforms: ["claude"], top_problems: "Sales research" }) }; });
  db.set(prisma.clientPlaybook, "findFirst", async ({ where }: any) => where.clientId === stored.clientId && where.id === stored.id ? stored : null);
  db.set(prisma.clientPlaybook, "updateMany", async ({ where, data }: any) => { assert.equal(where.status, "draft"); stored = { ...stored, ...data, updatedAt: new Date("2026-11-16T09:00:00.000Z") }; return { count: 1 }; });
  const app = appFor(createClientDeploymentRouter(resolve, async () => { catalogCalls++; return []; }));
  try {
    assert.equal((await request(app).get("/api/admin/clients/client-a/deployment-options")).status, 401);
    assert.equal((await request(app).get("/api/admin/clients/client-a/deployment-options").set("x-role", "CLIENT")).status, 403);
    assert.equal(catalogCalls, 0);
    const found = await request(app).get("/api/admin/clients/client-a/deployment-options?provider=claude").set("x-role", "ADMIN");
    assert.equal(found.status, 200); assert.equal(found.body.suggested.providerPreference, "claude");
    assert.equal((await request(app).get("/api/admin/clients/missing/deployment-options").set("x-role", "ADMIN")).status, 404);
    const deployment = { providerPreference: "any", providerReason: "Compare native support", entries: Array.from({ length: 20 }, (_, i) => ({ ...blankDeploymentEntry(), id: `exact-custom-${i}`, name: i === 0 ? "Outside the 30" : `Workflow ${i}`, prompt: "Detailed native setup instructions. ".repeat(180) })) };
    const body = { expectedUpdatedAt: stored.updatedAt.toISOString(), deployment };
    assert.ok(JSON.stringify(body).length > 100_000, "a real 20-workflow plan exceeds the old default parser limit");
    const path = "/api/admin/clients/client-a/playbook/pb-a/deployment";
    assert.equal((await request(app).patch(path.replace("client-a", "client-b")).set("x-role", "ADMIN").send(body)).status, 404);
    assert.equal((await request(app).patch(path).set("x-role", "ADMIN").send(body)).status, 200);
    assert.equal(JSON.parse(stored.content).privateField, "untouched"); assert.equal(JSON.parse(stored.content).deployment.entries[0].name, "Outside the 30");
    assert.equal((await request(app).patch(path).set("x-role", "ADMIN").send(body)).status, 409, "stale notes/version must not be overwritten");
    stored.status = "final";
    assert.equal((await request(app).patch(path).set("x-role", "ADMIN").send({ ...body, expectedUpdatedAt: stored.updatedAt.toISOString() })).status, 409);
  } finally { db.restore(); }
});

test("30 distinct native workflows have recurring setup and the master guide covers all plans", () => {
  assert.equal(automationBots.length, 30); assert.equal(new Set(automationBots.map((b) => b.id)).size, 30);
  assert.deepEqual(nativePlatforms.map((p) => p.id), ["chatgpt", "grok_bot", "claude"]);
  for (const row of recommendAutomationBots(null)) {
    assert.ok(row.cadence && row.sources.length && row.example && row.output && row.rule);
    assert.equal(row.recommended, false);
    for (const p of nativePlatforms) { assert.match(row.setupPrompts[p.id]!, /Native-only requirement/); assert.match(row.setupPrompts[p.id]!, /redacted test/); }
  }
  assert.deepEqual(deliveryGuide.plans.map((p) => p.key), ["SELF_SERVE", "GUIDED", "WHITE_GLOVE"]);
  deliveryGuide.plans.forEach((p) => { assert.ok(p.steps.length >= 6); p.steps.forEach((s) => assert.ok(s.action && s.done && s.href.startsWith("/admin/"))); });
});

test("native bot recommendations use current and legacy intake priorities without inventing a fit", () => {
  const family = recommendAutomationBots(JSON.stringify([{ id: "audience", answer: "My personal and family life" }, { id: "top_problems", answer: '["School and sports schedules"]' }, { id: "ai_tools_today", answer: '["Grok"]' }, { id: "data_boundaries", answer: '["No access to financial accounts"]' }]));
  assert.equal(family[0]!.id, "sports-change-digest"); assert.deepEqual(family[0]!.preferredPlatforms, ["grok_bot"]);
  assert.equal(family.find((r) => r.id === "bill-deadline-digest")!.recommended, false);
  assert.ok(family.find((r) => r.id === "bill-deadline-digest")!.blockedReasons.length);
  const sales = recommendAutomationBots(JSON.stringify({ areas: ["sales"], aiPlatforms: ["chatgpt"] }));
  assert.ok(sales.slice(0, 6).some((r) => r.id === "lead-follow-up-queue" && r.recommended));
  assert.equal(sales.find((r) => r.id === "family-weekly-brief")!.recommended, false);
  assert.ok(recommendAutomationBots("malformed").every((r) => !r.recommended));
  const microsoft = recommendAutomationBots(JSON.stringify({ top_problems: "Sales follow-ups", core_system: "Outlook / Microsoft 365" }));
  assert.match(microsoft.find((r) => r.id === "lead-follow-up-queue")!.instructions, /Microsoft Outlook/);
  assert.ok(microsoft.find((r) => r.id === "lead-follow-up-queue")!.sources.every((s) => !s.startsWith("Google")));
});

test("native library API is restricted to admin/DIY and customer intake cannot be switched with a query", async () => {
  const db = mockDb(); let tier = "SELF_SERVE"; let queriedClient = "";
  db.set(prisma.client, "findUnique", async ({ where }: any) => where.id === "missing" ? null : { id: where.id, tier });
  db.set(prisma.discoveryIntake, "findFirst", async ({ where }: any) => { queriedClient = where.clientId; return { id: "intake-a", createdAt: new Date(), answers: '[{"id":"top_problems","answer":"Sales follow-ups and outreach"}]' }; });
  const app = appFor(createAutomationLibraryRouter(resolve));
  try {
    assert.equal((await request(app).get("/api/automation-library")).status, 401);
    assert.equal((await request(app).get("/api/admin/automation-library").set("x-role", "CLIENT")).status, 403);
    for (tier of ["NONE", "GUIDED", "WHITE_GLOVE"]) {
      const denied = await request(app).get("/api/automation-library").set("x-role", "CLIENT"); assert.equal(denied.status, 403); assert.ok(!JSON.stringify(denied.body).includes("setupPrompts"));
    }
    assert.equal((await request(app).get("/api/automation-library").set("x-role", "ADMIN").set("x-view", "true")).status, 403);
    tier = "SELF_SERVE";
    const diy = await request(app).get("/api/automation-library?clientId=client-b").set("x-role", "CLIENT");
    assert.equal(diy.status, 200); assert.equal(diy.body.bots.length, 30); assert.equal(queriedClient, "client-a"); assert.match(diy.headers["cache-control"], /no-store/);
    assert.ok(!("answers" in diy.body.personalization));
    const admin = await request(app).get("/api/admin/automation-library?clientId=client-b").set("x-role", "ADMIN"); assert.equal(admin.status, 200); assert.equal(queriedClient, "client-b");
    assert.deepEqual(admin.body.bots[0].instructions, diy.body.bots[0].instructions);
    assert.equal((await request(app).get("/api/admin/automation-library?clientId=missing").set("x-role", "ADMIN")).status, 404);
  } finally { db.restore(); }
});

test("approve and publish is one guarded, retry-safe action and respects future schedules", async () => {
  const db = mockDb(); let writes = 0; let race = false;
  let row: any = { id: "post-a", topic: "pilot", title: "Review me", slug: "pilot", status: "draft", body: "Reviewed body", publishAt: null, updatedAt: new Date("2026-11-16T10:00:00Z") };
  db.set(prisma.content, "findUnique", async () => ({ ...row }));
  db.set(prisma.content, "updateMany", async ({ where, data }: any) => { assert.equal(where.id, row.id); assert.equal(where.updatedAt.getTime(), row.updatedAt.getTime()); if (race) return { count: 0 }; row = { ...row, ...data }; writes++; return { count: 1 }; });
  const app = appFor(createContentRouter(resolve)); const url = "/api/admin/content/post-a/approve-publish";
  try {
    assert.equal((await request(app).post(url)).status, 401); assert.equal((await request(app).post(url).set("x-role", "CLIENT")).status, 403);
    assert.equal((await request(app).post(url).set("x-role", "ADMIN").set("x-view", "true")).status, 403);
    const published = await request(app).post(url).set("x-role", "ADMIN"); assert.equal(published.status, 200); assert.equal(published.body.status, "published"); assert.equal(writes, 1);
    assert.equal((await request(app).post(url).set("x-role", "ADMIN")).status, 200); assert.equal(writes, 1);
    assert.equal((await request(app).post("/api/admin/content/post-a/approve").set("x-role", "ADMIN")).body.status, "published");
    row.status = "draft"; row.publishAt = new Date(Date.now() + 86_400_000);
    assert.equal((await request(app).post(url).set("x-role", "ADMIN")).status, 409); assert.equal(writes, 1);
    row.publishAt = null; race = true; assert.equal((await request(app).post(url).set("x-role", "ADMIN")).status, 409); assert.equal(row.status, "draft");
    race = false; row.status = "queued";
    const savedAi = process.env.AI_ASSIST_ENABLED; process.env.AI_ASSIST_ENABLED = "false";
    try {
      const generated = await request(app).post("/api/admin/content/post-a/generate").set("x-role", "ADMIN");
      assert.equal(generated.status, 200); assert.equal(generated.body.id, "post-a"); assert.equal(generated.body.status, "draft"); assert.ok(generated.body.body.length);
      const generatedWrites = writes; assert.equal((await request(app).post("/api/admin/content/post-a/generate").set("x-role", "ADMIN")).status, 200); assert.equal(writes, generatedWrites);
    } finally { if (savedAi === undefined) delete process.env.AI_ASSIST_ENABLED; else process.env.AI_ASSIST_ENABLED = savedAi; }
  } finally { db.restore(); }
});

test("Today opens exact records and reflects work completed on its actual source screen", async () => {
  const db = mockDb(); const now = new Date();
  let post: any = { id: "post-a", title: "Blog pilot", slug: "blog-pilot", body: "Reviewed blog body", status: "draft", source: "manual", publishAt: null, updatedAt: now, createdAt: now };
  let item: any = { id: "item-a", name: "A real candidate", sourceType: "atg_template", reviewStatus: "pending", verified: false, enabled: true, updatedAt: now, createdAt: now };
  let intake: any = { id: "intake-a", contactName: "Customer A", status: "new", createdAt: now, updatedAt: now };
  db.set(prisma.content, "findMany", async ({ where }: any) => where.status?.in?.includes(post.status) ? [post] : []);
  db.set(prisma.content, "findUnique", async () => ({ ...post })); db.set(prisma.content, "updateMany", async ({ data }: any) => { post = { ...post, ...data }; return { count: 1 }; });
  db.set(prisma.catalogItem, "findMany", async ({ where }: any) => (typeof where.reviewStatus === "string" ? where.reviewStatus === item.reviewStatus : where.reviewStatus?.in?.includes(item.reviewStatus)) ? [item] : []);
  db.set(prisma.catalogItem, "findUnique", async () => ({ ...item })); db.set(prisma.catalogItem, "update", async ({ data }: any) => { item = { ...item, ...data }; return { ...item }; });
  db.set(prisma.discoveryIntake, "findMany", async ({ where }: any) => (where.status === intake.status || where.status?.in?.includes(intake.status)) ? [intake] : []);
  db.set(prisma.clientAccessLog, "findMany", async () => [{ id: "access-a", clientId: "client-a", accountSystem: "Test system", accessType: "delegated", grantedDate: now, client: { user: { name: "Customer A" } } }]);
  const app = appFor(createContentRouter(resolve), createCatalogRouter(resolve), createAdminTodayRouter(resolve));
  const today = () => request(app).get("/api/admin/today").set("x-role", "ADMIN");
  try {
    assert.equal((await request(app).get("/api/admin/today")).status, 401);
    const before = await today(); assert.equal(before.status, 200);
    assert.equal(before.body.counts.total, 4);
    assert.equal(before.body.tasks.contentDrafts[0].url, "/admin/content?item=post-a");
    assert.equal(before.body.tasks.catalogQueue[0].url, "/admin/catalog?item=item-a"); assert.equal(before.body.tasks.intakeReviews[0].url, "/admin/discovery?intake=intake-a");
    assert.equal((await request(app).post("/api/admin/content/post-a/approve-publish").set("x-role", "ADMIN")).status, 200);
    assert.equal((await request(app).post("/api/admin/catalog/item-a/verify").set("x-role", "ADMIN")).body.verified, true);
    intake.status = "reviewed"; // A completed review on another screen.
    const after = await today(); assert.equal(after.status, 200); assert.deepEqual(after.body.tasks.contentDrafts, []); assert.deepEqual(after.body.tasks.catalogQueue, []); assert.deepEqual(after.body.tasks.intakeReviews, []); assert.equal(after.body.counts.total, 1);
    assert.ok(after.body.completedTasks.some((r: any) => r.id === "post-a" && /Published/.test(r.meta)));
    assert.ok(after.body.completedTasks.some((r: any) => r.id === "item-a" && /verified/.test(r.meta)));
    assert.ok(after.body.completedTasks.some((r: any) => r.id === "intake-a"));
    const rejected = await request(app).post("/api/admin/catalog/item-a/reject").set("x-role", "ADMIN").send({ note: "Does not fit" });
    assert.equal(rejected.status, 200); assert.equal(rejected.body.verified, false); assert.equal(rejected.body.enabled, false);
    const reverified = await request(app).post("/api/admin/catalog/item-a/verify").set("x-role", "ADMIN"); assert.equal(reverified.body.enabled, true);
  } finally { db.restore(); }
});
