import { z } from "zod";
import { transformationServices } from "./transformationServices";

const label=z.string().trim().min(1).max(200);
const state=z.enum(["unknown","confirmed","blocked"]);
const source=z.object({label,owner:label,classification:z.enum(["public","internal","confidential","restricted"]),authorization:state}).strict();
export const BusinessContextSchema=z.object({
  clientId:label, version:z.number().int().positive(),
  objectives:z.array(label).max(20), systems:z.array(label).max(30),
  sources:z.array(source).max(30),
  decisionOwner:label.nullable(),
  accessReview:state, dataReview:state, humanOversight:state,
  regulatedReview:z.enum(["unknown","not-applicable","confirmed","blocked"]),
}).strict();
export type BusinessContextProfile=z.infer<typeof BusinessContextSchema>;
/** Draft metadata only. No credential fields, raw documents or inferred authorization. */
export function emptyBusinessContext(clientId:string):BusinessContextProfile {
  return BusinessContextSchema.parse({clientId,version:1,objectives:[],systems:[],sources:[],decisionOwner:null,accessReview:"unknown",dataReview:"unknown",humanOversight:"unknown",regulatedReview:"unknown"});
}
/** Caller must derive expectedClientId from authenticated server context, never a request body. */
export function governanceReview(input:unknown,expectedClientId:string,serviceId:string,pilotVerified=false) {
  const parsed=BusinessContextSchema.safeParse(input);
  if(!parsed.success||parsed.data.clientId!==expectedClientId||!transformationServices.some(s=>s.id===serviceId))return {status:"blocked" as const,reasons:["Invalid or mismatched context or service."]};
  const p=parsed.data;
  const blocked:string[]=[],review:string[]=[];
  for(const [name,value] of Object.entries({access:p.accessReview,data:p.dataReview,oversight:p.humanOversight,regulated:p.regulatedReview})){
    if(value==="blocked")blocked.push(name+" review blocked");
    if(value==="unknown")review.push(name+" review required");
  }
  if(!p.decisionOwner)review.push("Confirm decision owner");
  for(const s of p.sources){
    if(s.authorization==="blocked")blocked.push("Source authorization blocked");
    if(s.authorization==="unknown")review.push("Source authorization required");
    if(s.classification==="restricted")review.push("Restricted source requires separate approved architecture; exclude from ordinary execution");
  }
  if(serviceId==="voice-ai"&&!pilotVerified)review.push("Inbound voice pilot evidence required");
  return blocked.length?{status:"blocked" as const,reasons:[...blocked,...review]}:review.length?{status:"review" as const,reasons:review}:{status:"cleared" as const,reasons:[]};
}
