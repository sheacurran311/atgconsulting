/**
 * Session summarization tests — no DB required.
 */
import test from "node:test";
import assert from "node:assert/strict";

test("session summary template fallback produces structured output", async () => {
  const saved = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    XAI_API_KEY:   process.env.XAI_API_KEY,
    LLM_API_KEY:   process.env.LLM_API_KEY,
  };
  delete process.env.OPENAI_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.LLM_API_KEY;
  try {
    const { summarizeSession } = await import("./lib/llm");
    const summary = await summarizeSession(
      "- Agreed to start with the follow-up workflow\n- Client to share CRM access by Friday\n- Shea to prepare first draft by next session\n- Open: which email template to use",
      "guided",
      1
    );
    assert.equal(summary.source, "TEMPLATE");
    assert.ok(Array.isArray(summary.decisions));
    assert.ok(Array.isArray(summary.actionItems) && summary.actionItems.length > 0);
    assert.ok(Array.isArray(summary.openQuestions));
    assert.ok(summary.shortRecap.length > 0);
    // All action items must have owner
    for (const ai of summary.actionItems) {
      assert.ok(ai.owner === "Shea" || ai.owner === "Client", `owner must be Shea or Client, got ${ai.owner}`);
    }
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("session summary template returns empty fields for empty transcript", async () => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.LLM_API_KEY;
  const { summarizeSession } = await import("./lib/llm");
  const summary = await summarizeSession("", "discovery", undefined);
  assert.equal(summary.source, "TEMPLATE");
  assert.ok(summary.shortRecap.includes("No transcript"), "empty transcript gives informative recap");
});

test("GET /admin/clients/:id/sessions is blocked without auth", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop";
  const { default: app } = await import("./app");
  const request = (await import("supertest")).default;
  const res = await request(app).get("/api/admin/clients/fake-id/sessions");
  assert.notEqual(res.status, 200, `should not return 200 without auth (got ${res.status})`);
  assert.ok(res.status >= 400);
});
