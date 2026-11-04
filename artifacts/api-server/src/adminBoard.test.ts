import test from "node:test";
import assert from "node:assert/strict";
import { clientHealthFlags, countByKey } from "./lib/adminBoard";

test("client health is a list of flags, not a score", () => {
  assert.deepEqual(clientHealthFlags({
    intakeCount: 1,
    proposalDraft: false,
    tier: "SELF_SERVE",
    guidedSessionsTotal: null,
    guidedSessionsUsed: 0,
    dfyAccepted: false,
    accessCount: 0,
    unreadFromClient: 0,
  }), []);

  const flags = clientHealthFlags({
    intakeCount: 0,
    proposalDraft: true,
    tier: "GUIDED",
    guidedSessionsTotal: 3,
    guidedSessionsUsed: 3,
    dfyAccepted: true,
    accessCount: 0,
    unreadFromClient: 1,
  });
  assert.ok(flags.includes("No intake"));
  assert.ok(flags.includes("Guided sessions used up"));
  assert.equal(typeof flags.length, "number");
  assert.equal("score" in { flags }, false);
});

test("missing pipeline stages count as zero", () => {
  assert.equal(countByKey([{ key: "new", count: 2 }], "converted"), 0);
  assert.equal(countByKey([{ key: "new", count: 2 }], "new"), 2);
});
