/**
 * Smoke test: intake flow, rate-limit enforcement, and honeypot.
 *
 * This test spins up an isolated SQLite database so it never touches live data
 * or external providers. It skips automatically when the runtime DATABASE_URL
 * is a PostgreSQL URL (i.e. deployed on Replit), because the schema provider
 * must match the URL protocol.
 *
 * To run against Postgres in CI, set TEST_DATABASE_URL to a disposable
 * Postgres database and update the datasource provider to "postgresql".
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";

const runtimeUrl = process.env.DATABASE_URL ?? "";
const isPostgres  = runtimeUrl.startsWith("postgresql://") || runtimeUrl.startsWith("postgres://");

// Skip the isolated SQLite smoke test when running against a Postgres deployment.
// On Replit: DATABASE_URL is a postgres:// URL, so the schema provider and URL
// protocol must both be "postgresql". Use `pnpm db:push` to ensure the schema
// is applied, then rely on manual or integration tests for end-to-end coverage.
test(
  "fresh SQLite initializes, intake persists, and spoofed headers cannot evade limits",
  { skip: isPostgres ? "Postgres provider active — SQLite isolation test skipped. Run `pnpm db:push` to apply schema." : false },
  async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "atg-intake-"));
    process.env.DATABASE_URL = `file:${path.join(directory, "fresh.db")}`;
    process.env.EMAIL_ENABLED = "false";
    process.env.OPENAI_API_KEY = "";
    process.env.XAI_API_KEY = "";
    process.env.LLM_API_KEY = "";
    process.env.TRUSTED_PROXY_CIDRS = "";
    const { initializeDatabase, prisma } = await import("./lib/db");
    const { default: app } = await import("./app");
    try {
      const anonymousAccount = await request(app).get("/api/account");
      assert.equal(anonymousAccount.status, 401);
      const forgedAccount = await request(app)
        .get("/api/account?userId=someone-else")
        .set("X-Replit-User-Id", "forged-user")
        .set("X-User-Id", "forged-user");
      assert.equal(forgedAccount.status, 401);

      await initializeDatabase();
      assert.equal(await prisma.intakeSubmission.count(), 0);

      const input = {
        name: "Migration Test", email: "migration@example.com", role: "Owner",
        industry: "Consulting", bizSize: "solo", areas: ["sales"], aiComfort: 1,
        tools: ["none"], timeSinks: ["email"], hoursLost: 10,
        preferredHelp: "not_sure", honeypot: "",
      };

      const result = await request(app).post("/api/intake").send(input);
      assert.equal(result.status, 200);
      assert.equal(result.body.ok, true);
      assert.ok(result.body.intakeId, "intakeId should be returned");

      const record = await prisma.intakeSubmission.findFirstOrThrow();
      assert.equal(record.email, input.email);
      assert.equal(record.emailSent, false);

      // Re-initialization must not reset a populated database
      await initializeDatabase();
      assert.equal(await prisma.intakeSubmission.count(), 1);
      await prisma.$disconnect();
      await prisma.$connect();
      assert.equal(await prisma.intakeSubmission.count(), 1);

      // Validation: missing fields
      assert.equal((await request(app).post("/api/intake").send({})).status, 422);

      // Honeypot: bot submission silently accepted but not stored
      const bot = await request(app).post("/api/intake").send({ ...input, honeypot: "bot" });
      assert.deepEqual(bot.body, { ok: true });
      assert.equal(await prisma.intakeSubmission.count(), 1);

      // Rate limit: exhaust remaining budget then confirm 429
      for (let n = 0; n < 2; n++) {
        assert.equal((await request(app).post("/api/intake").send({})).status, 422);
      }
      for (let n = 1; n <= 3; n++) {
        const spoof = await request(app)
          .post("/api/intake")
          .set("X-Forwarded-For", `192.0.2.${n}`)
          .set("X-Real-IP", `198.51.100.${n}`)
          .send(input);
        assert.equal(spoof.status, 429);
      }
      assert.equal(await prisma.intakeSubmission.count(), 1);

      // Malformed JSON
      const malformed = await request(app)
        .post("/api/intake")
        .set("Content-Type", "application/json")
        .send("{");
      assert.equal(malformed.status, 400);
    } finally {
      await prisma.$disconnect();
      await rm(directory, { recursive: true, force: true });
    }
  },
);
