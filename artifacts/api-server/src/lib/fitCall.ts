import { firstCallPrep } from "./firstCallPrep";
import { z } from "zod";
import { buildConsultationBrief } from "./clientConsultationBrief";

/** Operator-entered facts from a 20-minute discovery call. Never client-visible by default. */
export const FitCallAnswers = z.object({
  priority:z.string().trim().max(1000).default(""),
  workflowExample:z.string().trim().max(4000).default(""),
  currentSystems:z.string().trim().max(2000).default(""),
  baseline:z.string().trim().max(1000).default(""),
  processOwner:z.string().trim().max(500).default(""),
  decisionMaker:z.string().trim().max(500).default(""),
  budget:z.string().trim().max(500).default(""),
  timing:z.string().trim().max(500).default(""),
  pilot:z.string().trim().max(2000).default(""),
  successMetric:z.string().trim().max(1500).default(""),
  boundaries:z.string().trim().max(2000).default(""),
  clientDependencies:z.string().trim().max(2000).default(""),
  exclusions:z.string().trim().max(2000).default(""),
  nextStep:z.string().trim().max(1500).default(""),
}).strict();
export type FitCallAnswersType=z.infer<typeof FitCallAnswers>;
export const FitCallSave= z.object({
  expectedRevision:z.number().int().min(0),
  status:z.enum(["draft","completed"]),
  answers:FitCallAnswers,
}).strict();

export const fitCallFields=[
  {key:"priority",label:"Confirmed first priority",stage:"0–3 min"},
  {key:"workflowExample",label:"Real workflow example, trigger to result",stage:"3–10 min"},
  {key:"currentSystems",label:"Current tools and authoritative system",stage:"3–10 min"},
  {key:"baseline",label:"Current volume, time or cost baseline",stage:"3–10 min"},
  {key:"processOwner",label:"Owner of the process",stage:"10–15 min"},
  {key:"decisionMaker",label:"Authorized decision-maker",stage:"10–15 min"},
  {key:"budget",label:"Budget range or decision constraint",stage:"10–15 min"},
  {key:"timing",label:"Target timing",stage:"10–15 min"},
  {key:"pilot",label:"Agreed first pilot",stage:"15–20 min"},
  {key:"successMetric",label:"Measurable pilot acceptance criterion",stage:"15–20 min"},
  {key:"boundaries",label:"Data, access and approval boundaries",stage:"10–15 min"},
  {key:"clientDependencies",label:"Client-provided systems and resources",stage:"15–20 min"},
  {key:"exclusions",label:"Work explicitly out of scope",stage:"15–20 min"},
  {key:"nextStep",label:"Agreed owner, decision and next action",stage:"15–20 min"},
] as const;
export function fitCallMissing(answers:FitCallAnswersType):string[]{
  const required=["priority","workflowExample","decisionMaker","pilot","successMetric","nextStep"] as const;
  return required.filter(key=>!answers[key].trim());
}
export function parseFitCallAnswers(raw:string|undefined|null):FitCallAnswersType{
  try{return FitCallAnswers.parse(JSON.parse(raw||"{}"));}
  catch{return FitCallAnswers.parse({});}
}
export function fitCallPromptContext(answers:FitCallAnswersType):string {
  return fitCallFields.filter(field=>answers[field.key].trim())
    .map(field=>`${field.label}: ${answers[field.key]}`).join("\n");
}
export function fitCallAgenda(rawIntakeAnswers:string, confirmed: Record<string,string> = {}) {
  const brief=buildConsultationBrief(rawIntakeAnswers);
  return {stages:brief.fitCall,missingInformation:brief.missingInformation,prep:firstCallPrep(rawIntakeAnswers,confirmed)};
}
const milestoneText = z.string().refine(value => value.trim().length > 0);
const reviewedMilestones = z.array(z.object({
  label: milestoneText,
  description: milestoneText,
}));

/** Delivery preview is internal, derived from exact proposal milestones, not arbitrary AI tasks. */
export function proposalDeliveryPlan(milestonesRaw:string,scope:string,fitCall:FitCallAnswersType){
  let milestones: z.infer<typeof reviewedMilestones> = [];
  try {
    const result = reviewedMilestones.safeParse(JSON.parse(milestonesRaw));
    if (result.success) milestones = result.data;
  } catch {
    // Approval requires at least one milestone. Invalid JSON stays editable as a draft.
  }
  return {
    source:"approved_proposal",
    firstPilot:fitCall.pilot,
    acceptanceCriterion:fitCall.successMetric,
    clientDependencies:fitCall.clientDependencies,
    exclusions:fitCall.exclusions,
    scope,
    milestones:milestones.map((item,index)=>({
      sequence:index+1,title:item.label,deliverable:item.description,
      owner:"ATG + client",status:"not_started" as const,acceptance:"Pending consultant confirmation",
    })),
  };
}
