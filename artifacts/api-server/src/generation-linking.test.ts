import test from "node:test";
import assert from "node:assert/strict";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { prisma } from "./lib/db";
import { requireAdmin, type AuthedRequest } from "./lib/auth";
import { createAdminRouter } from "./routes/admin";
import { createPortalRouter } from "./routes/portal";
import { createImpersonateRouter } from "./routes/impersonate";
import { linkSubmittedAssessments } from "./lib/assessmentPresence";
import { ensureClientForVerifiedUser } from "./lib/clientProvision";

const resolve: RequestHandler = (req, _res, next) => {
  if (req.headers["x-role"]) (req as AuthedRequest).atgUser = { id: "user-a", clientId: "client-a", role: req.headers["x-role"], email: "owner@example.com", isImpersonating: req.headers["x-view"] === "true" } as any;
  next();
};
const gate: RequestHandler = (req, res, next) => resolve(req, res, () => requireAdmin(req, res, next));
function appFor(router: express.Router) { const app = express(); app.use(express.json()); app.use("/api", router); return app; }
function patcher() {
  const undo: Array<() => void> = [];
  return { set(target: any, method: string, fn: any) { const old = target[method]; target[method] = fn; undo.push(() => { target[method] = old; }); }, restore() { undo.reverse().forEach((f) => f()); } };
}

test("operator-assigned paid tiers activate prospects and the saved response preserves explicit lifecycle choices", async () => {
  const mock = patcher(); let before = { id: "client-a", tier: "NONE", status: "PROSPECT" }; let saved: any;
  mock.set(prisma.client, "findUnique", async () => before);
  mock.set(prisma.client, "update", async ({ data }: any) => { saved = data; return { ...before, ...data }; });
  mock.set(prisma.auditLog, "create", async () => ({}));
  const app = appFor(createAdminRouter(gate));
  try {
    const url = "/api/admin/clients/client-a";
    assert.equal((await request(app).patch(url).send({ tier: "GUIDED" })).status, 401);
    assert.equal((await request(app).patch(url).set("x-role", "CLIENT").send({ tier: "GUIDED" })).status, 403);
    const updated = await request(app).patch(url).set("x-role", "ADMIN").send({ tier: "GUIDED" });
    assert.equal(updated.status, 200); assert.equal(updated.body.tier, "GUIDED"); assert.equal(updated.body.status, "ACTIVE");
    for (const status of ["PAUSED", "CHURNED"]) { before = { ...before, status }; await request(app).patch(url).set("x-role", "ADMIN").send({ tier: "GUIDED" }); assert.ok(!("status" in saved)); }
    before = { ...before, status: "PROSPECT" };
    await request(app).patch(url).set("x-role", "ADMIN").send({ tier: "GUIDED", status: "PROSPECT" }); assert.equal(saved.status, "PROSPECT");
    await request(app).patch(url).set("x-role", "ADMIN").send({ notes: "Reviewed" }); assert.ok(!("status" in saved));
  } finally { mock.restore(); }
});

test("verified login and admin client selection attach only matching submitted unclaimed assessments", async () => {
  const mock = patcher(); let writes = 0; let lastWhere: any;
  const rows = [
    { email: "OWNER@example.com", clientId: null as string | null, submitted: true },
    { email: "owner@example.com", clientId: "someone-else", submitted: true },
    { email: "other@example.com", clientId: null as string | null, submitted: true },
    { email: "owner@example.com", clientId: null as string | null, submitted: false },
  ];
  mock.set(prisma.discoveryIntake, "updateMany", async ({ where, data }: any) => { writes++; lastWhere = where; let count = 0; for (const row of rows) if (row.email.toLowerCase() === where.contactEmail.equals && row.clientId === null && row.submitted === where.consentGiven) { row.clientId = data.clientId; count++; } return { count }; });
  mock.set(prisma.clientPlaybook, "findFirst", async () => ({ id: "already-exists" }));
  mock.set(prisma.client, "findUnique", async () => ({ id: "client-a", tier: "GUIDED", status: "ACTIVE", user: { email: "owner@example.com", name: "Owner" } }));
  mock.set(prisma.client, "create", async () => { throw new Error("Existing Guided customer must not become another prospect"); });
  mock.set(prisma.auditLog, "create", async () => ({}));
  try {
    assert.equal(await ensureClientForVerifiedUser("user-a", " OWNER@example.com ", "client-a"), "client-a");
    assert.equal(rows[0]!.clientId, "client-a"); assert.equal(rows[1]!.clientId, "someone-else"); assert.equal(rows[2]!.clientId, null); assert.equal(rows[3]!.clientId, null);
    assert.equal(lastWhere.clientId, null); assert.equal(lastWhere.consentGiven, true); assert.equal(lastWhere.contactEmail.mode, "insensitive");
    assert.equal(await linkSubmittedAssessments("client-a", "owner@example.com"), 0, "retry is idempotent");
    rows[0]!.clientId = null; const app = appFor(createImpersonateRouter(gate)); const before = writes;
    assert.equal((await request(app).post("/api/admin/impersonate").set("x-role", "CLIENT").send({ clientId: "client-a" })).status, 403); assert.equal(writes, before);
    const viewed = await request(app).post("/api/admin/impersonate").set("x-role", "ADMIN").send({ clientId: "client-a" });
    assert.equal(viewed.status, 200); assert.equal(viewed.body.clientId, "client-a"); assert.equal(rows[0]!.clientId, "client-a"); assert.ok(viewed.headers["set-cookie"]);
  } finally { mock.restore(); }
});

