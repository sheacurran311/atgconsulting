import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { prisma } from "./lib/db";
import type { AuthedRequest } from "./lib/auth";
const savedAdmins = process.env.ADMIN_EMAILS;
process.env.ADMIN_EMAILS = "shea@atgconsulting.io";
const { resolveClerkUser, requireAdmin } = await import("./lib/auth");
const { createAdminRouter } = await import("./routes/admin");
if (savedAdmins === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = savedAdmins;
function patcher() {
  const undo: Array<() => void> = [];
  return { set(target: any, key: string, value: any) { const old = target[key]; target[key] = value; undo.push(() => { target[key] = old; }); }, restore() { undo.reverse().forEach((fn) => fn()); } };
}
function clerkUser(email: string, verified = true) { return { primaryEmailAddressId: "primary", emailAddresses: [{ id: "primary", emailAddress: email, verification: { status: verified ? "verified" : "unverified" } }], firstName: "Example", lastName: "Account", imageUrl: null } as any; }

test("admin authentication creates no prospect while retaining existing customer records", async () => {
  const mock = patcher(); let existing: string | null = null; let creations = 0; let links = 0;
  mock.set(prisma.authIdentity, "findUnique", async () => ({ userId: "user-a", user: { id: "user-a", client: existing ? { id: existing } : null } }));
  mock.set(prisma.user, "update", async ({ data }: any) => ({ id: "user-a", ...data }));
  mock.set(prisma.client, "findUnique", async () => existing ? { id: existing } : null);
  mock.set(prisma.client, "create", async ({ data }: any) => { creations++; assert.equal(data.tier, "NONE"); assert.equal(data.status, "PROSPECT"); return { id: "customer-a" }; });
  mock.set(prisma.discoveryIntake, "updateMany", async () => { links++; return { count: 0 }; });
  try {
    const admin = await resolveClerkUser({} as any, "clerk-admin", clerkUser("shea@atgconsulting.io"));
    assert.equal(admin?.role, "ADMIN"); assert.equal(admin?.clientId, null); assert.equal(creations, 0); assert.equal(links, 0);
    existing = "existing-admin-customer";
    const retained = await resolveClerkUser({} as any, "clerk-admin", clerkUser("shea@atgconsulting.io"));
    assert.equal(retained?.clientId, existing); assert.equal(creations, 0);
    existing = null;
    const customer = await resolveClerkUser({} as any, "clerk-customer", clerkUser("customer@example.com"));
    assert.equal(customer?.role, "CLIENT"); assert.equal(customer?.clientId, "customer-a"); assert.equal(creations, 1); assert.equal(links, 1);
    assert.equal(await resolveClerkUser({} as any, "unverified-admin", clerkUser("shea@atgconsulting.io", false)), null);
    assert.equal(creations, 1);
  } finally { mock.restore(); }
});

test("customer directory excludes admin prospect shells while preserving paid admin customers and search", async () => {
  const mock = patcher(); let query: any;
  const rows = [
    { id: "admin-shell", tier: "NONE", status: "PROSPECT", user: { role: "ADMIN", email: "shea@atgconsulting.io" } },
    { id: "customer", tier: "NONE", status: "PROSPECT", user: { role: "CLIENT", email: "customer@example.com" } },
    { id: "paid-admin", tier: "GUIDED", status: "ACTIVE", user: { role: "ADMIN", email: "other-admin@example.com" } },
  ];
  mock.set(prisma.client, "findMany", async ({ where }: any) => {
    query = where;
    // Fixture evaluator for Prisma's NOT/AND semantics; the handler supplies the filter.
    return rows.filter((r) => !(r.user.role === where.NOT?.user?.role && r.tier === where.NOT?.tier && r.status === where.NOT?.status)).filter((r) => !where.tier || r.tier === where.tier);
  });
  const app = express(); app.use("/api", createAdminRouter((req, res, next) => {
    if (req.headers["x-role"]) (req as AuthedRequest).atgUser = { role: req.headers["x-role"] } as any;
    requireAdmin(req, res, next);
  }));
  try {
    assert.equal((await request(app).get("/api/admin/clients")).status, 401);
    assert.equal((await request(app).get("/api/admin/clients").set("x-role", "CLIENT")).status, 403);
    const list = await request(app).get("/api/admin/clients?q=example").set("x-role", "ADMIN");
    assert.equal(list.status, 200); assert.deepEqual(list.body.map((r: any) => r.id), ["customer", "paid-admin"]);
    assert.ok(query.OR.some((entry: any) => entry.user?.email?.contains === "example"));
    const filtered = await request(app).get("/api/admin/clients?tier=NONE").set("x-role", "ADMIN");
    assert.deepEqual(filtered.body.map((r: any) => r.id), ["customer"]); assert.equal(query.tier, "NONE");
  } finally { mock.restore(); }
});
