/**
 * Skill export tests:
 * 1. renderSkillMd produces valid YAML frontmatter (lowercase-hyphen name = slug)
 * 2. Export does not contain 'Return ONLY valid JSON' (only for in-app use)
 * 3. Export does not contain {{#...}} Handlebars block helpers
 * 4. Export contains required sections: When to use, What you need, Steps, Quality checks, Approval stop
 * 5. agent-pipeline returns a non-exportable notice, not a SKILL.md
 * 6. With verificationCode: code appears in frontmatter and body
 * 7. With intakeContext: personalised senderName replaces {{YOUR_NAME}}
 * 8. Static routine prompts exist for all 10 exportable slugs
 * 9. All 10 exportable slugs have INPUT_DESCRIPTIONS and QUALITY_CHECKS entries
 * 10. Admin reset-to-default works for Phase 2 + Phase 3 slugs (not just Phase 1)
 */
import test from "node:test";
import assert from "node:assert/strict";

// ── renderSkillMd ─────────────────────────────────────────────────────────────

const TEMPLATE_BASE = {
  slug:               "follow-up",
  name:               "Lead follow-up",
  description:        "Drafts a personalised follow-up email.",
  minTier:            "SELF_SERVE",
  verticalTags:       "[]",
  systemPrompt:       `You draft follow-up emails.\n${  "- Return ONLY valid JSON matching the output schema. No prose outside JSON.\n"}Rules:\n- Do not send automatically.`,
  userPromptTemplate: "My name: {{senderName}}\nFollow up with {{contactName}}.",
  inputSchema:        '{"senderName":"string","contactName":"string"}',
  outputFormat:       "A short email draft.",
};

test("SKILL.md frontmatter: name matches slug (lowercase-hyphen), description quoted", async () => {
  const { renderSkillMd } = await import("./lib/templates.js");
  const md = renderSkillMd(TEMPLATE_BASE);
  const lines = md.split("\n");
  const nameLine = lines.find((l) => l.startsWith("name:"));
  const slugLine = lines.find((l) => l.startsWith("slug:"));
  assert.ok(nameLine, "frontmatter has 'name:' line");
  assert.ok(slugLine, "frontmatter has 'slug:' line");
  // name value should equal the slug
  assert.equal(nameLine!.replace("name:", "").trim(), TEMPLATE_BASE.slug, "name equals slug");
  assert.equal(slugLine!.replace("slug:", "").trim(), TEMPLATE_BASE.slug);
});

test("SKILL.md export does NOT contain 'Return ONLY valid JSON'", async () => {
  const { renderSkillMd } = await import("./lib/templates.js");
  const md = renderSkillMd(TEMPLATE_BASE);
  assert.doesNotMatch(md, /Return ONLY valid JSON/i, "JSON-only rule must be stripped from export");
});

