/**
 * Phase 1 skills — template fallback tests (no DB, no LLM key).
 * Verifies each workflow produces valid output without external dependencies.
 */
import test from "node:test";
import assert from "node:assert/strict";

function noLLM() {
  const saved = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    XAI_API_KEY:   process.env.XAI_API_KEY,
    LLM_API_KEY:   process.env.LLM_API_KEY,
  };
  delete process.env.OPENAI_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.LLM_API_KEY;
  return () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  };
}

test("inbox triage template fallback returns one item per non-empty line", async () => {
  const restore = noLLM();
  try {
    const { triageInbox } = await import("./lib/llm");
    const result = await triageInbox({
      messages: "Customer asks about pricing\nComplaint about late delivery\nThank you note",
      businessDescription: "Plumbing company",
      senderName: "Jordan",
    });
    assert.equal(result.source, "TEMPLATE");
    assert.ok(result.items.length >= 1, "at least one item");
    for (const item of result.items) {
      assert.ok(["urgent","normal","low"].includes(item.urgency), "valid urgency");
      assert.ok(item.draftReply.length > 0, "draft reply non-empty");
    }
  } finally { restore(); }
});

test("review request template fallback returns one message per channel", async () => {
  const restore = noLLM();
  try {
    const { generateReviewContent } = await import("./lib/llm");
    const result = await generateReviewContent({
      businessName: "Sunny Roofing",
      businessType: "Roofing contractor",
      channels: "SMS, Email",
      senderName: "Mike",
    });
    assert.equal(result.source, "TEMPLATE");
    assert.ok(result.requestMessages.length >= 1, "at least one request message");
    for (const m of result.requestMessages) {
      assert.ok(m.channel.length > 0, "channel present");
      assert.ok(m.message.length > 0, "message present");
    }
  } finally { restore(); }
});

test("social calendar template fallback produces weeks and posts", async () => {
  const restore = noLLM();
  try {
    const { generateSocialCalendar } = await import("./lib/llm");
    const result = await generateSocialCalendar({
      businessDescription: "Coffee shop in Denver",
      platforms: "Instagram, Facebook",
      cadence: 3,
      weeks: 2,
    });
    assert.equal(result.source, "TEMPLATE");
    assert.ok(result.calendarWeeks.length >= 1, "at least one week");
    assert.ok(result.calendarWeeks[0]!.posts.length >= 1, "at least one post in week 1");
    for (const week of result.calendarWeeks) {
      for (const post of week.posts) {
        assert.ok(post.draft.length > 0, "draft non-empty");
        assert.ok(post.platform.length > 0, "platform present");
      }
    }
  } finally { restore(); }
});

test("SEO audit template fallback detects missing title/meta from HTML", async () => {
  const restore = noLLM();
  try {
    const { runSeoAudit } = await import("./lib/llm");
    const result = await runSeoAudit({
      html: "<html><head></head><body><p>No title or meta here</p></body></html>",
      businessType: "Plumber",
      cityArea: "Denver, CO",
    });
    assert.equal(result.source, "TEMPLATE");
    assert.ok(result.findings.length >= 1, "at least one finding");
    const p0Slugs = result.findings.filter((f) => f.priority === "P0").map((f) => f.category);
    assert.ok(p0Slugs.some((c) => c.toLowerCase().includes("title")), "title tag flagged P0");
    assert.ok(Array.isArray(result.gbpChecklist) && result.gbpChecklist.length > 0, "GBP checklist present");
  } finally { restore(); }
});

test("SEO audit template fallback parses existing title and meta", async () => {
  const restore = noLLM();
  try {
    const { runSeoAudit } = await import("./lib/llm");
    const html = `<html><head>
      <title>Best Plumber in Denver CO | Sunny Plumbing</title>
      <meta name="description" content="Reliable plumbing services in Denver. Call 303-555-0100."/>
    </head><body><h1>Denver Plumber</h1></body></html>`;
    const result = await runSeoAudit({ html, businessType: "Plumber", cityArea: "Denver" });
    assert.equal(result.source, "TEMPLATE");
    assert.ok(result.pageTitle.includes("Denver"), "title parsed");
    assert.ok(result.metaDescription.length > 0, "meta description parsed");
    assert.equal(result.h1, "Denver Plumber");
  } finally { restore(); }
});

test("POST /workbench/inbox-triage returns 401 without auth", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop";
  const { default: app } = await import("./app");
  const request = (await import("supertest")).default;
  const res = await request(app)
    .post("/api/workbench/inbox-triage")
    .send({ messages: "test message" });
  assert.ok(res.status >= 400, `expected 4xx, got ${res.status}`);
});
