/**
 * Follow-up review regressions: test mode stays on admin sessions,
 * scheduled posts wait, DFY cap uses the accept time, catalog checks
 * do not hide verified rows, and intake arrays still parse.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { testModeForActor } from "./lib/access";
import { contentReadyToPublish } from "./lib/contentPublish";
import { countsTowardDfyCap, dfyMonthStart } from "./lib/guidedPackage";
import { catalogLinkFailureAction } from "./lib/catalogKinds";
import { parseIntakeAnswers } from "./lib/intakeAnswers";

test("ADMIN_TEST_MODE does not unlock a client session", async () => {
  const saved = process.env.ADMIN_TEST_MODE;
  process.env.ADMIN_TEST_MODE = "true";
  try {
    const { testModeForActor: again } = await import("./lib/access");
    assert.equal(again("ADMIN"), true);
    assert.equal(again("CLIENT"), false);
    assert.equal(again(null), false);
    assert.equal(testModeForActor("CLIENT"), false);
  } finally {
    if (saved === undefined) delete process.env.ADMIN_TEST_MODE;
    else process.env.ADMIN_TEST_MODE = saved;
  }
});

test("approved posts with a future publishAt stay unpublished", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  assert.equal(contentReadyToPublish({ status: "approved", publishAt: null }, now), true);
  assert.equal(contentReadyToPublish({ status: "approved", publishAt: new Date("2026-06-02T00:00:00Z") }, now), false);
  assert.equal(contentReadyToPublish({ status: "approved", publishAt: new Date("2026-05-01T00:00:00Z") }, now), true);
  assert.equal(contentReadyToPublish({ status: "draft", publishAt: null }, now), false);
});

test("DFY cap counts acceptedAt in the current month, not a later note edit", () => {
  const month = dfyMonthStart(new Date("2026-06-15T12:00:00Z"));
  assert.equal(countsTowardDfyCap({ id: "a", status: "accepted", acceptedAt: new Date("2026-06-02T00:00:00Z") }, month), true);
  assert.equal(countsTowardDfyCap({ id: "b", status: "accepted", acceptedAt: new Date("2026-05-02T00:00:00Z") }, month), false);
  assert.equal(countsTowardDfyCap({ id: "c", status: "accepted", acceptedAt: null }, month), false);
  assert.equal(countsTowardDfyCap({ id: "a", status: "accepted", acceptedAt: new Date("2026-06-02T00:00:00Z") }, month, "a"), false);
});

test("a failed catalog fetch does not disable a verified row", () => {
  assert.equal(catalogLinkFailureAction(404, true), "note");
  assert.equal(catalogLinkFailureAction(403, false), "note");
  assert.equal(catalogLinkFailureAction(404, false), "disable");
  assert.equal(catalogLinkFailureAction(410, false), "disable");
});

test("tool-plan fields come from the answer array", () => {
  const parsed = parseIntakeAnswers(JSON.stringify([
    { id: "business_type", answer: "Plumbing" },
    { id: "timeSinks", answer: "[\"email\",\"followups\"]" },
    { id: "aiPlatforms", answer: "[\"claude\",\"none\"]" },
    { id: "areas", answer: "[\"sales\"]" },
  ]));
  assert.equal(parsed.industry, "Plumbing");
  assert.deepEqual(parsed.timeSinks, ["email", "followups"]);
  assert.deepEqual(parsed.aiPlatforms, ["claude"]);
  assert.deepEqual(parsed.areas, ["sales"]);
});
