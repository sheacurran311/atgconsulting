/**
 * Day planner. Pure functions — no database.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { reconcileDayBlocks, suggestDay, type DayProfileInput, type SuggestionInput } from "./lib/dayPlan";

function profile(overrides: Partial<DayProfileInput> = {}): DayProfileInput {
  return {
    timezone: "America/Denver",
    workDays: [1, 2, 3, 4, 5],
    startMin: 480,
    endMin: 1020,
    typicalDay: ["morning_email", "followups"],
    typicalNote: null,
    scope: "individual",
    teamNote: null,
    ...overrides,
  };
}

function input(overrides: Partial<SuggestionInput> = {}): SuggestionInput {
  return {
    profile: profile(),
    accounts: [{ realm: "professional", kind: "email", provider: "gmail", label: "Work Gmail" }],
    timeSinks: ["email", "followups"],
    areas: ["sales"],
    personalizedSlugs: ["follow-up", "inbox-triage"],
    automateFirst: null,
    consultations: [],
    actionItems: [],
    weekday: 1,
    ...overrides,
  };
}

test("solo work email and follow-ups are separate morning blocks", () => {
  const blocks = suggestDay(input());
  const inbox = blocks.find((block) => block.suggestionKey === "morning_email");
  const follow = blocks.find((block) => block.suggestionKey === "followups");
  assert.ok(inbox);
  assert.ok(follow);
  assert.equal(inbox.realm, "professional");
  assert.equal(follow.realm, "professional");
  assert.equal(inbox.skillSlug, "inbox-triage");
  assert.equal(follow.skillSlug, null);
  assert.equal(inbox.startMin, 480);
  assert.equal(inbox.endMin, 505);
  assert.equal(follow.startMin, inbox.endMin);
  assert.equal(follow.endMin, 530);
  assert.match(follow.detail, /don't fill in who/i);
  assert.match(follow.efficiency, /after inbox/i);
});

test("a personal account sits outside the work window", () => {
  const blocks = suggestDay(input({
    accounts: [
      { realm: "professional", kind: "email", provider: "gmail", label: "Work Gmail" },
      { realm: "personal", kind: "email", provider: "gmail", label: "Personal Gmail" },
    ],
    timeSinks: ["email", "followups", "personal_logistics"],
  }));
  const personal = blocks.filter((block) => block.realm === "personal");
  assert.equal(personal.length, 1);
  assert.ok(personal[0]!.startMin >= 1020);
  assert.equal(personal.every((block) => block.startMin >= 1020), true);
  assert.equal(blocks.some((block) => block.realm === "personal" && block.startMin < 1020), false);
});

test("a small-team profile does not invent assignees", () => {
  const blocks = suggestDay(input({
    profile: profile({
      scope: "team",
      teamNote: "Sam covers the phones",
      typicalDay: ["morning_email", "client_work"],
    }),
  }));
  const blob = JSON.stringify(blocks);
  assert.equal(blob.includes("Sam"), false);
  assert.equal(blob.toLowerCase().includes("assigned"), false);
  assert.ok(blocks.some((block) => block.suggestionKey === "client_work"));
});

test("a dismissed suggestion is not created again", () => {
  const suggested = suggestDay(input());
  const plan = reconcileDayBlocks(
    [{ suggestionKey: "followups", status: "dismissed" }],
    suggested,
  );
  assert.equal(plan.create.some((block) => block.suggestionKey === "followups"), false);
  assert.equal(plan.update.some((block) => block.suggestionKey === "followups"), false);
  assert.equal(plan.removeKeys.includes("followups"), false);
  assert.equal(plan.create.some((block) => block.suggestionKey === "morning_email"), true);
});

test("work moves around a consultation instead of covering it", () => {
  const blocks = suggestDay(input({
    consultations: [{ id: "c1", title: "Call with Lee", startMin: 480, durationMin: 60 }],
  }));
  const call = blocks.find((block) => block.suggestionKey === "consultation:c1");
  const inbox = blocks.find((block) => block.suggestionKey === "morning_email");
  assert.ok(call);
  assert.equal(call.startMin, 480);
  assert.equal(call.endMin, 540);
  assert.ok(inbox);
  assert.ok(inbox.startMin >= call.endMin);
});
