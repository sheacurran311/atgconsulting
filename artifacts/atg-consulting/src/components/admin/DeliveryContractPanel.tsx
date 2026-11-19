import {useEffect,useState} from "react";
import {adminJson} from "@/lib/adminWork";
type Milestone={
 sequence:number;title:string;deliverable:string;owner:string;
 status:"not_started";acceptance:string;
};
type Contract={
 source:string;firstPilot:string;acceptanceCriterion:string;
 clientDependencies:string;exclusions:string;scope:string;milestones:Milestone[];
};
type DeliveryResponse={
 contract:Contract;acceptedAt:string|null;fitCallRevision:number|null;approvedProposalUpdatedAt:string;
};
export default function DeliveryContractPanel({intakeId}:{intakeId:string}){
 const [value,setValue]=useState<DeliveryResponse|null>(null);
 const [error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;
  setLoading(true);setValue(null);setError("");
  void adminJson<DeliveryResponse>(`/api/admin/discovery/${intakeId}/delivery-contract`)
   .then(r=>{if(active)setValue(r);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not load delivery plan.");})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[intakeId]);
 return <section className="rounded-xl border border-canvas-border p-4 space-y-3">
  <div><h3 className="font-bold text-lg">Approved Scope → Delivery Contract</h3>
   <p className="text-xs opacity-70">Private consultant planning snapshot. This is not a new purchase, project completion, or client publication.</p></div>
  {loading&&<p className="text-sm">Loading approved delivery scope…</p>}
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  {value&&<>
   <p className="text-xs font-semibold">{value.acceptedAt?"Client acceptance is recorded.":"Proposal approved by ATG. Client acceptance has not been recorded."}</p>
   {value.contract.firstPilot&&<p className="text-sm"><strong>First pilot:</strong> {value.contract.firstPilot}</p>}
   {value.contract.acceptanceCriterion&&<p className="text-sm"><strong>Acceptance criterion:</strong> {value.contract.acceptanceCriterion}</p>}
   {value.contract.clientDependencies&&<p className="text-sm"><strong>Client dependencies:</strong> {value.contract.clientDependencies}</p>}
   {value.contract.exclusions&&<p className="text-sm"><strong>Exclusions:</strong> {value.contract.exclusions}</p>}
   <div className="space-y-2">{value.contract.milestones.map(m=><div key={m.sequence} className="border border-canvas-border rounded p-3">
    <p className="text-sm font-bold">{m.sequence}. {m.title}</p>
    <p className="text-sm">{m.deliverable}</p>
    <p className="text-xs opacity-70">{m.owner} | Not started | Acceptance must be confirmed</p>
   </div>)}</div>
   <p className="text-xs opacity-70">Use the existing client playbook after client acceptance, payment verification, and tier entitlement. No sessions, tasks, or milestones are marked complete by creating this snapshot.</p>
  </>}
 </section>;
}
