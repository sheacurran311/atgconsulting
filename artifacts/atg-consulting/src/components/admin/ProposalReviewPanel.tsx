import { useEffect,useState } from "react";
import { adminJson } from "@/lib/adminWork";

export interface EditableProposal {
  id:string;status:string;updatedAt:string;reviewSummary:string;
  execSummary:string;understanding:string;scope:string;howWeConnect:string;
  milestones:string;investment:string;acceptanceClause:string;
  fitCallRevision:number|null;deliveryPlanJson?:string;
}
const fields=[
  ["reviewSummary","Internal review only (not shared)"],
  ["execSummary","Executive summary"],
  ["understanding","Confirmed client situation"],
  ["scope","Scope, deliverables, dependencies and exclusions"],
  ["howWeConnect","Customer-owned integrations and access boundaries"],
  ["milestones","Milestones JSON: [{label,description}]"],
  ["investment","Pricing JSON: tier, price, care, notes"],
  ["acceptanceClause","Acceptance clause and sign-off"],
] as const;
export default function ProposalReviewPanel({intakeId,proposal,onSaved}:{
 intakeId:string;proposal:EditableProposal;onSaved:(value:EditableProposal)=>void;
}){
 const [editing,setEditing]=useState(false);
 const [form,setForm]=useState<EditableProposal>(proposal);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{setForm(proposal);setEditing(false);setError("");setNotice("");},[proposal.id,proposal.updatedAt]);
 async function save(){
  if(busy||proposal.status!=="draft")return;
  try{
   const milestones:unknown=JSON.parse(form.milestones);
   const price:unknown=JSON.parse(form.investment);
   if(!Array.isArray(milestones)||milestones.length===0||milestones.some(x=>!x||typeof x!=="object"||
      typeof x.label!=="string"||typeof x.description!=="string"))
    throw new Error("Milestones must be a nonempty JSON array of {label, description}.");
   if(!price||typeof price!=="object"||Array.isArray(price))throw new Error("Investment must be a JSON object.");
  }catch(e){setError(e instanceof Error?e.message:"Invalid proposal JSON.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   const changes=Object.fromEntries(fields.map(([k])=>[k,form[k]]));
   const updated=await adminJson<EditableProposal>(`/api/admin/discovery/${intakeId}/proposal`,{
    method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({...changes,expectedUpdatedAt:proposal.updatedAt}),
   });
   onSaved(updated);setForm(updated);setEditing(false);setNotice("Draft saved. Review before approving or sharing.");
  }catch(e){setError(e instanceof Error?e.message:"Could not save proposal.");}
  finally{setBusy(false);}
 }
 return <section className="rounded-xl border border-canvas-border p-4 space-y-3" aria-label="Proposal scope review">
  <div className="flex flex-wrap justify-between items-center gap-2">
   <div><h3 className="font-bold">Proposal Scope & Investment Review</h3>
    <p className="text-xs opacity-70">Fit-call revision: {proposal.fitCallRevision??"Not recorded"}. Client delivery requires separate approval.</p></div>
   {proposal.status==="draft"&&<button type="button" className="btn-secondary px-3 py-2 text-xs"
    onClick={()=>{setForm(proposal);setEditing(v=>!v);setError("");}}> {editing?"Cancel edits":"Edit proposal draft"} </button>}
  </div>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  {notice&&<p role="status" className="text-sm text-green-700">{notice}</p>}
  {editing?<div className="space-y-3">{fields.map(([key,label])=><label key={key} className="block text-xs font-semibold">
   {label}<textarea value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
    className="field-input mt-1 w-full text-sm" rows={key==="scope"||key==="milestones"?5:3} disabled={busy}/>
  </label>)}
   <button type="button" className="btn-primary px-3 py-2 text-sm" disabled={busy} onClick={()=>void save()}>
    {busy?"Saving…":"Save reviewed draft"}
   </button>
  </div>:<p className="text-xs opacity-70">{proposal.status==="draft"?
    "Review the existing proposal above, then edit scope and pricing here before final approval.":
    "Approved proposal is locked. Future changes require a new intake and proposal revision."}</p>}
 </section>;
}
