import test from "node:test";
import assert from "node:assert/strict";
import { buildNextActions, workflowRowState } from "./lib/clientHome";

test("recommended workflow state follows install, then tier", () => {
  assert.equal(workflowRowState({
    clientTier: "NONE",
    minTier: "SELF_SERVE",
    templateEnabled: true,
    installStatus: "verified",
    testMode: false,
  }), "verified");
  assert.equal(workflowRowState({
    clientTier: "NONE",
    minTier: "SELF_SERVE",
    templateEnabled: true,
    testMode: false,
  }), "locked");
  assert.equal(workflowRowState({
    clientTier: "GUIDED",
    minTier: "SELF_SERVE",
    templateEnabled: true,
    testMode: false,
  }), "ready");
});

test("next actions stay empty when nothing is waiting", () => {
  assert.deepEqual(buildNextActions({
    guidedRemaining: null,
    unreadMessages: 0,
    pendingOutputs: 0,
    openActionItems: 0,
  }), []);
  assert.equal(buildNextActions({
    guidedRemaining: 2,
    unreadMessages: 1,
    pendingOutputs: 0,
    openActionItems: 0,
  }).length, 2);
});
