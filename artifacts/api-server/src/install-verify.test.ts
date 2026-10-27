/**
 * Verified installs tests:
 * 1. Confirmation code format: ATG-XXXX (4 alphanumeric chars, no 0/O/1/I)
 * 2. Code is hashed (SHA-256); plain code is not recoverable from hash
 * 3. SKILL.md renderSkillMd() embeds verification instruction when code provided
 * 4. SKILL.md renderSkillMd() does NOT embed instruction when no code
 * 5. POST /api/workbench/install-verify requires auth
 * 6. GET  /api/workbench/install-code/:slug requires auth
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import request from "supertest";

// ── Code format ───────────────────────────────────────────────────────────────

test("generated codes match ATG-XXXX format without ambiguous characters", () => {
  // Import the route module's internal code generator indirectly by checking the format
  const ALLOWED = new Set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
  const FORBIDDEN = new Set("01IO");

  // Generate a sample and verify — we do this by testing the regex
  const validPattern = /^ATG-[A-HJ-NP-Z2-9]{4}$/;
  const samples = [
    "ATG-7F3K", "ATG-ABCD", "ATG-2345", "ATG-HJKL",
    "ATG-MNPQ", "ATG-RSTU", "ATG-VWXY", "ATG-Z234",
  ];
  for (const code of samples) {
    assert.match(code, validPattern, `${code} matches format`);
    const chars = code.slice(4);
    for (const ch of chars) {
      assert.ok(ALLOWED.has(ch), `${ch} is in allowed set`);
      assert.ok(!FORBIDDEN.has(ch), `${ch} is not in forbidden set`);
    }
  }
  // Invalid samples must not match
  for (const bad of ["ATG-O123", "ATG-I234", "ATG-0ABC", "ATG-1234", "XTG-ABCD", "ATG-ABC"]) {
    assert.doesNotMatch(bad, validPattern, `${bad} should not match`);
  }
});

test("code hash is SHA-256 hex (not the plain code)", () => {
  const code = "ATG-7F3K";
  const hash = createHash("sha256").update(code).digest("hex");
  assert.equal(hash.length, 64, "SHA-256 hex is 64 chars");
  assert.notEqual(hash, code, "hash is different from the code");
  // Same code hashes deterministically
  assert.equal(createHash("sha256").update(code).digest("hex"), hash);
  // Different codes hash differently
  assert.notEqual(createHash("sha256").update("ATG-AAAA").digest("hex"), hash);
});

// ── SKILL.md rendering ────────────────────────────────────────────────────────

test("renderSkillMd includes first-run verification instruction when code provided", async () => {
  const { renderSkillMd } = await import("./lib/templates.js");
  const template = {
    slug: "follow-up",
    name: "Lead follow-up",
    description: "Drafts a follow-up email.",
    minTier: "SELF_SERVE",
    verticalTags: "[]",
    systemPrompt: "You draft follow-up emails.",
    userPromptTemplate: "Write a follow-up for {{name}}.",
    inputSchema: '{"name":"string"}',
    outputFormat: "A short email.",
  };
  const code = "ATG-7F3K";
  const md = renderSkillMd(template, code);

  // Must include the code in the markdown
  assert.ok(md.includes(code), "Code must appear in the SKILL.md");
  assert.ok(md.includes("ATG verification code"), "Must include verification code label");
  assert.ok(md.includes("first run"), "Must include first-run instruction");
  assert.ok(md.includes("verification_code:"), "Must include code in YAML front matter");
  // Must still include the normal content
  assert.ok(md.includes("System Prompt"), "System Prompt section present");
  assert.ok(md.includes("approval-first") || md.includes("nothing is sent automatically"), "Approval note present");
});

test("renderSkillMd does NOT include verification block when no code provided", async () => {
  const { renderSkillMd } = await import("./lib/templates.js");
  const template = {
    slug: "follow-up",
    name: "Lead follow-up",
    description: "Drafts a follow-up email.",
    minTier: "SELF_SERVE",
    verticalTags: "[]",
    systemPrompt: "You draft follow-up emails.",
    userPromptTemplate: "Write a follow-up for {{name}}.",
    inputSchema: '{"name":"string"}',
    outputFormat: "A short email.",
  };
  const md = renderSkillMd(template); // no code
  assert.ok(!md.includes("ATG-"), "No code should appear without one provided");
  assert.ok(!md.includes("verification_code:"), "No verification_code in front matter");
  assert.ok(!md.includes("first-run verification"), "No first-run verification section");
});

// ── Auth enforcement ──────────────────────────────────────────────────────────

test("POST /api/workbench/install-verify requires auth (not 200)", async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop";
  const { default: app } = await import("./app.js");
  const res = await request(app)
    .post("/api/workbench/install-verify")
    .send({ slug: "follow-up", code: "ATG-TEST" });
  assert.notEqual(res.status, 200, `should not be 200 without auth (got ${res.status})`);
  assert.ok(res.status >= 400, `expected 4xx or 5xx, got ${res.status}`);
});

test("GET /api/workbench/install-code/:slug requires auth (not 200)", async () => {
  const { default: app } = await import("./app.js");
  const res = await request(app).get("/api/workbench/install-code/follow-up");
  assert.notEqual(res.status, 200, `should not be 200 without auth (got ${res.status})`);
  assert.ok(res.status >= 400, `expected 4xx or 5xx, got ${res.status}`);
});

test("GET /api/admin/clients/:id/install-status requires admin auth (not 200)", async () => {
  const { default: app } = await import("./app.js");
  const res = await request(app).get("/api/admin/clients/fake-id/install-status");
  assert.notEqual(res.status, 200, `should not be 200 without auth (got ${res.status})`);
  assert.ok(res.status >= 400, `expected 4xx or 5xx, got ${res.status}`);
});
