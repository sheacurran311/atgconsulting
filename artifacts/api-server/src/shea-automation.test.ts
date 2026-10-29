import test from "node:test";
import assert from "node:assert/strict";

test("notifyShea addresses only the configured Shea inbox", async () => {
  process.env.EMAIL_PROVIDER = "console";
  process.env.SHEA_EMAIL = "shea@atgconsulting.io";
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => { lines.push(args.map(String).join(" ")); };
  try {
    const { notifyShea, sheaInbox } = await import("./lib/email");
    assert.equal(sheaInbox(), "shea@atgconsulting.io");
    const result = await notifyShea("New intake", "Client email: client@example.com");
    assert.equal(result.sent, false);
    const logged = lines.join("\n");
    assert.match(logged, /To: shea@atgconsulting.io/);
    assert.doesNotMatch(logged, /To: client@example.com/);
  } finally {
    console.log = original;
  }
});

test("merged review waits until every required role has submitted", async () => {
  const { requiredRolesComplete } = await import("./lib/engagementMerge");
  assert.equal(requiredRolesComplete([], ["owner"]), false);
  assert.equal(requiredRolesComplete(["owner", "Finance"], ["owner"]), false);
  assert.equal(requiredRolesComplete(["owner", "Finance"], ["owner", "finance"]), true);
});
