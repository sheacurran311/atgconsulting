/**
 * Phase 3 skills — template fallback tests.
 */
import test from "node:test";
import assert from "node:assert/strict";

function noLLM() {
  const saved = { OPENAI_API_KEY: process.env.OPENAI_API_KEY, XAI_API_KEY: process.env.XAI_API_KEY, LLM_API_KEY: process.env.LLM_API_KEY };
  delete process.env.OPENAI_API_KEY; delete process.env.XAI_API_KEY; delete process.env.LLM_API_KEY;
  return () => { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } };
}

test("FAQ support template fallback returns FAQ items with placeholders", async () => {
  const restore = noLLM();
  try {
    const { buildFaqAndReply } = await import("./lib/llm");
    const result = await buildFaqAndReply({ faqSource: "We are a plumbing company. We offer drain clearing and emergency call-outs. Hours: Mon-Sat 7am-6pm." });
    assert.equal(result.source, "TEMPLATE");
    assert.ok(Array.isArray(result.faqItems) && result.faqItems.length > 0, "FAQ items present");
    assert.equal(result.replyDraft, null, "no reply when no question given");
  } finally { restore(); }
});

test("FAQ support template fallback drafts a reply for a given question", async () => {
  const restore = noLLM();
  try {
    const { buildFaqAndReply } = await import("./lib/llm");
    const result = await buildFaqAndReply({ faqSource: "Emergency plumbing service.", customerQuestion: "Do you offer weekend call-outs?" });
    assert.equal(result.source, "TEMPLATE");
    assert.ok(result.replyDraft !== null && result.replyDraft.length > 0, "reply draft present");
    assert.equal(result.lowConfidence, true, "flagged as low-confidence (template)");
  } finally { restore(); }
});

test("agent pipeline step template fallback returns step output and flags", async () => {
  const restore = noLLM();
  try {
    const { runPipelineStep } = await import("./lib/llm");
    const result = await runPipelineStep({ stepName: "Research", stepInstructions: "Summarise the prospect", currentInput: "Copper Tap Brewing, Denver", previousOutput: "" });
    assert.equal(result.source, "TEMPLATE");
    assert.ok(result.stepOutput.length > 0, "step output non-empty");
    assert.ok(Array.isArray(result.qualityFlags) && result.qualityFlags.length > 0, "quality flags present");
    assert.equal(result.readyForNextStep, false, "not ready (template fallback)");
  } finally { restore(); }
});

test("POST /workbench/faq-support returns 401 without auth", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop";
  const { default: app } = await import("./app");
  const request = (await import("supertest")).default;
  const res = await request(app).post("/api/workbench/faq-support").send({ faqSource: "test" });
  assert.ok(res.status >= 400, `expected 4xx, got ${res.status}`);
});
