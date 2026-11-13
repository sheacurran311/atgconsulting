import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { prisma } from "./lib/db";
import router from "./routes";
import { QUESTION_MAP } from "./lib/questionBank";
import { nextQuestion } from "./lib/discoveryAI";

// Exercise the real combined router: testing discovery alone misses auth
// middleware in earlier sibling routers that intercepts public requests.
test("public discovery completes and resumes without an account or AI key", async (t) => {
  const oldKey = process.env.XAI_API_KEY;
  const oldEnabled = process.env.INTAKE_ENABLED;
  const oldEmailProvider = process.env.EMAIL_PROVIDER;
  delete process.env.XAI_API_KEY;
  process.env.INTAKE_ENABLED = "true";
  process.env.EMAIL_PROVIDER = "console";
  const rows = new Map<string, any>();
  const original = { create: prisma.discoveryIntake.create, findUnique: prisma.discoveryIntake.findUnique, update: prisma.discoveryIntake.update, userFind: prisma.user.findUnique };
  prisma.discoveryIntake.create = (async ({ data }: any) => {
    const row = { id: `test-${rows.size}`, tokensUsed: 0, ...data };
    rows.set(row.id, row);
    return row;
  }) as any;
  prisma.discoveryIntake.findUnique = (async ({ where }: any) => rows.get(where.id) ?? null) as any;
  prisma.discoveryIntake.update = (async ({ where, data }: any) => {
    Object.assign(rows.get(where.id), data);
    return rows.get(where.id);
  }) as any;
  prisma.user.findUnique = (async () => null) as any;
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  try {
    await t.test("public questions and marketing chips bypass portal authentication", async () => {
      assert.equal((await request(app).get("/api/discovery/questions")).status, 200);
      assert.equal((await request(app).get("/api/catalog/chips")).status, 200);
    });
    await t.test("all private route families still reject anonymous visitors", async () => {
      for (const path of ["/client/me", "/modules", "/workbench/today", "/day", "/ai-assist/usage", "/workbench/install-code/test", "/admin/discovery"]) {
        assert.equal((await request(app).get(`/api${path}`)).status, 401, path);
      }
      assert.equal((await request(app).post("/api/workbench/inbox-triage").send({})).status, 401);
    });
    await t.test("email is validated and saved before questions", async () => {
      assert.equal((await request(app).post("/api/discovery/start").send({ contactEmail: "bad" })).status, 422);
    });
    const start = await request(app).post("/api/discovery/start").send({ contactEmail: " Prospect@Example.com " });
    assert.equal(start.status, 200);
    const sessionId = start.body.sessionId;
    assert.equal(rows.get(sessionId).contactEmail, "prospect@example.com");
    let next = await request(app).post("/api/discovery/next").send({ sessionId, answers: [] });
    assert.equal(next.status, 200);
    assert.equal(next.body.answers[0].answer, "prospect@example.com");
    assert.equal(next.body.fromFallback, true);
    let count = 0;
    while (!next.body.done && count++ < 30) {
      const q = next.body.questions[0];
      assert.ok(q);
      const answer = q.id === "decision_authority" ? "Yes, full authority" : "Test answer";
      next = await request(app).post("/api/discovery/next").send({
        sessionId, answers: [{ id: q.id, category: q.category, question: q.text, answer }],
      });
      assert.equal(next.status, 200, `question ${q.id} must not fail or exhaust the rate limit`);
    }
    assert.ok(next.body.done);
    assert.ok(count > 5);
    assert.ok(next.body.answers.some((a: any) => a.id === "top_problems"));
    const submitted = await request(app).post("/api/discovery/submit").send({ sessionId, finalAnswers: [], consentGiven: true });
    assert.equal(submitted.status, 200, "prior question requests must not consume submission quota");
    assert.equal(rows.get(sessionId).contactEmail, "prospect@example.com");
    assert.equal(rows.get(sessionId).consentGiven, true);
    const resumed = await request(app).post("/api/discovery/next").send({ sessionId, answers: [] });
    assert.equal(resumed.status, 200);
    assert.equal(resumed.body.answers.length, next.body.answers.length);
    const name = QUESTION_MAP.contact_name!;
    const edited = await request(app).post("/api/discovery/next").send({ sessionId, answers: [{ id: name.id, category: name.category, question: name.text, answer: "Corrected name" }] });
    assert.equal(edited.body.answers.find((a: any) => a.id === name.id).answer, "Corrected name");
    rows.get(sessionId).expiresAt = new Date(0);
    assert.equal((await request(app).post("/api/discovery/next").send({ sessionId, answers: [] })).status, 404);
    const extraction = await request(app).post("/api/discovery/extract").send({ text: "Some questionnaire answers" });
    assert.equal(extraction.status, 503);
    assert.match(extraction.body.error, /question-by-question/);
  } finally {
    prisma.discoveryIntake.create = original.create;
    prisma.discoveryIntake.findUnique = original.findUnique;
    prisma.discoveryIntake.update = original.update;
    prisma.user.findUnique = original.userFind;
    if (oldKey === undefined) delete process.env.XAI_API_KEY; else process.env.XAI_API_KEY = oldKey;
    if (oldEnabled === undefined) delete process.env.INTAKE_ENABLED; else process.env.INTAKE_ENABLED = oldEnabled;
    if (oldEmailProvider === undefined) delete process.env.EMAIL_PROVIDER; else process.env.EMAIL_PROVIDER = oldEmailProvider;
  }
});

test("configured AI selects questions and falls back on provider failure", async () => {
  const names = ["XAI_API_KEY", "LLM_BASE_URL", "NODE_ENV", "AI_ASSIST_ENABLED"] as const;
  const saved = names.map((name) => process.env[name]);
  let fail = false;
  let calls = 0;
  const provider = express();
  provider.use(express.json());
  provider.post("/v1/chat/completions", (_req, res) => {
    calls++;
    if (fail) { res.status(400).json({ error: { message: "test provider unavailable" } }); return; }
    res.json({ choices: [{ message: { content: JSON.stringify({ nextIds: ["top_problems"], done: false }) } }], usage: { total_tokens: 12 } });
  });
  const server = provider.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const address = server.address() as { port: number };
    process.env.XAI_API_KEY = "test-only-not-a-real-key";
    process.env.NODE_ENV = "test";
    process.env.LLM_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
    process.env.AI_ASSIST_ENABLED = "true";
    const answered = ["contact_name", "contact_email", "audience"].map((id) => ({ id, category: "contact", question: id, answer: id === "audience" ? "My business" : "Example" }));
    const selected = await nextQuestion(answered, 0);
    assert.deepEqual(selected.nextIds, ["top_problems"]);
    assert.equal(selected.tokensUsed, 12);
    assert.equal(calls, 1);
    fail = true;
    const fallback = await nextQuestion(answered, 0);
    assert.equal(fallback.fromFallback, true);
    assert.deepEqual(fallback.nextIds, ["top_problems"]);
    assert.equal(calls, 2);
  } finally {
    names.forEach((name, i) => { if (saved[i] === undefined) delete process.env[name]; else process.env[name] = saved[i]; });
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
});
