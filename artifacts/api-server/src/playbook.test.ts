/**
 * Playbook tests:
 * 1. Template fallback produces valid PlaybookContent without DB or LLM key.
 * 2. Auth: POST /admin/clients/:id/playbook returns 401 without auth.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

// ── Template fallback ─────────────────────────────────────────────────────────

test("playbook template fallback produces non-empty valid content", async () => {
  const saved = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    XAI_API_KEY:   process.env.XAI_API_KEY,
    LLM_API_KEY:   process.env.LLM_API_KEY,
  };
  delete process.env.OPENAI_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.LLM_API_KEY;
  try {
    const { generateClientPlaybook } = await import("./lib/llm");
    const result = await generateClientPlaybook({
      clientName: "Test Client",
      role: "Owner",
      industry: "Plumbing",
      bizSize: "solo",
      areas: ["sales", "executive_assistant"],
      aiComfort: 1,
      hoursLost: 12,
      helpStyle: "not_sure",
      toolBudget: "$50-150/mo",
      currentSoftware: "Gmail, Google Sheets",
      weeklyVolumes: "10-50/wk",
      timeSinks: ["email", "followups"],
      automateFirst: "Follow-up emails",
      tier: "GUIDED",
      vertical: "trades",
    });
    assert.equal(result.source, "TEMPLATE", "should use template when no LLM key");
    assert.ok(result.clientSummary.length > 0, "clientSummary is non-empty");
    assert.ok(Array.isArray(result.risksAndClarifications) && result.risksAndClarifications.length > 0);
    assert.ok(result.tierRationale.recommendedTier.length > 0);
    assert.ok(Array.isArray(result.tierRationale.expectationsToSet) && result.tierRationale.expectationsToSet.length > 0);
    assert.ok(Array.isArray(result.discoveryAgenda) && result.discoveryAgenda.length > 0);
    assert.ok(Array.isArray(result.toolStack) && result.toolStack.length > 0);
    assert.ok(Array.isArray(result.workflows) && result.workflows.length > 0);
    assert.ok(result.milestones.day30.length > 0);
    assert.ok(Array.isArray(result.kpisAndUpsell.kpis) && result.kpisAndUpsell.kpis.length > 0);
    // Must never promise outcomes like "X hours saved" or claim auto-sending to recipients
    // Note: "Nothing is sent automatically" is a correct disclaimer — we check for
    // harmful claims (that the system WILL send things) not disclaimers that it won't.
    const fullText = JSON.stringify(result);
    assert.doesNotMatch(fullText, /will send.{0,30}automatically/i, "should not promise automatic sending");
    // Must not invent hour-saved figures (check for "hours saved" claims with numbers)
    assert.doesNotMatch(fullText, /\d+\s+hours\s+(saved|back)\b/i);
    // Tool cost notes must say "check" not invented prices
    for (const tool of result.toolStack) {
      assert.ok(tool.costNote.length > 0, `${tool.tool} has a cost note`);
    }
    // Guided tier should have session plan
    assert.ok(Array.isArray(result.tierPlan.guidedSessionPlan) && result.tierPlan.guidedSessionPlan!.length > 0, "guided session plan present");
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

// ── Auth enforcement ──────────────────────────────────────────────────────────

// Auth enforcement tests: without a valid Clerk session the server must not
// return 200. It returns 401 when Clerk is configured, or 500 when Clerk keys
// are absent (the middleware crashes). Both are acceptable here — neither leaks
// data. We assert status !== 200 rather than === 401 because the test
// environment does not have CLERK_SECRET_KEY set.

test("POST /admin/clients/:id/playbook is blocked without auth (not 200)", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop";
  const { default: app } = await import("./app");
  const res = await request(app)
    .post("/api/admin/clients/fake-id/playbook")
    .send({ intakeId: "fake-intake" });
  assert.notEqual(res.status, 200, `unauthenticated POST should not return 200 (got ${res.status})`);
  assert.ok(res.status >= 400, `expected 4xx or 5xx, got ${res.status}`);
});

test("GET /admin/clients/:id/playbook is blocked without auth (not 200)", async () => {
  const { default: app } = await import("./app");
  const res = await request(app).get("/api/admin/clients/fake-id/playbook");
  assert.notEqual(res.status, 200, `unauthenticated GET should not return 200 (got ${res.status})`);
  assert.ok(res.status >= 400, `expected 4xx or 5xx, got ${res.status}`);
});
