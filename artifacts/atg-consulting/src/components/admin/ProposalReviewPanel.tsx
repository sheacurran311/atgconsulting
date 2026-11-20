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
  ["acceptanceClause","Acceptance clause and sign-off"],
] as const;
type QuoteRow = { label: string; amount: string };
type Quote = { workstreams: QuoteRow[]; installments: QuoteRow[] };
function readQuote(investment: string): Quote {
  try {
    const quote = JSON.parse(investment)?.quote;
    if (Array.isArray(quote?.workstreams) && Array.isArray(quote?.installments)) return quote;
  } catch { /* Historical drafts can have unstructured pricing. */ }
  return {workstreams:[{label:"", amount:""}], installments:[{label:"", amount:""}]};
}

function QuoteRows({title, rows, onChange}: {title:string; rows:QuoteRow[]; onChange:(rows:QuoteRow[])=>void}) {
  return <fieldset className="space-y-2"><legend className="font-bold text-sm">{title}</legend>
    {rows.map((row, index) => <div key={index} className="flex flex-wrap gap-2">
      <label className="flex-1 text-xs">Description
        <input className="field-input w-full" maxLength={200} value={row.label} onChange={e=>onChange(rows.map((r,i)=>i===index?{...r,label:e.target.value}:r))}/>
      </label>
      <label className="text-xs">USD
        <input className="field-input w-28" inputMode="decimal" value={row.amount} onChange={e=>onChange(rows.map((r,i)=>i===index?{...r,amount:e.target.value}:r))}/>
      </label>
      <button type="button" className="text-xs" disabled={rows.length===1} onClick={()=>onChange(rows.filter((_,i)=>i!==index))}>Remove</button>
    </div>)}
    <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={rows.length>=50} onClick={()=>onChange([...rows,{label:"",amount:""}])}>Add row</button>
  </fieldset>;
}

export default function ProposalReviewPanel({intakeId,proposal,onSaved}:{
 intakeId:string;proposal:EditableProposal;onSaved:(value:EditableProposal)=>void;
}){
 const [quote,setQuote]=useState(()=>readQuote(proposal.investment));
 const [editing,setEditing]=useState(false);
 const [form,setForm]=useState<EditableProposal>(proposal);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{setForm(proposal);setQuote(readQuote(proposal.investment));setEditing(false);setError("");setNotice("");},[proposal.id,proposal.updatedAt]);
 async function save(){
  if(busy||proposal.status!=="draft")return;
  try{
   const milestones:unknown=JSON.parse(form.milestones);
   if(!Array.isArray(milestones)||milestones.length===0||milestones.some(x=>!x||typeof x!=="object"||
      typeof x.label!=="string"||typeof x.description!=="string"))
    throw new Error("Milestones must be a nonempty JSON array of {label, description}.");
  }catch(e){setError(e instanceof Error?e.message:"Invalid proposal JSON.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   const changes=Object.fromEntries(fields.map(([k])=>[k,form[k]]));
   const updated=await adminJson<EditableProposal>(`/api/admin/discovery/${intakeId}/proposal`,{
    method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({...changes,quote,expectedUpdatedAt:proposal.updatedAt}),
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
    onClick={()=>{setForm(proposal);setQuote(readQuote(proposal.investment));setEditing(v=>!v);setError("");}}> {editing?"Cancel edits":"Edit proposal draft"} </button>}
  </div>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  {notice&&<p role="status" className="text-sm text-green-700">{notice}</p>}
  {editing?<div className="space-y-3">{fields.map(([key,label])=><label key={key} className="block text-xs font-semibold">
   {label}<textarea value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
    className="field-input mt-1 w-full text-sm" rows={key==="scope"||key==="milestones"?5:3} disabled={busy}/>
  </label>)}
   <fieldset disabled={busy} className="space-y-3">
    <QuoteRows title="Workstream fees" rows={quote.workstreams} onChange={rows=>setQuote({...quote,workstreams:rows})}/>
    <QuoteRows title="Payment schedule" rows={quote.installments} onChange={rows=>setQuote({...quote,installments:rows})}/>
   </fieldset>
   <button type="button" className="btn-primary px-3 py-2 text-sm" disabled={busy} onClick={()=>void save()}>
    {busy?"Saving…":"Save reviewed draft"}
   </button>
  </div>:<p className="text-xs opacity-70">{proposal.status==="draft"?
    "Review the existing proposal above, then edit scope and pricing here before final approval.":
    "Approved proposal is locked. Future changes require a new intake and proposal revision."}</p>}
 </section>;
}
