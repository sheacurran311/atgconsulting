import { z } from "zod";
import { governanceReview } from "./businessContext";
import { workflowCandidates } from "./serviceWorkflowLinks";
import { transformationServices } from "./transformationServices";

const score=z.number().int().min(0).max(4);
const dimension=z.object({score:score.nullable(),evidence:z.string().trim().max(1000)}).strict().refine(d=>d.score===null||d.evidence.length>0,"Scored dimensions require evidence");
export const readinessKeys=["infrastructure","data","process","adoption","governance","team"] as const;
export const ReadinessSchema=z.object({infrastructure:dimension,data:dimension,process:dimension,adoption:dimension,governance:dimension,team:dimension}).strict();
export function readiness(input:unknown){
 const d=ReadinessSchema.parse(input);const known=readinessKeys.flatMap(k=>d[k].score===null?[]:[d[k].score!]);
 return {score:known.length===6?Math.round(known.reduce((a,b)=>a+b,0)/24*100):null,coverage:known.length,total:6,missing:readinessKeys.filter(k=>d[k].score===null)};
}
export const weights={impact:30,roi:25,feasibility:20,urgency:15,confidence:10} as const;
export const OpportunitySchema=z.object({serviceId:z.string().refine(id=>transformationServices.some(s=>s.id===id)),impact:dimension,roi:dimension,feasibility:dimension,urgency:dimension,confidence:dimension}).strict();
export function opportunity(input:unknown,context:unknown,clientId:string){
 const d=OpportunitySchema.parse(input);
 const keys=Object.keys(weights) as (keyof typeof weights)[];
 const missing=keys.filter(k=>d[k].score===null);
 const value=missing.length?null:Math.round(keys.reduce((sum,k)=>sum+weights[k]*d[k].score!/4,0));
 const gate=governanceReview(context,clientId,d.serviceId);
 const priority=gate.status==="blocked"?"blocked":gate.status==="review"||value===null?"discovery":value>=80?"priority":value>=60?"recommended":value>=40?"discovery":"deprioritize";
 return {score:value,priority,missing,gate,candidates:workflowCandidates(d.serviceId)};
}
const money=z.number().int().min(0).max(1000000000);
const hours=z.number().min(0).max(10000);
const pct=z.number().min(0).max(100);
export const RoiSchema=z.object({weeklyHours:hours,hourlyCostCents:money,reductionPercent:pct,realizablePercent:pct,setupCents:money,monthlyCostCents:money}).strict();
export function roi(input:unknown){
 const d=RoiSchema.parse(input);
 const monthlyHours=d.weeklyHours*d.reductionPercent/100*52/12;
 const capacity=Math.round(monthlyHours*d.hourlyCostCents);
 const cash=Math.round(capacity*d.realizablePercent/100);
 const net=cash-d.monthlyCostCents;
 return {monthlyHours,monthlyCapacityCents:capacity,monthlyCashScenarioCents:cash,monthlyNetCashScenarioCents:net,firstYearNetCashScenarioCents:12*net-d.setupCents,paybackMonths:net>0?d.setupCents/net:null,firstYearRoiPercent:d.setupCents>0?(12*net-d.setupCents)/d.setupCents*100:null};
}
export const EstimateSchema=z.object({implementationHours:hours,testingHours:hours,trainingHours:hours,advisoryHours:hours,supportHours:hours,monitoringHours:hours,internalHourlyCents:money,setupDirectCents:money,monthlyDirectCents:money,monthlyReserveCents:money,contingencyPercent:pct,marginPercent:z.number().min(0).max(90)}).strict();
export function estimate(input:unknown){
 const d=EstimateSchema.parse(input);
 const setupHours=d.implementationHours+d.testingHours+d.trainingHours;
 const monthlyHours=d.advisoryHours+d.supportHours+d.monitoringHours;
 const setupCost=Math.ceil((setupHours*d.internalHourlyCents+d.setupDirectCents)*(1+d.contingencyPercent/100));
 const monthlyCost=Math.ceil((monthlyHours*d.internalHourlyCents+d.monthlyDirectCents+d.monthlyReserveCents)*(1+d.contingencyPercent/100));
 const quote=(c:number)=>Math.ceil(c/(1-d.marginPercent/100)/2500)*2500;
 return {setupHours,monthlyHours,setupCostCents:setupCost,monthlyCostCents:monthlyCost,indicativeSetupCents:quote(setupCost),indicativeMonthlyCents:quote(monthlyCost),binding:false as const};
}
export const IntelligenceSchema=z.object({readiness:ReadinessSchema,opportunity:OpportunitySchema,roi:RoiSchema,estimate:EstimateSchema}).strict();
export function evaluateIntelligence(input:unknown,context:unknown,clientId:string){
 const d=IntelligenceSchema.parse(input);
 return {readiness:readiness(d.readiness),opportunity:opportunity(d.opportunity,context,clientId),roi:roi(d.roi),estimate:estimate(d.estimate)};
}