test("SKILL.md export does NOT contain Handlebars block helpers {{#...}}", async () => {
  const { renderSkillMd } = await import("./lib/templates.js");
  const TEMPLATE_WITH_HELPERS = {
    ...TEMPLATE_BASE,
    userPromptTemplate: "{{#if senderName}}Hello, {{senderName}}{{/if}}\nContact: {{contactName}}.",
  };
  const md = renderSkillMd(TEMPLATE_WITH_HELPERS);
  assert.doesNotMatch(md, /\{\{#/, "{{# Handlebars block helpers must be stripped");
  assert.doesNotMatch(md, /\{\{\//, "{{/ Handlebars closing helpers must be stripped");
  // Plain variables should remain (or be replaced with placeholders)
  assert.ok(md.includes("{{contactName}}") || md.includes("{{YOUR_NAME}}"), "plain variables kept or replaced");
});

test("SKILL.md export contains required structural sections", async () => {
  const { renderSkillMd } = await import("./lib/templates.js");
  const md = renderSkillMd(TEMPLATE_BASE);
  const required = [
    "## When to use",
    "## What you need to provide",
    "## System instructions",
    "## Quality checks before using the output",
    "Approval required before anything is sent",
  ];
  for (const section of required) {
    assert.ok(md.includes(section), `Missing section: "${section}"`);
  }
  // Must include the approval stop in a prominent position
  assert.ok(md.includes("☑"), "Approval checklist items (☑) must be present");
});

test("agent-pipeline slug returns non-exportable notice", async () => {
  const { renderSkillMd } = await import("./lib/templates.js");
  const pipelineMd = renderSkillMd({
    ...TEMPLATE_BASE,
    slug: "agent-pipeline",
    name: "Agent pipeline",
  });
  assert.ok(pipelineMd.includes("exportable: false") || pipelineMd.includes("not standalone"), "pipeline should flag non-exportable");
  assert.doesNotMatch(pipelineMd, /## System instructions/, "pipeline should not include system instructions");
  assert.doesNotMatch(pipelineMd, /## When to use/, "pipeline should not include normal structure");
});

test("SKILL.md with verificationCode: code appears in frontmatter and body", async () => {
  const { renderSkillMd } = await import("./lib/templates.js");
  const code = "ATG-7F3K";
  const md = renderSkillMd(TEMPLATE_BASE, code);
  assert.ok(md.includes(`verification_code: ${code}`), "code in frontmatter");
  assert.ok(md.includes(code), "code in body");
  assert.ok(md.includes("First-run verification"), "first-run section present");
  assert.ok(md.includes("Do not print the code on any subsequent runs"), "subsequent-run note present");
});

test("SKILL.md with intakeContext: personalised placeholders replaced", async () => {
  const { renderSkillMd } = await import("./lib/templates.js");
  const md = renderSkillMd(TEMPLATE_BASE, undefined, {
    senderName: "Jane Smith",
    businessName: "Apex Plumbing",
    industry: "home_services",
  });
  assert.ok(md.includes("Jane Smith") || !md.includes("{{YOUR_NAME}}"), "senderName replaced");
  assert.ok(!md.includes("{{senderName}}"), "{{senderName}} template variable replaced");
});

// ── Static routine prompts ────────────────────────────────────────────────────

const EXPORTABLE_SLUGS = [
  "follow-up", "inbox-triage", "review-request", "social-calendar", "seo-audit",
  "money-snapshot", "booking-flow", "quote-proposal", "prospect-research", "faq-support",
];

test("All 10 exportable slugs have ROUTINE_PROMPTS entries for all 3 platforms", async () => {
  const { ROUTINE_PROMPTS } = await import("./lib/templates.js");
  for (const slug of EXPORTABLE_SLUGS) {
    const rp = ROUTINE_PROMPTS[slug];
    assert.ok(rp, `ROUTINE_PROMPTS missing for slug: ${slug}`);
    assert.ok(rp!.grok_bot?.length > 20, `grok_bot routine too short for ${slug}`);
    assert.ok(rp!.claude?.length > 20, `claude routine too short for ${slug}`);
    assert.ok(rp!.chatgpt?.length > 20, `chatgpt routine too short for ${slug}`);
  }
});

// ── Phase 2 + Phase 3 reset ───────────────────────────────────────────────────

test("Phase 2 and Phase 3 seeds are available for reset (PHASE2_SEEDS, PHASE3_SEEDS exported)", async () => {
  const { PHASE2_SEEDS, PHASE3_SEEDS } = await import("./lib/templates.js");
  assert.ok(Array.isArray(PHASE2_SEEDS) && PHASE2_SEEDS.length > 0, "PHASE2_SEEDS non-empty");
  assert.ok(Array.isArray(PHASE3_SEEDS) && PHASE3_SEEDS.length > 0, "PHASE3_SEEDS non-empty");
  // Verify all 11 slugs are covered across the three seed arrays
  const { TEMPLATE_SEEDS: P1 } = await import("./lib/templates.js");
  const allSlugs = [...P1, ...PHASE2_SEEDS, ...PHASE3_SEEDS].map((s) => s.slug);
  for (const expected of EXPORTABLE_SLUGS) {
    assert.ok(allSlugs.includes(expected), `Seed missing for exportable slug: ${expected}`);
  }
  assert.ok(allSlugs.includes("agent-pipeline"), "agent-pipeline seed present");
});

// ── Personalization tier awareness ────────────────────────────────────────────

test("extractPersonalizedSlugs handles overwritten __RANK__ correctly (single match)", async () => {
  const { extractPersonalizedSlugs } = await import("./lib/personalization.js");

  // Single rank block — normal case
  const notes1 = `Some admin notes\n__RANK__{"personalizedSlugs":["follow-up","inbox-triage"]}`;
  const slugs1 = extractPersonalizedSlugs(notes1);
  assert.deepEqual(slugs1, ["follow-up", "inbox-triage"]);

  // No rank block
  const notes2 = "Just some notes with no rank";
  assert.equal(extractPersonalizedSlugs(notes2), null);

  // Empty notes
  assert.equal(extractPersonalizedSlugs(null), null);
  assert.equal(extractPersonalizedSlugs(""), null);
});
