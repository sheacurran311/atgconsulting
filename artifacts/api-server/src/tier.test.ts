/**
 * Unit tests for tier recommendation logic and tool plan fallback.
 * Neither test touches the database.
 */
import test from "node:test";
import assert from "node:assert/strict";

// ── Tier recommendation ───────────────────────────────────────────────────────

test("tier recommendation: respects explicit user preference", async () => {
  const { recommendTier } = await import("./lib/llm");
  assert.equal(recommendTier({ helpStyle: "done_for_you", aiComfort: 3, hoursLost: 5  }), "done_for_you", "done_for_you preference always wins");
  assert.equal(recommendTier({ helpStyle: "guided",       aiComfort: 2, hoursLost: 8  }), "guided",       "guided preference always wins");
  assert.equal(recommendTier({ helpStyle: "self_serve",   aiComfort: 1, hoursLost: 20 }), "self_serve",   "self_serve preference wins even with low comfort");
});

test("tier recommendation: not_sure + low comfort + high hours → done_for_you", async () => {
  const { recommendTier } = await import("./lib/llm");
  assert.equal(recommendTier({ helpStyle: "not_sure", aiComfort: 0, hoursLost: 10 }), "done_for_you");
  assert.equal(recommendTier({ helpStyle: "not_sure", aiComfort: 1, hoursLost: 20 }), "done_for_you");
  // Low hours, even with low comfort, should not force done_for_you
  assert.notEqual(recommendTier({ helpStyle: "not_sure", aiComfort: 1, hoursLost: 9 }), "done_for_you");
});

test("tier recommendation: not_sure + high comfort → self_serve", async () => {
  const { recommendTier } = await import("./lib/llm");
  assert.equal(recommendTier({ helpStyle: "not_sure", aiComfort: 3, hoursLost: 5  }), "self_serve");
  assert.equal(recommendTier({ helpStyle: "not_sure", aiComfort: 4, hoursLost: 40 }), "self_serve");
});

test("tier recommendation: not_sure + mid comfort → guided", async () => {
  const { recommendTier } = await import("./lib/llm");
  assert.equal(recommendTier({ helpStyle: "not_sure", aiComfort: 2, hoursLost: 8 }), "guided");
});

// ── Tool plan fallback ────────────────────────────────────────────────────────

test("tool plan template returns tools and steps without inventing prices", async () => {
  const saved = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    XAI_API_KEY:   process.env.XAI_API_KEY,
    LLM_API_KEY:   process.env.LLM_API_KEY,
  };
  delete process.env.OPENAI_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.LLM_API_KEY;
  try {
    const { generateToolPlan } = await import("./lib/llm");
    const plan = await generateToolPlan({
      industry: "Plumbing",
      areas: ["sales", "executive_assistant"],
      aiComfort: 1,
      toolBudget: "<$50/mo",
      currentSoftware: "Gmail, Google Sheets",
      weeklyVolumes: "10-50/wk",
      timeSinks: ["email", "followups"],
    });
    assert.equal(plan.source, "TEMPLATE");
    assert.ok(Array.isArray(plan.tools) && plan.tools.length > 0, "tools array is non-empty");
    assert.ok(Array.isArray(plan.steps) && plan.steps.length > 0, "steps array is non-empty");
    // Must not contain invented dollar amounts in cost notes
    for (const tool of plan.tools) {
      assert.ok(tool.name.length > 0, "tool has a name");
      assert.ok(tool.why.length > 0, "tool has a reason");
      assert.ok(tool.costNote.length > 0, "tool has a cost note");
      // cost note must NOT contain bare dollar amounts like "$25" (we say check current pricing)
      assert.doesNotMatch(tool.costNote, /^\$\d+$/, `cost note '${tool.costNote}' must not be a bare price`);
    }
    for (const step of plan.steps) {
      assert.ok(step.order >= 1, "step has order >= 1");
      assert.ok(step.title.length > 0, "step has title");
      assert.ok(step.detail.length > 0, "step has detail");
    }
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
