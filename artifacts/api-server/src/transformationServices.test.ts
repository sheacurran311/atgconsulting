import test from "node:test";
import assert from "node:assert/strict";
import { serviceDivisions, transformationServices, transformationStages } from "./lib/transformationServices";
import { assessmentQuestions, preCallQuestions, applicableAnswers } from "./lib/assessmentProfile";
import { firstCallPrep } from "./lib/firstCallPrep";
const business={id:"audience",answer:"My business"};
const personal={id:"audience",answer:"My personal and family life"};
test("approved taxonomy contains twelve unique services, five divisions and five stages",()=>{
  assert.equal(transformationServices.length,12);
  assert.equal(new Set(transformationServices.map(s=>s.id)).size,12);
  assert.equal(new Set(transformationServices.map(s=>s.goal)).size,12);
  assert.equal(Object.keys(serviceDivisions).length,5);
  assert.equal(new Set(transformationServices.map(s=>s.division)).size,5);
  assert.equal(transformationStages.length,5);
  assert.equal(transformationServices.find(s=>s.id==="voice-ai")?.readiness,"pilot-required");
});
test("all expanded goals are business-only, route to one pre-call prompt and produce correct discovery scope",()=>{
  const businessOptions=assessmentQuestions([business]).find(q=>q.id==="top_problems")?.options??[];
  const personalOptions=assessmentQuestions([personal]).find(q=>q.id==="top_problems")?.options??[];
  for(const service of transformationServices){
    assert.ok(businessOptions.includes(service.goal),service.id);
    assert.ok(!personalOptions.includes(service.goal),service.id);
    const rows=[business,{id:"top_problems",answer:JSON.stringify([service.goal])}];
    const plan=preCallQuestions(rows);
    assert.ok(plan.length<=11,service.id);
    assert.equal(plan.filter(q=>q.id.startsWith("meeting_context_")).length,1);
    assert.ok(plan.some(q=>q.text===service.prompt));
    const prep=firstCallPrep(JSON.stringify(rows));
    assert.equal(prep.tracks[0]?.name,service.name);
    assert.equal(prep.tracks[0]?.proposal,service.proposal);
    assert.ok(!applicableAnswers([personal,rows[1]!]).some(a=>a.id==="top_problems"));
  }
});
test("mixed priorities preserve fractional leadership and existing website scope",()=>{
  const goal=transformationServices.find(s=>s.id==="fractional-ai-leadership")!.goal;
  const rows=[business,{id:"top_problems",answer:JSON.stringify(["Build or redesign a website",goal])},{id:"first_priority",answer:goal}];
  assert.deepEqual(firstCallPrep(JSON.stringify(rows)).tracks.map(t=>t.name),["Fractional AI leadership","Websites"]);
  assert.equal(preCallQuestions(rows).length,11);
});

import { serviceWorkflowLinks, workflowCandidates } from "./lib/serviceWorkflowLinks";
import { emptyBusinessContext, governanceReview } from "./lib/businessContext";
import { buildConsultationBrief } from "./lib/clientConsultationBrief";
import { buildOperatingPlan } from "./lib/operatingPlan";

test("catalog references resolve without inventing or duplicating existing identifiers",()=>{
  for(const service of transformationServices){
    const links=serviceWorkflowLinks[service.id]!;
    const resolved=workflowCandidates(service.id)!;
    for(const key of ["recipes","templates","modules"] as const){
      assert.deepEqual(new Set(resolved[key].map(r=>r.id)),new Set(links[key]),service.id+" "+key);
    }
    assert.equal(resolved.status,"candidate-only");
    assert.ok(resolved.gap);
  }
  assert.equal(workflowCandidates("unknown"),null);
});
test("context review fails closed, isolates tenants and requires voice pilot evidence",()=>{
  const draft=emptyBusinessContext("client-a");
  assert.equal(governanceReview(draft,"client-b","ai-readiness").status,"blocked");
  assert.equal(governanceReview(draft,"client-a","ai-readiness").status,"review");
  const approved={...draft,decisionOwner:"Owner",accessReview:"confirmed",dataReview:"confirmed",humanOversight:"confirmed",regulatedReview:"not-applicable"};
  assert.equal(governanceReview(approved,"client-a","ai-readiness").status,"cleared");
  assert.equal(governanceReview(approved,"client-a","voice-ai").status,"review");
  assert.equal(governanceReview({...approved,accessReview:"blocked"},"client-a","ai-readiness").status,"blocked");
  assert.equal(governanceReview({...approved,credential:"secret"},"client-a","ai-readiness").status,"blocked");
  assert.equal(governanceReview({...approved,sources:[{label:"Restricted records",owner:"Owner",classification:"restricted",authorization:"confirmed"}]},"client-a","ai-readiness").status,"review");
});
test("fractional leadership reaches consultant brief and planned delivery contract",()=>{
  const service=transformationServices.find(s=>s.id==="fractional-ai-leadership")!;
  const raw=JSON.stringify([business,{id:"top_problems",answer:JSON.stringify([service.goal])}]);
  const brief=buildConsultationBrief(raw);
  assert.ok(brief.fitCall[1]!.questions.includes(service.prompt));
  assert.equal(brief.transformationCandidates?.[0]?.serviceId,service.id);
  const plan=buildOperatingPlan(raw);
  assert.equal(plan.workflows[0]?.id,service.id);
  assert.equal(plan.workflows[0]?.status,"planned");
  assert.ok(plan.workflows[0]?.actions.includes("advisory hours"));
});
