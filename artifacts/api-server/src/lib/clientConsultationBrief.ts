import { firstCallPrep } from "./firstCallPrep";
import { transformationServiceFor } from "./transformationServices";
import { candidatesForGoal } from "./serviceWorkflowLinks";
import { personalGoal, projectFocus } from "./assessmentProfile";
/**
 * Reusable consultant briefing compiled from a consented ATG intake.
 * Read-only: does not generate client-visible output, alter milestones, send
 * communications, or imply a platform was connected.
 */
import { answerMap } from "./intakeAnswers";
import { atgBusinessSkills } from "./businessSkillRegistry";

export interface ConsultationStage {
  minutes: string;
  title: string;
  outcome: string;
  questions: string[];
}
export interface GuidedSessionBrief {
  session: number;
  title: string;
  objective: string;
  prerequisites: string[];
  acceptance: string;
}
export interface ClientConsultationBrief {
  audience: "business" | "personal" | "both";
  organization: string | null;
  primaryPriority: string;
  knownContext: Array<{ label: string; value: string }>;
  missingInformation: string[];
  fitCall: ConsultationStage[];
  guidedSessions: GuidedSessionBrief[];
  recommendedSkills: Array<{ id: string; title: string; purpose: string }>;
  transformationCandidates?: NonNullable<ReturnType<typeof candidatesForGoal>>[];
  note: string;
}
function problems(raw:string):string[]{
  if(!raw.trim())return [];
  try{const value:unknown=JSON.parse(raw);if(Array.isArray(value))return value.filter((s):s is string=>typeof s==="string").slice(0,10);}
  catch{/* Historical text answers. */}
  return raw.split(/[;\n]/).map(s=>s.trim()).filter(Boolean).slice(0,10);
}
function text(value:string|undefined):string|undefined{
  return value&&value.trim()&&value!=="(skipped)"?value.trim():undefined;
}
export function buildConsultationBrief(rawAnswers:string|null|undefined, guidedSessionCount=3):ClientConsultationBrief {
  const answers=answerMap(rawAnswers);
  const prep=firstCallPrep(rawAnswers??"");
  const audience=answers.audience?.toLowerCase().includes("both")?"both":/personal|family/i.test(answers.audience??"")?"personal":"business";
  const business=audience!=="personal";
  const priorities=problems(answers.top_problems??"");
  const priority=(text(answers.first_priority)&&priorities.includes(answers.first_priority))?answers.first_priority:priorities[0]??"Priority not selected";
  const industry=text(answers.business_type)??"Business type not provided";
  const trades=/trade|construction|home service|plumb|electri|landscap|roof|clean/i.test(industry);
  const focusSales=/sales|lead|prospect|quote|estimate|outreach|follow.up/i.test(priority);
  const focusMarketing=/marketing|content|website|seo|search|social/i.test(priority);
  const focusOps=/admin|operat|schedul|book|customer request/i.test(priority);
  const personalFocus = audience === 'personal' || (audience === 'both' && personalGoal(priority));
  const project = !personalFocus ? projectFocus(priority) : null;
  const expanded = !personalFocus ? transformationServiceFor(priority) : undefined;
  const context:ClientConsultationBrief["knownContext"]=[];
  for(const [label,key] of [
    ["Business", "company_name"],["Business type","business_type"],["Team size","team_size"],
    ["Business website","website_url"],["Project outcome","project_requirements"],["Existing site and migration constraints","website_current"],["Launch requirements","website_features"],["Ongoing support scope","support_scope"],["Current software","current_software"],
    ["AI platform experience","ai_tools_today"],["Current workload frequency","task_frequency"],
    ["Time per task","time_per_task"],["Decision authority","decision_authority"],
    ["Desired results","success_definition"],["Budget range","budget_range"],
  ]) {
    const value=text(answers[key]);
    if(value && (business || !["Business","Business type","Team size","Business website","Decision authority"].includes(label)))context.push({label,value});
  }
  const submittedContext=prep.known.find(row=>row.id.startsWith("meeting_context_"));
  if(submittedContext)context.push({label:"Prospect's project brief",value:submittedContext.value});
  const missing:string[]=[];
  if(business&&!text(answers.company_name))missing.push("Confirm the business or operating entity.");
  if(business&&!text(answers.team_size))missing.push("Confirm team size and who handles the workflow today.");
  if((!project || project==="combined")&&!text(answers.workflow_example))missing.push("Walk through one real, redacted example from trigger to result.");
  if((!project || project==="combined")&&!text(answers.time_per_task))missing.push("Establish the time baseline for one workflow cycle.");
  if(business&&project!=="website"&&!text(answers.current_software)&&!text(answers.core_system))missing.push("Confirm actual software and source-of-truth systems.");
  if(!text(answers.success_definition))missing.push("Agree a measurable 30- or 90-day success criterion.");
  if(business&&!text(answers.decision_authority))missing.push("Identify the person authorized to approve the pilot.");
  if(!text(answers.data_boundaries))missing.push("Document data exclusions and approval boundaries.");
  const targeted = expanded ? [expanded.prompt, expanded.proposal, expanded.kickoff] : prep.tracks[0]?.name==="Logo and brand identity" ? [
    "Who should the identity reach, and where will the logo appear?",
    "Which existing assets or visual references should guide the design?",
    "Who approves concepts and final artwork?",
  ] : project==="website" || project==="combined" ? [
    "Which pages, brand assets and visitor actions need approval for launch?",
    "Who owns the domain, hosting and content, and which URLs or integrations must be preserved?",
    project==="combined" ? "What should happen after a visitor submits an inquiry, and who owns that handoff?" : "What evidence will confirm the launch meets the agreed scope?",
  ] : project==="development" || project==="support" ? [
    "What should the first release or support engagement accomplish?",
    "Which existing systems, access permissions and owners affect delivery?",
    "Who will accept the work, and what evidence will they review?",
  ] : personalFocus ? [
    "Walk me through the last time you tried to do this. Where did it get difficult?",
    "What would you like to keep doing yourself, and where would help be valuable?",
    "What would a successful first attempt look like for you?",
  ] : trades?[
    "Where do incoming requests arrive, and how are calls, quotes and appointments assigned?",
    "What is your typical turnaround from inquiry to estimate and estimate to booking?",
    "Who can approve a proposed follow-up and verify a successful job booking?",
  ]:focusSales?[
    "Which lead sources produce qualified opportunities, and what is your monthly inquiry volume?",
    "At which stage do prospects stall or fail to receive timely follow-up?",
    "Where is the authoritative lead register or CRM, and what is an acceptable first-response time?",
  ]:focusMarketing?[
    "Which search queries, landing pages, or channels are commercially important?",
    "What action should a qualified website visitor take?",
    "What existing evidence is available, and is read-only GSC/GA4 access appropriate for paid SEO work?",
  ]:focusOps?[
    "What starts the work and which step requires the most manual intervention?",
    "Where do handoffs, approvals, or missed deadlines create rework?",
    "How will the customer verify that the workflow completed correctly?",
  ]:[
    "Which specific recurring task should we address first, and why?",
    "What source data and destination are involved?",
    "What would a safe redacted first test look like?",
  ];
  const fitCall:ConsultationStage[]=[
    {minutes:"0–3",title:"Confirm outcomes",outcome:"Agree the highest-value problem to explore",questions:[
      `Is ${priority.toLowerCase()} still the first priority?`,
      business?`Who owns this process at ${text(answers.company_name)??"the business"}?`:"Who will own this process after setup?",
    ]},
    {minutes:"3–10",title:"Explore the priority and current situation",outcome:"Understand the current process and evidence",questions:[
      ...targeted.slice(0,2),
      "Can you show or describe a recent example without sharing confidential records?",
    ]},
    {minutes:"10–15",title:"Check feasibility and authority",outcome:"Identify systems, owner, permissions and budget",questions:[
      "Which tools and existing customer-owned accounts would be used?",
      "Who authorizes spending, external actions and access to sensitive data?",
      ...missing.slice(0,2),
    ]},
    {minutes:"15–20",title:"Choose a pilot and next step",outcome:"Agree a verifiable first deliverable and decision",questions:[
      "What measurable result would make a pilot worth continuing?",
      "Would you prefer to build alongside ATG or delegate implementation?",
      "Who owns the next action and when should it happen?",
    ]},
  ];
  const n=guidedSessionCount===5?5:3;
  const stages=n===5?[
    ["Scope the pilot","Confirm current workflow, baseline, systems, permissions, and signed acceptance criteria.","Client example and decision owner","Written pilot scope and baseline are accepted."],
    ["Configure in native accounts","Build the first approved workflow and document exact configuration.","Customer-owned access and approved plan","One redacted case runs correctly in the chosen platform."],
    ["Test edge cases","Test normal, duplicate, missing-source, failure, and revoked-access scenarios.","Working example and test inputs","Failures are contained and recovery actions documented."],
    ["Tune and train","Compare outcomes to baseline; improve controls and teach the owner.","Recorded pilot outcomes","Owner can explain, inspect and pause the workflow."],
    ["Handoff and monitoring","Publish approved guide, capture acceptance, and agree ongoing review scope.","Test evidence and final walkthrough","Customer signs off on documented acceptance and handoff."],
  ]:[
    ["Scope and build the first example","Confirm business baseline, choose a safe pilot and configure a redacted run.","Decision owner, example and customer-owned accounts","First sample result passes a reviewed acceptance test."],
    ["Validate and refine","Test failure cases, approvals and operational reliability.","Initial working example and selected edge cases","The client can repeat the tested workflow and inspect failures."],
    ["Train and hand off","Verify results, document recovery and confirm the ongoing ownership model.","Evidence, responsible owner and final operating guide","Client approves the implementation and can pause or recover it."],
  ];
  const guidedSessions=stages.map((r,i):GuidedSessionBrief=>({
    session:i+1,title:r[0],objective:r[1],
    prerequisites:[r[2],...(i===0?targeted.slice(2,3):[])],
    acceptance:r[3],
  }));
  const skillIds=focusSales||trades?["customer-research","sales-enablement","revops"]:focusMarketing?["customer-research","seo-audit","marketing-plan","cro"]:focusOps?["customer-research","marketing-loops","onboarding"]:["customer-research","marketing-plan","onboarding"];
  return {audience,organization:business?text(answers.company_name)??null:null,primaryPriority:priority,knownContext:context,
    missingInformation:missing.slice(0,8),fitCall,guidedSessions,
    recommendedSkills:personalFocus ? [] : atgBusinessSkills.filter(s=>skillIds.includes(s.id)).map(s=>({id:s.id,title:s.title,purpose:s.description})),
    ...(business ? {transformationCandidates: [...new Set([priority,...priorities])].flatMap(goal=>{const candidate=candidatesForGoal(goal); return candidate ? [candidate] : [];})} : {}),
    note:"Internal preparation only. Review all findings against the current client record. Do not send, publish, mark milestones complete, or claim a customer platform is connected.",
  };
}
