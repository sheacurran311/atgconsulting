import { answerMap } from "./intakeAnswers";
import { transformationServiceFor } from "./transformationServices";

const services = [
  { name:"Brand identity", match:/logo|brand identity|refresh a brand/i, prompt:"Where will the design appear, and what should change about the current identity?", proposal:"Agree concepts, file formats, revision rounds, usage and sign-off.", kickoff:"Collect existing artwork, references and approved copy." },
  { name:"Website and workflow modernization", match:/combin.*website|website.*workflow/i, prompt:"What should happen between a website inquiry and your team's follow-up?", proposal:"Define each workstream and the end-to-end acceptance test.", kickoff:"Confirm site and CRM owners and prepare a test inquiry." },
  { name:"Sales, marketing and search", match:/seo|search visibility|sales|prospect|outreach|marketing|content/i, prompt:"Where do potential customers drop off, and which channel matters most?", proposal:"Agree audience, channel, deliverables, baseline and measurement window.", kickoff:"Confirm approved content, data sources and review responsibilities." },
  { name:"Websites", match:/website|web design|migration/i, prompt:"What should visitors be able to do? Include your current URL if you have one.", proposal:"Agree pages, conversion goals, content ownership, redirects and launch criteria.", kickoff:"Confirm hosting, domain access, assets and launch window." },
  { name:"Custom development", match:/custom app|connect systems|integration|mobile app/i, prompt:"Who will use the solution, and what should the first release let them do?", proposal:"Define the user journey, interfaces, exclusions and acceptance tests.", kickoff:"Confirm technical owners, sandbox access and test data." },
  { name:"Fractional technical support", match:/ongoing technical|fractional|technical support/i, prompt:"What ongoing responsibility would you like ATG to own?", proposal:"Agree coverage, cadence, escalation and response expectations.", kickoff:"Confirm system inventory, owners and escalation contacts." },
  { name:"Personal productivity", match:/personal|shared routines|school|family|learn a tool|plan trips|organize files|research options|my time/i, prompt:"What would you like to accomplish more easily? A recent example is helpful.", proposal:"Agree the first outcome, tools, privacy boundaries and training needs.", kickoff:"Choose a representative example and confirm who controls the setup." },
  { name:"Business automation", match:/schedul|quote|estimate|invoice|admin|reporting|automation|meeting|process/i, prompt:"What starts the task, who handles it, and where does it slow down?", proposal:"Agree inputs, outputs, volume, approval rules and an acceptance test.", kickoff:"Obtain a redacted example and confirm access and exception handling." },
  { name:"Open discovery", match:/$^/i, prompt:"What are you trying to change, and what would a useful first result look like?", proposal:"Decide whether the request is ready to quote or needs more discovery.", kickoff:"Confirm the agreed first deliverable, owner and dependencies." },
];

export function serviceFor(goal:string, audience:string) {
  const expanded = /^my personal|^personal$/i.test(audience) ? undefined : transformationServiceFor(goal);
  if (expanded) return { name: expanded.name, prompt: expanded.prompt, proposal: expanded.proposal, kickoff: expanded.kickoff };
  return services.find(service=>goal && service.match.test(goal)) ??
    services.find(service=>service.name===(/^my personal|^personal$/i.test(audience)?"Personal productivity":"Open discovery"))!;
}

export function firstCallPrep(raw:string, confirmed:Record<string,string> = {}) {
  const a=answerMap(raw);
  const supplied=(value:string|undefined)=>Boolean(value?.trim()&&!/^\(skipped\)$|^not sure(?: yet)?$|^unsure$/i.test(value.trim()));
  const goals=(a.top_problems||"").split(/[;\n]/).map(s=>s.trim()).filter(supplied);
  const priority=goals.includes(a.first_priority)?a.first_priority:goals[0]||"";
  const tracks=[...new Map([priority,...goals].map(goal=>serviceFor(goal,a.audience||"")).map(track=>[track.name,track])).values()];
  const known=Object.entries(a).filter(([key,value])=>!["contact_email","contact_name","audience","top_problems","first_priority"].includes(key)&&supplied(value)).map(([id,value])=>({id,value}));
  const practiceWebsite = /medical practice|orthopedic|dental practice/i.test(a.business_type || "") &&
    tracks.some(track => track.name === "Websites" || track.name === "Website and workflow modernization");
  const questions: Array<[string,string]>=[
    ["priority",priority?"Confirm the first priority and what can wait.":"Identify the first priority."],
    ["workflowExample",practiceWebsite ? "Walk through how a recent new patient found the practice and booked a first visit. Where do people get stuck? Would a callback request, appointment request or existing scheduling portal help? Agree what staff need before responding, who follows up, by when, and what the patient sees next." : Object.entries(a).some(([id,v])=>id.startsWith("meeting_context_")&&supplied(v))?"Walk through the prospect’s example and identify the main constraint.":tracks[0]!.prompt],
    ["decisionMaker","Identify who can approve the work."],
    ["budget",supplied(a.budget_range)?"Confirm whether the stated budget fits the first deliverable.":"Establish a workable budget range."],
    ["timing",supplied(a.urgency)?"Confirm the target date and what drives it.":"Establish timing and any hard deadline."],
    ["successMetric","Agree how the prospect will judge success."],["nextStep","Record the next action, owner and date."],
  ];
  return {priority,otherGoals:goals.filter(g=>g!==priority),known,open:questions.filter(([key])=>!supplied(confirmed[key])).map(([,q])=>q),
    tracks:tracks.map(({name,proposal,kickoff})=>({name,proposal,kickoff}))};
}
