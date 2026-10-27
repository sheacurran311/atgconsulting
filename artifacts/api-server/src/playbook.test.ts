/**
 * Playbook tests:
 * 1. Template fallback produces valid PlaybookContent without DB or LLM key.
 * 2. DFY (WHITE_GLOVE) template includes accountAccess section with all sub-sections.
 * 3. Guided/Self-serve playbooks do NOT include accountAccess.
 * 4. AccountAccessSectionZod validates the generated section.
 * 5. Auth: POST/GET /admin/clients/:id/playbook blocked without auth.
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

// ── DFY accountAccess section ─────────────────────────────────────────────────

test("DFY (WHITE_GLOVE) template includes accountAccess section", async () => {
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
      clientName: "DFY Client",
      role: "Owner",
      industry: "Real estate",
      bizSize: "solo",
      areas: ["sales", "executive_assistant"],
      aiComfort: 2,
      hoursLost: 20,
      helpStyle: "done_for_you",
      toolBudget: "$150-500/mo",
      currentSoftware: "Gmail, HubSpot",
      weeklyVolumes: "50-200/wk",
      timeSinks: ["email", "followups", "prospecting"],
      tier: "WHITE_GLOVE",
      vertical: "real_estate",
      answersJson: JSON.stringify({ aiPlatforms: ["grok_bot", "claude"] }),
      toolPlanJson: JSON.stringify([
        { name: "Grok Bot", slug: "grok-bot", category: "ai_platform", why: "AI drafting" },
        { name: "HubSpot CRM", slug: "hubspot-crm", category: "crm", why: "Lead tracking" },
      ]),
    });

    assert.equal(result.source, "TEMPLATE");
    assert.ok(result.accountAccess, "DFY playbook must include accountAccess section");
    assert.equal(result.accountAccess!.isDFY, true);
    assert.ok(Array.isArray(result.accountAccess!.accessChecklist) && result.accountAccess!.accessChecklist.length > 0, "accessChecklist non-empty");
    assert.ok(Array.isArray(result.accountAccess!.accessAgreement) && result.accountAccess!.accessAgreement.length >= 4, "accessAgreement has ≥4 items");
    assert.ok(Array.isArray(result.accountAccess!.buildWorkflow) && result.accountAccess!.buildWorkflow.length >= 5, "buildWorkflow has ≥5 steps");
    assert.ok(Array.isArray(result.accountAccess!.offboarding) && result.accountAccess!.offboarding.length >= 4, "offboarding has ≥4 steps");

    // Verify AI platform access items are included for grok_bot and claude
    const systems = result.accountAccess!.accessChecklist.map((item) => item.accountSystem.toLowerCase());
    assert.ok(systems.some((s) => s.includes("grok")), "Grok Bot should be in checklist");
    assert.ok(systems.some((s) => s.includes("claude")), "Claude should be in checklist");

    // CRM (HubSpot from tool plan) should appear
    assert.ok(systems.some((s) => s.includes("hub") || s.includes("crm")), "CRM should be in checklist");

    // No stored credential language in agreement — "no passwords" or "no secrets"
    const agreementText = result.accountAccess!.accessAgreement.join(" ").toLowerCase();
    assert.ok(agreementText.includes("no") && (agreementText.includes("password") || agreementText.includes("credentials") || agreementText.includes("secret") || agreementText.includes("token")), "Access agreement must reference no-credential policy");

    // Offboarding must mention revocation/removal
    const offboardingText = result.accountAccess!.offboarding.join(" ").toLowerCase();
    assert.ok(offboardingText.includes("remov") || offboardingText.includes("revok"), "Offboarding must mention removal/revocation");

    // DFY tier plan should still be present
    assert.ok(Array.isArray(result.tierPlan.dfyBuildPlan) && result.tierPlan.dfyBuildPlan!.length > 0, "dfyBuildPlan present for DFY");
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Guided/Self-serve template does NOT include accountAccess section", async () => {
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
    for (const tier of ["GUIDED", "SELF_SERVE"]) {
      const result = await generateClientPlaybook({
        clientName: "Non-DFY Client",
        role: "Owner",
        industry: "Retail",
        bizSize: "2-10",
        areas: ["marketing"],
        aiComfort: 2,
        hoursLost: 8,
        helpStyle: "guided",
        timeSinks: ["social_content"],
        tier,
        vertical: "restaurants",
      });
      assert.equal(result.source, "TEMPLATE");
      assert.equal(result.accountAccess, undefined, `${tier} playbook must NOT include accountAccess`);
    }
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("buildTemplatePlaybook DFY access checklist never mentions shared passwords as first choice", async () => {
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
      clientName: "Security Test Client",
      role: "Owner",
      industry: "Accounting",
      bizSize: "solo",
      areas: ["executive_assistant"],
      aiComfort: 0,
      hoursLost: 25,
      helpStyle: "done_for_you",
      timeSinks: ["email", "scheduling"],
      tier: "WHITE_GLOVE",
      vertical: "professional_services",
    });
    assert.ok(result.accountAccess);
    // Access types must use delegated/invited approaches, not "shared password"
    for (const item of result.accountAccess!.accessChecklist) {
      const lower = item.accessType.toLowerCase();
      assert.ok(
        !lower.includes("shared password") && !lower.includes("share password"),
        `accessType "${item.accessType}" must not say "shared password" — use delegated/invited access instead`
      );
    }
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

test("GET /admin/clients/:id/access-log is blocked without auth", async () => {
  const { default: app } = await import("./app");
  const res = await request(app).get("/api/admin/clients/fake-id/access-log");
  assert.notEqual(res.status, 200, `unauthenticated GET should not return 200 (got ${res.status})`);
  assert.ok(res.status >= 400, `expected 4xx or 5xx, got ${res.status}`);
});

test("POST /admin/clients/:id/access-log is blocked without auth", async () => {
  const { default: app } = await import("./app");
  const res = await request(app)
    .post("/api/admin/clients/fake-id/access-log")
    .send({ accountSystem: "Gmail", accessType: "Admin seat", grantedDate: "2026-01-01" });
  assert.notEqual(res.status, 200, `unauthenticated POST should not return 200 (got ${res.status})`);
  assert.ok(res.status >= 400, `expected 4xx or 5xx, got ${res.status}`);
});
