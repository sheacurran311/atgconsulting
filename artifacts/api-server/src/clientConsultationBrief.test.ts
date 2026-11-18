import test from "node:test";
import assert from "node:assert/strict";
import { buildConsultationBrief } from "./lib/clientConsultationBrief";
const sample=(data:Record<string,string>)=>JSON.stringify(Object.entries(data).map(([id,answer])=>({id,answer})));
test("trade client receives relevant 20-minute fit call and three Guided milestones",()=>{
 const brief=buildConsultationBrief(sample({
  audience:"My business",company_name:"Example Plumbing",business_type:"Trades, construction or home services",
  top_problems:JSON.stringify(["Quotes and estimates","Website SEO and search visibility"]),
  first_priority:"Quotes and estimates",core_system:JSON.stringify(["CRM (such as HubSpot or Salesforce)"])
 }));
 assert.equal(brief.fitCall.length,4);
 assert.deepEqual(brief.fitCall.map(s=>s.minutes),["0–3","3–10","10–15","15–20"]);
 assert.equal(brief.guidedSessions.length,3);
 assert.equal(brief.organization,"Example Plumbing");
 assert.match(brief.fitCall[1]!.questions.join(" "),/estimate|quote/i);
 assert.ok(brief.recommendedSkills.some(s=>s.id==="sales-enablement"));
});
test("five Guided sessions produce five distinct acceptance gates",()=>{
 const brief=buildConsultationBrief(sample({audience:"My business",top_problems:JSON.stringify(["Website SEO and search visibility"])}),5);
 assert.equal(brief.guidedSessions.length,5);
 assert.ok(brief.recommendedSkills.some(s=>s.id==="seo-audit"));
 assert.ok(brief.guidedSessions.every(s=>Boolean(s.acceptance)));
});
test("personal intake never guesses a company and surfaces missing discovery facts",()=>{
 const brief=buildConsultationBrief(sample({audience:"My personal and family life",top_problems:JSON.stringify(["Family and sports travel"])}));
 assert.equal(brief.organization,null);
 assert.ok(brief.missingInformation.some(x=>x.includes("time baseline")));
 assert.ok(!brief.knownContext.some(x=>x.label==="Business"));
});