test("portal recognizes owned current and legacy assessments without granting a tier or accepting caller-supplied owners", async () => {
  const mock = patcher(); let current = 1; let legacy = true; let planQueries = 0;
  mock.set(prisma.client, "findUnique", async ({ where }: any) => { assert.equal(where.id, "client-a"); return { id: "client-a", tier: "GUIDED", notes: null, user: { email: "customer@example.com", name: "Selected customer" } }; });
  mock.set(prisma.discoveryIntake, "count", async ({ where }: any) => { assert.equal(where.clientId, "client-a"); assert.equal(where.consentGiven, true); return current; });
  mock.set(prisma.discoveryIntake, "findMany", async () => []);
  mock.set(prisma.plan, "findFirst", async ({ where, select }: any) => { planQueries++; assert.equal(where.clientId, "client-a"); assert.deepEqual(where.intakeId, { not: null }); assert.ok(!select.adminReport); return legacy ? { id: "legacy-plan-a", createdAt: new Date() } : null; });
  const app = appFor(createPortalRouter(resolve));
  try {
    assert.equal((await request(app).get("/api/portal/status")).status, 401);
    const call = () => request(app).get("/api/portal/status?clientId=someone-else").set("x-role", "CLIENT");
    let result = await call(); assert.equal(result.status, 200); assert.match(result.headers["cache-control"], /no-store/); assert.equal(result.body.hasIntake, true); assert.equal(result.body.assessmentSource, "discovery"); assert.equal(planQueries, 0);
    current = 0; result = await call(); assert.equal(result.body.hasIntake, true); assert.equal(result.body.assessmentSource, "legacy"); assert.equal(result.body.tier, "GUIDED");
    legacy = false; result = await call(); assert.equal(result.body.hasIntake, false); assert.equal(result.body.assessmentSource, "none");
    const viewed = await request(app).get("/api/portal/status").set("x-role", "ADMIN").set("x-view", "true");
    assert.equal(viewed.body.intakePrefill.email, "customer@example.com", "Client View must not prefill the operator email into the customer intake");
  } finally { mock.restore(); }
});

test("admin client history and explicit matching repair are guarded and report actual saved links", async () => {
  const mock = patcher(); let linked = false;
  mock.set(prisma.client, "findUnique", async ({ where }: any) => where.id === "missing" ? null : ({ id: "client-a", user: { email: "owner@example.com" }, plans: [{ intakeId: "old-intake" }] }));
  mock.set(prisma.discoveryIntake, "findMany", async ({ where }: any) => { assert.equal(where.clientId, "client-a"); return linked ? [{ id: "intake-a", status: "reviewed", contactEmail: "owner@example.com", createdAt: new Date() }] : []; });
  mock.set(prisma.discoveryIntake, "count", async () => linked ? 0 : 1);
  mock.set(prisma.discoveryIntake, "updateMany", async ({ where }: any) => { assert.equal(where.contactEmail.equals, "owner@example.com"); assert.equal(where.clientId, null); linked = true; return { count: 1 }; });
  mock.set(prisma.auditLog, "create", async () => ({}));
  const app = appFor(createAdminRouter(gate));
  try {
    const url = "/api/admin/clients/client-a";
    assert.equal((await request(app).post(url + "/link-assessments")).status, 401);
    assert.equal((await request(app).post(url + "/link-assessments").set("x-role", "CLIENT")).status, 403);
    let result = await request(app).get(url).set("x-role", "ADMIN"); assert.equal(result.body.unlinkedAssessmentCount, 1); assert.equal(result.body.hasLegacyAssessment, true); assert.deepEqual(result.body.intakes, []);
    assert.equal((await request(app).post(url + "/link-assessments").set("x-role", "ADMIN")).body.linked, 1);
    result = await request(app).get(url).set("x-role", "ADMIN"); assert.equal(result.body.intakes[0].id, "intake-a"); assert.equal(result.body.unlinkedAssessmentCount, 0);
    assert.equal((await request(app).post("/api/admin/clients/missing/link-assessments").set("x-role", "ADMIN")).status, 404);
  } finally { mock.restore(); }
});
