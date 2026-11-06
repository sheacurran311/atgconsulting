/**
 * AUDIT-3 code gaps: intake parsing, no invented hours, signup stays NONE,
 * Guided packages are 3 or 5, session counter, Muse seed, DFY cap, cron secret.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { parseIntakeAnswers, statedHours } from "./lib/intakeAnswers";
import {
  canAcceptDfy,
  guidedPackageSize,
  guidedUsedAfterComplete,
  tierToApplyOnVerifiedSignup,
} from "./lib/guidedPackage";
import { cronAuthorized, presentedCronSecret } from "./lib/cronAuth";
import { ASSISTANT_SEEDS } from "./lib/assistantCatalog";

test("parseIntakeAnswers reads the question array", () => {
  const raw = JSON.stringify([
    { id: "business_type", question: "Business", answer: "Plumbing" },
    { id: "top_problems", question: "Problems", answer: "Chasing invoices" },
    { id: "decision_authority", question: "Authority", answer: "Partial" },
    { id: "ai_tools_today", question: "Tools", answer: "Gmail" },
    { id: "crm_tool", question: "CRM", answer: "None" },
  ]);
  const parsed = parseIntakeAnswers(raw);
  assert.equal(parsed.industry, "Plumbing");
  assert.equal(parsed.topProblems, "Chasing invoices");
  assert.equal(parsed.decisionAuthority, "Partial");
  assert.equal(parsed.tools, "Gmail, None");
  assert.equal(parsed.hoursLost, null);
});

test("parseIntakeAnswers still reads a flat object", () => {
  const parsed = parseIntakeAnswers(JSON.stringify({ industry: "Dental", role: "Owner", hoursLost: "6" }));
  assert.equal(parsed.industry, "Dental");
  assert.equal(parsed.role, "Owner");
  assert.equal(parsed.hoursLost, 6);
});

test("statedHours ignores prose and zero", () => {
  assert.equal(statedHours("about 10 hours"), null);
  assert.equal(statedHours("0"), null);
  assert.equal(statedHours("10"), 10);
});

test("verified signup does not apply a paid tier", () => {
  assert.equal(tierToApplyOnVerifiedSignup("SELF_SERVE"), "NONE");
  assert.equal(tierToApplyOnVerifiedSignup("GUIDED"), "NONE");
  assert.equal(tierToApplyOnVerifiedSignup("WHITE_GLOVE"), "NONE");
  assert.equal(tierToApplyOnVerifiedSignup(null), "NONE");
});

test("guided package size is 3 or 5, never 4", () => {
  assert.equal(guidedPackageSize({ metadataSessions: "5" }), 5);
  assert.equal(guidedPackageSize({ metadataSessions: "3" }), 3);
  assert.equal(guidedPackageSize({ metadataSessions: "4" }), 3);
  assert.equal(guidedPackageSize({ priceId: "price_5", priceGuided5: "price_5", priceGuided: "price_3" }), 5);
  assert.equal(guidedPackageSize({ priceId: "price_3", priceGuided: "price_3", priceGuided5: "price_5" }), 3);
  assert.equal(guidedPackageSize({ requestedSessions: 5 }), 5);
  assert.equal(guidedPackageSize({}), 3);
});

test("guided session counter increments once and caps", () => {
  const first = guidedUsedAfterComplete({
    tier: "GUIDED", total: 3, used: 0, counts: true, alreadyCounted: false, sameDayAlreadyCounted: false,
  });
  assert.deepEqual(first, { used: 1, markCounted: true });
  const again = guidedUsedAfterComplete({
    tier: "GUIDED", total: 3, used: 1, counts: true, alreadyCounted: true, sameDayAlreadyCounted: false,
  });
  assert.deepEqual(again, { used: 1, markCounted: true });
  const sameDay = guidedUsedAfterComplete({
    tier: "GUIDED", total: 3, used: 1, counts: true, alreadyCounted: false, sameDayAlreadyCounted: true,
  });
  assert.deepEqual(sameDay, { used: 1, markCounted: true });
  const capped = guidedUsedAfterComplete({
    tier: "GUIDED", total: 3, used: 3, counts: true, alreadyCounted: false, sameDayAlreadyCounted: false,
  });
  assert.equal(capped.used, 3);
  const otherTier = guidedUsedAfterComplete({
    tier: "SELF_SERVE", total: 3, used: 0, counts: true, alreadyCounted: false, sameDayAlreadyCounted: false,
  });
  assert.deepEqual(otherTier, { used: 0, markCounted: false });
});

test("DFY accept stops when the monthly cap is full", () => {
  assert.equal(canAcceptDfy({ cap: 1, acceptedThisMonth: 1, alreadyAccepted: false }), false);
  assert.equal(canAcceptDfy({ cap: 1, acceptedThisMonth: 0, alreadyAccepted: false }), true);
  assert.equal(canAcceptDfy({ cap: 1, acceptedThisMonth: 1, alreadyAccepted: true }), true);
});

test("cron accepts the bearer token or the header, and refuses a missing secret", () => {
  assert.equal(presentedCronSecret({ authorization: "Bearer night-key" }), "night-key");
  assert.equal(presentedCronSecret({ "x-cron-secret": "night-key" }), "night-key");
  assert.equal(cronAuthorized("night-key", "night-key"), true);
  assert.equal(cronAuthorized(undefined, "night-key"), false);
  assert.equal(cronAuthorized("night-key", null), false);
  assert.equal(cronAuthorized("night-key", "other"), false);
});

test("Muse is an unverified model seed without a feature list or a price", () => {
  const muse = ASSISTANT_SEEDS.find((seed) => seed.slug === "model-muse");
  assert.ok(muse);
  assert.equal(muse.kind, "model");
  assert.equal(muse.name, "Muse");
  assert.equal(muse.maker, "Meta");
  assert.equal(muse.sourceUrl, "https://muse.ai/");
  assert.equal(muse.tierFit, "all");
  assert.doesNotMatch(muse.goodFor, /email|travel|browser|\$/i);
  assert.equal("verified" in muse, false);
});

test("template fallbacks do not invent hours or a dollar return", async () => {
  const saved = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    XAI_API_KEY: process.env.XAI_API_KEY,
    LLM_API_KEY: process.env.LLM_API_KEY,
  };
  delete process.env.OPENAI_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.LLM_API_KEY;
  try {
    const { generateBothOutputs, generateClientPlaybook } = await import("./lib/llm");
    const report = await generateBothOutputs({
      name: "Ada",
      email: "ada@example.com",
      role: "Owner",
      industry: "Plumbing",
      bizSize: "solo",
      areas: ["sales"],
      aiComfort: 1,
      tools: [],
      timeSinks: [],
      hoursLost: null,
      helpStyle: "not_sure",
    });
    const playbook = await generateClientPlaybook({
      clientName: "Ada",
      role: "Owner",
      industry: "Plumbing",
      bizSize: "solo",
      areas: ["sales"],
      aiComfort: 1,
      hoursLost: null,
      helpStyle: "not_sure",
      timeSinks: [],
      tier: "GUIDED",
      vertical: "home_services",
    });
    const blob = JSON.stringify({ report, playbook });
    assert.equal(report.adminReport.opportunityAreas.every((area) => area.estimatedTimeSavedHrsPerWeek == null), true);
    assert.doesNotMatch(blob, /\$50/);
    assert.doesNotMatch(blob, /10 hours/);
    assert.doesNotMatch(blob, /k\/year/);
    assert.doesNotMatch(blob, /4–6|3–4/);
  } finally {
    if (saved.OPENAI_API_KEY) process.env.OPENAI_API_KEY = saved.OPENAI_API_KEY;
    if (saved.XAI_API_KEY) process.env.XAI_API_KEY = saved.XAI_API_KEY;
    if (saved.LLM_API_KEY) process.env.LLM_API_KEY = saved.LLM_API_KEY;
  }
});
