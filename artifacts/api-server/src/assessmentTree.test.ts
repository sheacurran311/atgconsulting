import test from "node:test";
import assert from "node:assert/strict";
import { applicableAnswers, assessmentOrder, assessmentQuestions, assessmentStep } from "./lib/assessmentProfile";
type Answer={id:string;answer:string};
const answer=(id:string,value:string):Answer=>({id,answer:value});
const business=answer("audience","My business");
const family=answer("audience","My personal and family life");
const both=answer("audience","Both business and personal life");
const select=(...choices:string[])=>JSON.stringify(choices);

test("home services intake includes firmographics, decision maker and trade-specific discovery",()=>{
  const values=[
    business,
    answer("business_type","Trades, construction or home services"),
    answer("decision_authority","Partial — I can approve some of it"),
    answer("top_problems",select("Quotes and estimates","Website SEO and search visibility")),
    answer("first_priority","Quotes and estimates"),
  ];
  const ids=assessmentOrder(values);
  for(const required of ["company_name","team_size","website_url","decision_process","ops_scheduling","quote_process","lead_source","current_software"])assert.ok(ids.includes(required),required);
  assert.equal(ids[ids.indexOf("company_name")-1],"audience");
  assert.ok(ids.indexOf("top_problems")<ids.indexOf("ops_scheduling"));
  assert.ok(ids.length<=30);
  assert.equal(new Set(ids).size,ids.length);
});

test("sales and SEO branches ask different evidence-based questions",()=>{
  const sales=assessmentOrder([business,answer("top_problems",select("Sales follow-ups and outreach"))]);
  const seo=assessmentOrder([business,answer("top_problems",select("Website SEO and search visibility"))]);
  assert.ok(sales.includes("lead_source") && sales.includes("sales_pipeline_stage") && sales.includes("follow_up_process"));
  assert.ok(!sales.includes("marketing_channels"));
  assert.ok(seo.includes("marketing_channels")&&seo.includes("website_goal"));
  assert.ok(!seo.includes("follow_up_process"));
});

test("personal-only visitors are not asked for business credentials or company details",()=>{
  const ids=assessmentOrder([family,answer("top_problems",select("Family and sports travel"))]);
  for(const id of ["company_name","team_size","business_type","decision_authority","website_url","core_system"])assert.ok(!ids.includes(id),id);
  assert.ok(ids.includes("family_sources") && ids.includes("family_coordination") && ids.includes("travel_needs"));
  assert.ok(ids.length<=30);
});

test("combined audience remains within the request limit even with approver and travel branches",()=>{
  const ids=assessmentOrder([both,answer("business_type","Trades, construction or home services"),
    answer("decision_authority","Partial — approve some systems"),
    answer("top_problems",select("Family and sports travel","Quotes and estimates")),
    answer("first_priority","Family and sports travel")]);
  assert.ok(ids.includes("company_name")&&ids.includes("family_sources")&&ids.includes("travel_needs"));
  assert.ok(ids.length<=30,`too many intake questions: ${ids.length}`);
});

test("changing first priority prunes the obsolete follow-up branch",()=>{
  const answers=[business,answer("top_problems",select("Sales follow-ups and outreach","Content and marketing")),
    answer("first_priority","Sales follow-ups and outreach"),
    answer("lead_source","Customer referrals"),answer("marketing_channels",select("Google Search / Maps"))];
  const cleaned=applicableAnswers(answers);
  assert.ok(cleaned.some(x=>x.id==="lead_source"));
  assert.ok(!cleaned.some(x=>x.id==="marketing_channels"));
  const switched=applicableAnswers(answers.map(x=>x.id==="first_priority"?answer("first_priority","Content and marketing"):x));
  assert.ok(!switched.some(x=>x.id==="lead_source"));
  assert.ok(switched.some(x=>x.id==="marketing_channels"));
});

