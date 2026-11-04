/**
 * P0 regressions from AUDIT-2.
 * Tool plans are never auto-approved. Clients do not receive drafts.
 * The Lead follow-up button submits the existing draft form.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldAutoApproveToolPlan, toolPlanVisibleToClient } from "./lib/toolPlanPolicy";
import { helpStyleFromIntake } from "./lib/intakeHelpStyle";

test("tool plans are never auto-approved", () => {
  for (const tier of ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE", null, undefined]) {
    assert.equal(shouldAutoApproveToolPlan(tier), false);
  }
});

test("clients only see an approved tool plan", () => {
  assert.equal(toolPlanVisibleToClient("approved"), true);
  assert.equal(toolPlanVisibleToClient("draft"), false);
  assert.equal(toolPlanVisibleToClient(null), false);
});

test("SkillRunner submits a lead follow-up draft", () => {
  const src = readFileSync(
    new URL("../../atg-consulting/src/components/workbench/SkillRunner.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /draftFollowUp/);
  assert.match(src, /who/);
  assert.match(src, /lastTouch/);
  assert.match(src, /wantToSay/);
  assert.doesNotMatch(src, /Follow-up is not a form here/);
});

test("intake history uses preferred help, not decision authority", () => {
  assert.equal(
    helpStyleFromIntake({
      answers: JSON.stringify([{ id: "preferredHelp", answer: "guided" }, { id: "decisionAuthority", answer: "partial" }]),
      requestedTier: "SELF_SERVE",
    }),
    "guided",
  );
  assert.equal(helpStyleFromIntake({ answers: "[]", requestedTier: "WHITE_GLOVE" }), "done_for_you");
  assert.equal(helpStyleFromIntake({ answers: "[]", requestedTier: null }), "not_sure");
  assert.notEqual(helpStyleFromIntake({ answers: JSON.stringify([{ id: "decisionAuthority", answer: "none" }]) }), "none");
});
