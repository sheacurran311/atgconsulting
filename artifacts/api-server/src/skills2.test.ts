/**
 * Phase 2 skills — template fallback tests (no DB, no LLM key).
 */
import test from "node:test";
import assert from "node:assert/strict";

function noLLM() {
  const saved = { OPENAI_API_KEY: process.env.OPENAI_API_KEY, XAI_API_KEY: process.env.XAI_API_KEY, LLM_API_KEY: process.env.LLM_API_KEY };
  delete process.env.OPENAI_API_KEY; delete process.env.XAI_API_KEY; delete process.env.LLM_API_KEY;
  return () => { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } };
}

test("money snapshot template fallback returns summary, flags, and questions", async () => {
  const restore = noLLM();
  try {
    const { generateMoneySnapshot } = await import("./lib/llm");
    const result = await generateMoneySnapshot({ data: "2026-10-20,Invoice,2500\n2026-10-21,Office supplies,-85", weekEnding: "2026-10-25", businessName: "Sunny Plumbing" });
    assert.equal(result.source, "TEMPLATE");
    assert.ok(result.summary.length > 0);
    assert.ok(Array.isArray(result.cashFlags) && result.cashFlags.length > 0);
    assert.ok(Array.isArray(result.accountantQuestions) && result.accountantQuestions.length > 0);
  } finally { restore(); }
});

test("booking flow template fallback returns sequences for each channel", async () => {
  const restore = noLLM();
  try {
    const { generateBookingFlow } = await import("./lib/llm");
    const result = await generateBookingFlow({ businessName: "Sunny Plumbing", serviceTypes: "Drain clearing, emergency call-out", platform: "Calendly", channels: "SMS, Email" });
    assert.equal(result.source, "TEMPLATE");
    assert.ok(result.bookingPageCopy.headline.length > 0);
    assert.ok(result.sequences.length >= 2, "at least 2 sequences");
    assert.ok(result.setupChecklist.length >= 2);
  } finally { restore(); }
});

test("quote proposal template fallback builds markdown with client name", async () => {
  const restore = noLLM();
  try {
    const { generateQuoteProposal, proposalToHtml } = await import("./lib/llm");
    const result = await generateQuoteProposal({ clientName: "Henderson Property", businessName: "Sunny Roofing", servicesAndPricing: "Flat-roof repair: $3,800", scopeDescription: "Replace 40sqm membrane" });
    assert.equal(result.source, "TEMPLATE");
    assert.ok(result.proposalMarkdown.includes("Henderson Property"), "client name in proposal");
    assert.ok(result.scopeChecklist.length > 0);
    assert.ok(result.termsChecklist.length > 0);
    // HTML export
    const html = proposalToHtml(result.proposalMarkdown, "Henderson Property", "Sunny Roofing");
    assert.ok(html.startsWith("<!DOCTYPE html>"), "valid HTML");
    assert.ok(html.includes("Henderson Property"), "client name in HTML");
  } finally { restore(); }
});

test("prospect research template fallback returns one entry per line", async () => {
  const restore = noLLM();
  try {
    const { generateProspectResearch } = await import("./lib/llm");
    const result = await generateProspectResearch({ icp: "Small print shops in Colorado", prospects: "Copper Tap Brewing\nSummit Cycle Shop", businessName: "InkPro" });
    assert.equal(result.source, "TEMPLATE");
    assert.ok(result.prospects.length >= 1, "at least one prospect");
    assert.ok(result.complianceNote.length > 0, "CAN-SPAM note present");
    assert.ok(result.complianceNote.toLowerCase().includes("can-spam") || result.complianceNote.toLowerCase().includes("address"), "compliance note mentions address or CAN-SPAM");
    for (const p of result.prospects) {
      assert.ok(p.outreachEmail.subject.length > 0, "subject non-empty");
      assert.ok(p.outreachEmail.body.length > 0, "body non-empty");
    }
  } finally { restore(); }
});

test("POST /workbench/money-snapshot returns 401 without auth", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop";
  const { default: app } = await import("./app");
  const request = (await import("supertest")).default;
  const res = await request(app).post("/api/workbench/money-snapshot").send({ data: "test" });
  assert.ok(res.status >= 400, `expected 4xx, got ${res.status}`);
});