test("changing audience re-asks inappropriate problems and removes business answers",()=>{
  const answers=[family,answer("company_name","Example Co"),
    answer("top_problems",select("Find and research prospects")),
    answer("lead_source","Referrals")];
  const cleaned=applicableAnswers(answers);
  assert.ok(!cleaned.some(x=>["company_name","lead_source","top_problems"].includes(x.id)));
  assert.equal(assessmentStep(cleaned,"audience").questions[0]?.id,"top_problems");
});

test("navigation skips answered fields, presents one question and terminates correctly",()=>{
  const seed=[business,answer("contact_email","example@example.org"),answer("contact_name","Test Owner"),
    answer("company_name","Example Co")];
  const first=assessmentStep(seed,"company_name");
  assert.equal(first.questions[0]?.id,"business_type");
  const done=assessmentOrder(seed).map(id=>answer(id,id==="audience"?"My business":"(skipped)"));
  const complete=assessmentStep(done);
  assert.equal(complete.done,true);
  assert.equal(complete.questions.length,0);
  const q=assessmentQuestions([business,answer("top_problems",select("Content and marketing","Sales follow-ups and outreach"))]);
  assert.deepEqual(q.find(item=>item.id==="first_priority")?.options,["Content and marketing","Sales follow-ups and outreach"]);
});

test("changing the selected problems invalidates an obsolete first priority",()=>{
 const original=[business,answer("top_problems",select("Content and marketing","Sales follow-ups and outreach")),
   answer("first_priority","Quotes and estimates")];
 const cleaned=applicableAnswers(original);
 assert.ok(!cleaned.some(item=>item.id==="first_priority"));
 assert.equal(assessmentStep(cleaned,"top_problems").questions[0]?.id,"first_priority");
});

test("website requests get project discovery even in a trade business",()=>{
  const values=[business,answer("business_type","Trades"),answer("top_problems",select("Build or redesign a website"))];
  const ids=assessmentOrder(values);
  for(const id of ["website_url","website_current","website_features","project_requirements","budget_range","urgency"])assert.ok(ids.includes(id),id);
  for(const id of ["family_coordination","ops_scheduling","ai_tools_today","task_frequency"])assert.ok(!ids.includes(id),id);
  assert.equal(new Set(ids).size,ids.length);
});
test("personal learning, coordination and travel have distinct follow-ups",()=>{
  const ids=(goal:string)=>assessmentOrder([family,answer("top_problems",select(goal))]);
  assert.ok(!ids("Learn a tool or develop a skill").includes("family_coordination"));
  assert.ok(!ids("School and sports schedules").includes("travel_needs"));
  assert.ok(ids("Plan trips or events").includes("travel_needs"));
  const q=assessmentQuestions([family]).find(q=>q.id==="top_problems")!;
  assert.equal(q.category,"goals");
  assert.equal(q.allowOther,true);
  assert.ok(!q.options?.some(v=>/sports/i.test(v)));
});
test("a custom priority survives resume and a change of project removes stale website answers",()=>{
  const custom="Organize a photo archive";
  const rows=applicableAnswers([family,answer("top_problems",select(custom)),answer("website_features","Bookings")]);
  assert.ok(rows.some(a=>a.answer.includes(custom)));
  assert.ok(!rows.some(a=>a.id==="website_features"));
});


test("the operating guide starts with the selected priority and keeps unrelated examples out",async()=>{
  const {buildOperatingPlan}=await import("./lib/operatingPlan");
  const raw=JSON.stringify([both,answer("top_problems",select("Plan trips or events","Build or redesign a website")),answer("first_priority","Build or redesign a website")]);
  const plan=buildOperatingPlan(raw);
  assert.deepEqual(plan.workflows.map(w=>[w.name,w.realm]),[["Build or redesign a website","business"],["Plan trips or events","personal"]]);
  assert.ok(!plan.workflows.some(w=>w.id==="family-coordination"));
});
