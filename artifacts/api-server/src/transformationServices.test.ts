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
