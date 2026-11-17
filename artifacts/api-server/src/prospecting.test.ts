import test from "node:test";
import assert from "node:assert/strict";
import { assessProspect, mayAdvanceProspect, normalizeProspectDomain } from "./lib/prospecting";

const base = {
  industryFit: 5, sizeFit: 4, observableNeed: 5, contactConfidence: 4, urgency: 4,
  evidence: [{ claim: "Published website lacks a contact form.", sourceUrl: "https://example.com", observedAt: "2026-11-17T00:00:00Z", verified: true }],
  suppressed: false,
};

test("normalizes an approved website domain for deduplication", () => {
  assert.equal(normalizeProspectDomain("https://WWW.Example.com/path?q=1"), "example.com");
  assert.equal(normalizeProspectDomain("example.com"), "example.com");
  assert.equal(normalizeProspectDomain("javascript:alert(1)"), null);
  assert.equal(normalizeProspectDomain(""), null);
});

test("requires evidence for a qualified outreach target", () => {
  assert.equal(assessProspect(base).label, "QUALIFIED");
  assert.equal(assessProspect({ ...base, evidence: [] }).label, "REVIEW");
  assert.equal(assessProspect({ ...base, contactConfidence: 1 }).label, "REVIEW");
});

test("suppression always blocks outreach", () => {
  assert.deepEqual(assessProspect({ ...base, suppressed: true }).label, "HOLD");
  assert.equal(mayAdvanceProspect("APPROVED", "SUPPRESSED"), true);
  assert.equal(mayAdvanceProspect("SUPPRESSED", "CONTACTED"), false);
});

test("cannot skip consultant review and approval", () => {
  assert.equal(mayAdvanceProspect("NEW", "CONTACTED"), false);
  assert.equal(mayAdvanceProspect("DRAFT_READY", "CONTACTED"), false);
  assert.equal(mayAdvanceProspect("DRAFT_READY", "APPROVED"), true);
  assert.equal(mayAdvanceProspect("APPROVED", "CONTACTED"), true);
});

test("invalid weights are rejected", () => {
  assert.throws(() => assessProspect({ ...base, urgency: 9 }), RangeError);
});
