import test from "node:test";
import assert from "node:assert/strict";
import { canAccessWorkshop, parseQuiz, progressPercent, scoreQuiz } from "./lib/workshopAccess";
import { WORKSHOP_SEEDS } from "./lib/workshopSeed";
import { clientHealthFlags } from "./lib/adminBoard";

test("workshop opens for paid plans and admin test mode", () => {
  assert.equal(canAccessWorkshop("NONE", false), false);
  assert.equal(canAccessWorkshop(null, false), false);
  assert.equal(canAccessWorkshop("SELF_SERVE", false), true);
  assert.equal(canAccessWorkshop("GUIDED", false), true);
  assert.equal(canAccessWorkshop("WHITE_GLOVE", false), true);
  assert.equal(canAccessWorkshop("NONE", true), true);
});

test("progress percent is zero until a lesson is complete", () => {
  assert.equal(progressPercent(0, 18), 0);
  assert.equal(progressPercent(9, 18), 50);
  assert.equal(progressPercent(1, 0), 0);
  assert.equal(progressPercent(3, 2), 100);
});

test("a quiz is self-scored from the answer key", () => {
  const questions = parseQuiz(JSON.stringify([
    { prompt: "One", choices: ["a", "b"], answerIndex: 1 },
    { prompt: "Two", choices: ["a", "b"], answerIndex: 0 },
  ]));
  assert.equal(questions.length, 2);
  assert.deepEqual(scoreQuiz([1, 0], questions), { score: 2, total: 2, results: [true, true] });
  assert.equal(scoreQuiz([0, 0], questions).score, 1);
  assert.equal(parseQuiz("{").length, 0);
});

test("the starter curriculum is a real course without invented figures", () => {
  const lessons = WORKSHOP_SEEDS.flatMap((mod) => mod.lessons);
  assert.ok(WORKSHOP_SEEDS.length >= 5 && WORKSHOP_SEEDS.length <= 6);
  assert.ok(lessons.length >= 15 && lessons.length <= 20);
  for (const lesson of lessons) {
    assert.ok(lesson.body.length > 80);
    assert.ok(lesson.exercise.length > 20);
    assert.ok(lesson.takeaways.length >= 2);
    const text = `${lesson.body} ${lesson.exercise}`;
    assert.doesNotMatch(text, /\b\d+\s*%/);
    assert.doesNotMatch(text, /\$\d/);
  }
});

test("an untouched paid workshop is a health flag", () => {
  const flags = clientHealthFlags({
    intakeCount: 1,
    proposalDraft: false,
    tier: "SELF_SERVE",
    guidedSessionsTotal: null,
    guidedSessionsUsed: 0,
    dfyAccepted: false,
    accessCount: 0,
    unreadFromClient: 0,
    workshopNotStarted: true,
  });
  assert.deepEqual(flags, ["AI workshop not started"]);
});
