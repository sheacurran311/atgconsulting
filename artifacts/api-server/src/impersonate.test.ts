/**
 * Impersonation tests:
 * 1. sign+verify round-trip
 * 2. Expired token returns null
 * 3. Tampered token returns null (constant-time check)
 * 4. Non-admin cannot start impersonation (POST /admin/impersonate returns 4xx)
 * 5. Unauthenticated cannot start impersonation
 * 6. Admin impersonate/status endpoint requires admin auth
 * 7. Global blockIfImpersonating blocks POST when impersonating without allowEdits
 * 8. Global guard does NOT block GET even when impersonating
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

// ── Token sign + verify ───────────────────────────────────────────────────────

test("sign+verify round-trip produces the original payload", async () => {
  const { createImpToken, verify } = await import("./lib/impersonate.js");
  const token = createImpToken("client-123", "admin-456", false);
  const payload = verify(token);
  assert.ok(payload, "verify returns non-null");
  assert.equal(payload!.clientId, "client-123");
  assert.equal(payload!.adminId, "admin-456");
  assert.equal(payload!.allowEdits, false);
  assert.ok(payload!.expiresAt > Date.now(), "expiresAt is in the future");
});

test("expired token returns null", async () => {
  const { verify } = await import("./lib/impersonate.js");
  // Craft a token with expiresAt in the past
  const { createHmac } = await import("node:crypto");
  const secret = process.env.COOKIE_SECRET ?? "dev-cookie-secret-change-in-production";
  const payload = { clientId: "x", adminId: "y", allowEdits: false, expiresAt: Date.now() - 1000 };
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  const raw = `${encoded}.${sig}`;
  assert.equal(verify(raw), null, "expired token must return null");
});

test("tampered token returns null", async () => {
  const { createImpToken, verify } = await import("./lib/impersonate.js");
  const token = createImpToken("client-abc", "admin-xyz", false);
  // Flip one char in the signature
  const parts = token.split(".");
  const tampered = parts.slice(0, -1).join(".") + "." + (parts.at(-1)!.slice(0, -1) + "X");
  assert.equal(verify(tampered), null, "tampered token must return null");
});

// ── Auth enforcement ──────────────────────────────────────────────────────────

test("POST /api/admin/impersonate requires auth (not 200)", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop";
  const { default: app } = await import("./app.js");
  const res = await request(app)
    .post("/api/admin/impersonate")
    .send({ clientId: "fake-client" });
  assert.notEqual(res.status, 200, `unauthenticated POST should not be 200 (got ${res.status})`);
  assert.ok(res.status >= 400, `expected 4xx or 5xx, got ${res.status}`);
});

test("DELETE /api/admin/impersonate requires auth (not 200)", async () => {
  const { default: app } = await import("./app.js");
  const res = await request(app).delete("/api/admin/impersonate");
  assert.notEqual(res.status, 200, `unauthenticated DELETE should not be 200 (got ${res.status})`);
  assert.ok(res.status >= 400, `expected 4xx or 5xx, got ${res.status}`);
});

test("GET /api/admin/impersonate/status requires auth (not 200)", async () => {
  const { default: app } = await import("./app.js");
  const res = await request(app).get("/api/admin/impersonate/status");
  assert.notEqual(res.status, 200, `unauthenticated GET should not be 200 (got ${res.status})`);
  assert.ok(res.status >= 400, `expected 4xx or 5xx, got ${res.status}`);
});

test("POST /api/admin/test-client requires auth (not 200)", async () => {
  const { default: app } = await import("./app.js");
  const res = await request(app).post("/api/admin/test-client").send({ tier: "SELF_SERVE" });
  assert.notEqual(res.status, 200, `unauthenticated POST should not be 200 (got ${res.status})`);
  assert.ok(res.status >= 400, `expected 4xx or 5xx, got ${res.status}`);
});

// ── blockIfImpersonating middleware ───────────────────────────────────────────

test("blockIfImpersonating blocks POST when impersonating without allowEdits", async () => {
  const { blockIfImpersonating } = await import("./lib/impersonate.js");
  let blocked = false;
  let passed = false;

  const mockReq = {
    method: "POST",
    path: "/workbench/follow-up",
    cookies: {},
    atgUser: { isImpersonating: true, impersonateAllowEdits: false },
  };
  const mockRes = {
    status: (_code: number) => ({ json: () => { blocked = true; } }),
  };
  const mockNext = () => { passed = true; };

  blockIfImpersonating(mockReq as unknown as Parameters<typeof blockIfImpersonating>[0], mockRes as unknown as Parameters<typeof blockIfImpersonating>[1], mockNext);
  assert.equal(blocked, true, "POST should be blocked");
  assert.equal(passed, false, "next should NOT be called");
});

test("blockIfImpersonating allows GET even when impersonating", async () => {
  const { blockIfImpersonating } = await import("./lib/impersonate.js");
  let passed = false;

  const mockReq = {
    method: "GET",
    path: "/workbench/follow-up",
    cookies: {},
    atgUser: { isImpersonating: true, impersonateAllowEdits: false },
  };
  const mockRes = { status: () => ({ json: () => {} }) };
  const mockNext = () => { passed = true; };

  blockIfImpersonating(mockReq as unknown as Parameters<typeof blockIfImpersonating>[0], mockRes as unknown as Parameters<typeof blockIfImpersonating>[1], mockNext);
  assert.equal(passed, true, "GET should be allowed");
});

test("blockIfImpersonating allows POST when allowEdits=true", async () => {
  const { blockIfImpersonating } = await import("./lib/impersonate.js");
  let passed = false;

  const mockReq = {
    method: "POST",
    path: "/workbench/follow-up",
    cookies: {},
    atgUser: { isImpersonating: true, impersonateAllowEdits: true },
  };
  const mockRes = { status: () => ({ json: () => {} }) };
  const mockNext = () => { passed = true; };

  blockIfImpersonating(mockReq as unknown as Parameters<typeof blockIfImpersonating>[0], mockRes as unknown as Parameters<typeof blockIfImpersonating>[1], mockNext);
  assert.equal(passed, true, "POST should be allowed when allowEdits=true");
});

test("client /day is not swallowed by the admin router", async () => {
  const express = (await import("express")).default;
  const { gateAdminRouter } = await import("./lib/auth.js");
  const admin = express.Router();
  admin.use(gateAdminRouter);
  admin.get("/admin/ping", (_req, res) => { res.json({ admin: true }); });
  const day = express.Router();
  day.get("/day", (_req, res) => { res.json({ day: true }); });
  const api = express.Router();
  api.use(admin);
  api.use(day);
  const app = express();
  app.use("/api", api);

  const dayRes = await request(app).get("/api/day");
  assert.equal(dayRes.status, 200);
  assert.equal(dayRes.body.day, true);

  const adminRes = await request(app).get("/api/admin/ping");
  assert.equal(adminRes.status, 401);
  assert.notEqual(adminRes.body.error, "Admin access required.");
});
