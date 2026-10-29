/**
 * Client proposal view: drafts stay hidden, internal review notes stay internal.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { clientProposalState, parseInvestment, parseMilestones, toClientProposal } from "./lib/clientProposal";

test("proposal state is empty without a client or an intake", () => {
  assert.equal(clientProposalState({ clientId: null, intakeCount: 0, hasApproved: false }), "empty");
  assert.equal(clientProposalState({ clientId: "c1", intakeCount: 0, hasApproved: false }), "empty");
});

test("proposal state is pending until an approved proposal exists", () => {
  assert.equal(clientProposalState({ clientId: "c1", intakeCount: 1, hasApproved: false }), "pending");
  assert.equal(clientProposalState({ clientId: "c1", intakeCount: 2, hasApproved: true }), "ready");
});

test("milestones and investment ignore malformed JSON and blank fields", () => {
  assert.deepEqual(parseMilestones("not-json"), []);
  assert.deepEqual(parseMilestones(JSON.stringify([{ label: "Week 1", description: "Review" }, { label: "  ", description: "" }])), [
    { label: "Week 1", description: "Review" },
  ]);
  assert.deepEqual(parseInvestment("{}"), {});
  assert.deepEqual(parseInvestment(JSON.stringify({ tier: "GUIDED", price: "", care: "optional" })), { tier: "GUIDED", care: "optional" });
});

test("client proposal omits Shea's internal review summary", () => {
  const view = toClientProposal({
    id: "p1",
    status: "approved",
    approvedAt: new Date("2026-10-01T00:00:00.000Z"),
    execSummary: "Short version",
    understanding: "Where you are",
    scope: "- One workflow",
    howWeConnect: "Your tools",
    milestones: "[]",
    investment: "{}",
    acceptanceClause: "See the terms.",
  }, "Ada");
  assert.equal(view.contactName, "Ada");
  assert.equal(view.execSummary, "Short version");
  assert.equal("reviewSummary" in view, false);
});
