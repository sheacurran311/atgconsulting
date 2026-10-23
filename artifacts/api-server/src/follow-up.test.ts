/**
 * Follow-up drafts fall back to a template when no model key is set.
 * This test does not touch the database.
 */
import test from "node:test";
import assert from "node:assert/strict";

test("follow-up template uses only the caller's words", async () => {
  const saved = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    XAI_API_KEY: process.env.XAI_API_KEY,
    LLM_API_KEY: process.env.LLM_API_KEY,
  };
  delete process.env.OPENAI_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.LLM_API_KEY;
  try {
    const { generateFollowUpDraft } = await import("./lib/llm");
    const draft = await generateFollowUpDraft({
      who: "Alex Rivera",
      lastTouch: "Site visit on Tuesday",
      wantToSay: "The estimate is ready when you are.",
      senderName: "Jordan",
    });
    assert.equal(draft.source, "TEMPLATE");
    assert.equal(draft.subject, "Following up");
    assert.match(draft.body, /Alex Rivera/);
    assert.match(draft.body, /Site visit on Tuesday/);
    assert.match(draft.body, /The estimate is ready when you are\./);
    assert.match(draft.body, /Jordan/);
    assert.doesNotMatch(draft.body, /\bAI\b|ChatGPT|model/i);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
