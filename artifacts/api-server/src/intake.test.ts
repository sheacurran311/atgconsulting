import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";

test("fresh SQLite initializes, intake persists, and spoofed headers cannot evade limits", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "atg-intake-"));
  // This isolated test process never uses live data or external providers.
  process.env.DATABASE_URL = `file:${path.join(directory, "fresh.db")}`;
  process.env.EMAIL_ENABLED = "false";
  process.env.OPENAI_API_KEY = "";
  process.env.XAI_API_KEY = "";
  process.env.LLM_API_KEY = "";
  process.env.TRUSTED_PROXY_CIDRS = "";
  const { initializeDatabase, prisma } = await import("./lib/db");
  const { default: app } = await import("./app");
  try {
    // The target file did not exist. This is the same initialization that
    // index.ts awaits before opening its listening socket.
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
    assert.equal(result.body.response.type, "fallback");
    assert.ok(result.body.response.workflows.length);
    const record = await prisma.intakeSubmission.findFirstOrThrow();
    assert.equal(record.email, input.email);
    assert.deepEqual(JSON.parse(record.llmResponse!), result.body.response);
    assert.equal(record.emailSent, false);

    // Running initialization again must not reset a populated database.
    await initializeDatabase();
    assert.equal(await prisma.intakeSubmission.count(), 1);
    await prisma.$disconnect();
    await prisma.$connect();
    assert.equal(await prisma.intakeSubmission.count(), 1);

    assert.equal((await request(app).post("/api/intake").send({})).status, 422);
    const bot = await request(app).post("/api/intake").send({ ...input, honeypot: "bot" });
    assert.deepEqual(bot.body, { ok: true });
    assert.equal(await prisma.intakeSubmission.count(), 1);
    for (let n = 0; n < 2; n++) {
      assert.equal((await request(app).post("/api/intake").send({})).status, 422);
    }
    // Five calls consumed the socket peer's budget. Rotating both forwarded
    // headers must still return 429 and must not create more submissions.
    for (let n = 1; n <= 3; n++) {
      const spoof = await request(app).post("/api/intake")
        .set("X-Forwarded-For", `192.0.2.${n}`)
        .set("X-Real-IP", `198.51.100.${n}`)
        .send(input);
      assert.equal(spoof.status, 429);
    }
    assert.equal(await prisma.intakeSubmission.count(), 1);
    const malformed = await request(app).post("/api/intake")
      .set("Content-Type", "application/json").send("{");
    assert.equal(malformed.status, 400);
  } finally {
    await prisma.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});
