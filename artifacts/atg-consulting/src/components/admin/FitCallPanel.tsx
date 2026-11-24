import { useEffect, useState } from "react";
import { adminJson } from "@/lib/adminWork";

type FitCallAnswers={
  priority:string;workflowExample:string;currentSystems:string;baseline:string;
  processOwner:string;decisionMaker:string;budget:string;timing:string;pilot:string;
  successMetric:string;boundaries:string;clientDependencies:string;exclusions:string;nextStep:string;
};
type FitCall={
  intakeId:string;status:"draft"|"completed";revision:number;answers:FitCallAnswers;completedAt:string|null;
  agenda:{prep:{priority:string;otherGoals:string[];known:{id:string;value:string}[];open:string[];tracks:{name:string;proposal:string;kickoff:string}[]};stages:Array<{minutes:string;title:string;outcome:string;questions:string[]}>;missingInformation:string[]};
};
const sections:Array<{name:string;fields:Array<{key:keyof FitCallAnswers;label:string;hint?:string}>}>=[
 {name:"0–3 minutes | Confirm the outcome",fields:[
  {key:"priority",label:"Confirmed first priority"},
  {key:"processOwner",label:"Process owner"},
 ]},
 {name:"3–10 minutes | Map the workflow",fields:[
  {key:"workflowExample",label:"Current situation, example or project brief",hint:"Use redacted examples. Do not paste client secrets."},
  {key:"currentSystems",label:"Tools and source-of-truth systems"},
  {key:"baseline",label:"Current frequency, time or cost baseline"},
 ]},
 {name:"10–15 minutes | Feasibility and decision rights",fields:[
  {key:"decisionMaker",label:"Who can approve the work?"},
  {key:"budget",label:"Budget and payment constraints"},
  {key:"timing",label:"Target timing"},
  {key:"boundaries",label:"Data boundaries and approval requirements"},
 ]},
 {name:"15–20 minutes | Pilot and next action",fields:[
  {key:"pilot",label:"Agreed first deliverable or pilot"},
  {key:"successMetric",label:"Measurable acceptance criterion"},
  {key:"clientDependencies",label:"Client responsibilities and dependencies"},
  {key:"exclusions",label:"Explicit exclusions"},
  {key:"nextStep",label:"Next action, owner and target date"},
 ]},
];
const required=new Set<keyof FitCallAnswers>(["priority","workflowExample","decisionMaker","pilot","successMetric","nextStep"]);
export default function FitCallPanel({intakeId,onCompleted,onRecordChange}:{intakeId:string;onCompleted?:()=>void;onRecordChange?:(value:{completed:boolean;revision:number})=>void}){
 const [record,setRecord]=useState<FitCall|null>(null);
 const [answers,setAnswers]=useState<FitCallAnswers|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;setRecord(null);setAnswers(null);setLoading(true);setError("");setNotice("");
  void adminJson<FitCall>(`/api/admin/discovery/${intakeId}/fit-call`)
    .then(r=>{if(active){setRecord(r);setAnswers(r.answers);onRecordChange?.({completed:r.status==="completed",revision:r.revision});}})
    .catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not read fit call.");})
    .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[intakeId]);
 async function save(status:"draft"|"completed"){
  if(!record||!answers||busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const updated=await adminJson<Pick<FitCall,"agenda"|"status"|"revision"|"answers"|"completedAt">>(
    `/api/admin/discovery/${intakeId}/fit-call`,{
     method:"PUT",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({expectedRevision:record.revision,status,answers}),
   });
   setRecord({...record,...updated});setAnswers(updated.answers);
   onRecordChange?.({completed:updated.status==="completed",revision:updated.revision});
   setNotice(status==="completed"?"Fit call completed and locked. Proposal drafts can now use these facts.":"Draft saved privately.");
   if(status==="completed")onCompleted?.();
  }catch(e){setError(e instanceof Error?e.message:"Could not save the fit call.");}
  finally{setBusy(false);}
 }
 if(loading)return <section className="rounded-xl border border-canvas-border p-4"><p className="text-sm">Loading the 20-minute consultation worksheet…</p></section>;
 return <section className="rounded-xl border border-canvas-border p-4 sm:p-5 space-y-4" aria-label="Structured fit-call worksheet">
  <div><h3 className="text-lg font-bold">20-minute Fit Call | Structured Outcomes</h3>
   <p className="text-sm opacity-70">Review the prospect’s answers before the meeting. Record what you confirm during the call.</p></div>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  {notice&&<p role="status" className="text-sm text-green-700">{notice}</p>}
  {record&&answers&&<>
   <div className="text-xs opacity-70">Status: {record.status}. Revision {record.revision}.
    {record.completedAt&&` Completed ${new Date(record.completedAt).toLocaleString()}.`}</div>
   <section className="rounded border border-canvas-border p-4 space-y-3" aria-label="First-call playbook">
    <h4 className="font-bold">First-call playbook</h4>
    <p><strong>First priority</strong> {record.agenda.prep.priority || "Identify together on the call"}</p>
    {!!record.agenda.prep.otherGoals.length && <p>Also requested: {record.agenda.prep.otherGoals.join("; ")}</p>}
    <h5 className="font-semibold">What the prospect told us</h5>
    <dl>{record.agenda.prep.known.map(row=><div key={row.id}><dt className="text-xs font-bold">{row.id.startsWith("meeting_context_")?"Project context":row.id.replaceAll("_"," ")}</dt><dd className="text-sm">{row.value}</dd></div>)}</dl>
    <h5 className="font-semibold">Open questions for this call</h5>
    {record.agenda.prep.open.length ? <ul className="list-disc pl-5">{record.agenda.prep.open.map(q=><li key={q}>{q}</li>)}</ul> : <p>All first-call topics have recorded answers.</p>}
    {record.agenda.prep.tracks.map(track=><div key={track.name} className="border-t pt-2"><h5 className="font-semibold">{track.name}</h5>
      <p className="text-sm"><strong>Before quoting</strong> {track.proposal}</p>
      <p className="text-sm"><strong>At kickoff</strong> {track.kickoff}</p></div>)}
   </section>
   <details className="rounded border border-canvas-border p-3">
    <summary className="font-semibold text-sm cursor-pointer">Client-specific consultation agenda</summary>
    <div className="mt-3 space-y-3">{record.agenda.stages.map((stage,i)=>
      <div key={i}><p className="text-xs font-bold">{stage.minutes}: {stage.title}</p>
       <p className="text-xs opacity-70">{stage.outcome}</p>
       <ul className="list-disc pl-5 text-xs">{stage.questions.map((question,j)=><li key={j}>{question}</li>)}</ul>
      </div>)}</div>
   </details>
   {sections.map(section=><fieldset key={section.name} className="space-y-2 border-t border-canvas-border pt-3">
    <legend className="text-sm font-semibold">{section.name}</legend>
    {section.fields.map(field=><label key={field.key} className="block text-xs font-medium">
     {field.label}{required.has(field.key)?" *":""}
     <textarea className="field-input w-full mt-1 text-sm" rows={field.key==="workflowExample"||field.key==="pilot"?3:2}
      disabled={record.status==="completed"||busy}
      value={answers[field.key]}
      onChange={e=>setAnswers(current=>current?{...current,[field.key]:e.target.value}:current)}
      placeholder={field.hint??""}/>
    </label>)}
   </fieldset>)}
   <p className="text-xs opacity-70">Fields marked * are required to complete. Leave unknown facts blank rather than estimating. Completion records a reviewed revision. You can reopen before proposal approval; approved commercial scope requires a new assessment.</p>
   {record.status==="completed"&&<button type="button" className="btn-secondary px-3 py-2 text-sm" disabled={busy}
    onClick={()=>void save("draft")}>{busy?"Saving…":"Reopen draft for correction"}</button>}
   {record.status!=="completed"&&<div className="flex flex-wrap gap-2">
    <button className="btn-secondary px-3 py-2 text-sm" disabled={busy} onClick={()=>void save("draft")}>{busy?"Saving…":"Save private draft"}</button>
    <button className="btn-primary px-3 py-2 text-sm" disabled={busy||[...required].some(k=>!answers[k].trim())}
      onClick={()=>void save("completed")}>{busy?"Saving…":"Complete fit call"}</button>
   </div>}
  </>}
 </section>;
}
