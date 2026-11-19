import test from "node:test";
import assert from "node:assert/strict";
import { FitCallAnswers, fitCallMissing, fitCallPromptContext, proposalDeliveryPlan } from "./lib/fitCall";

const completed=FitCallAnswers.parse({
 priority:"Reduce slow quote follow-up",
 workflowExample:"Lead arrives, owner manually emails a quote",
 currentSystems:"Google Sheets",
 baseline:"Around 10 quotes per week, verified by owner",
 processOwner:"Owner",
 decisionMaker:"Business owner",
 budget:"Needs final approval",
 timing:"Next month",
 pilot:"Draft quote follow-ups for human approval",
 successMetric:"Owner approves five sample drafts without incorrect recipients",
 boundaries:"Never auto-send",
 clientDependencies:"Provide approved anonymized samples",
 exclusions:"Automatic sending and CRM migration",
 nextStep:"Owner sends five redacted examples by Friday",
});
test("fit call requires verified discovery decisions before completion",()=>{
 assert.deepEqual(fitCallMissing(completed),[]);
 const missing=fitCallMissing(FitCallAnswers.parse({}));
 assert.ok(missing.includes("decisionMaker"));
 assert.ok(missing.includes("pilot"));
 assert.ok(missing.includes("successMetric"));
});
test("fit-call intake data rejects unexpected keys and oversized values",()=>{
 assert.equal(FitCallAnswers.safeParse({priority:"x",unknownSecret:"do not save"}).success,false);
 assert.equal(FitCallAnswers.safeParse({priority:"x".repeat(1001)}).success,false);
});
test("proposal prompt context includes confirmed pilot, boundaries and approval requirements",()=>{
 const context=fitCallPromptContext(completed);
 assert.match(context,/Draft quote follow-ups/);
 assert.match(context,/Never auto-send/);
 assert.match(context,/Business owner/);
 assert.doesNotMatch(context,/undefined/);
});
test("approved proposal milestone contract is derived from exact source scope",()=>{
 const scope="Create a draft-only follow-up workflow";
 const contract=proposalDeliveryPlan(JSON.stringify([
  {label:"Discovery",description:"Confirm five examples"},
  {label:"Pilot",description:"Review draft messages"},
 ]),scope,completed);
 assert.equal(contract.source,"approved_proposal");
 assert.equal(contract.firstPilot,completed.pilot);
 assert.equal(contract.acceptanceCriterion,completed.successMetric);
 assert.equal(contract.exclusions,completed.exclusions);
 assert.equal(contract.scope,scope);
 assert.deepEqual(contract.milestones.map(x=>x.status),["not_started","not_started"]);
});
test("invalid proposal milestones never become invented delivery tasks",()=>{
 const contract=proposalDeliveryPlan("invalid-json","Actual confirmed scope",completed);
 assert.deepEqual(contract.milestones,[]);
});
