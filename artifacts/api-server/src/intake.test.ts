/**
 * The old sqlite isolation test is gone. The schema is PostgreSQL, the
 * IntakeSubmission model was removed, and the skipped body asserted constants
 * instead of the database. Auth on the leftover plan route is covered in
 * review48.test.ts. Intake answer parsing is covered in audit3.test.ts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

test("anonymous account and legacy plan routes do not return data", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop";
  const { default: app } = await import("./app");
  const account = await request(app).get("/api/account");
  assert.notEqual(account.status, 200);
  const forged = await request(app)
    .get("/api/account")
    .set("X-Replit-User-Id", "forged-user")
    .set("X-User-Id", "forged-user");
  assert.notEqual(forged.status, 200);
  const plan = await request(app).get("/api/plan/legacy-intake-id");
  assert.notEqual(plan.status, 200);
  assert.ok(plan.status >= 400);
});
