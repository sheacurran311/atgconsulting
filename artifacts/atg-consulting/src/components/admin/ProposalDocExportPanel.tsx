import {useEffect,useState} from "react";
import {adminJson} from "@/lib/adminWork";
type Status={enabled:boolean;eligible:boolean;state:"none"|"creating"|"ready"|"error";docUrl:string|null;exportedAt:string|null};
export default function ProposalDocExportPanel({intakeId}:{intakeId:string}){
 const [status,setStatus]=useState<Status|null>(null),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;setStatus(null);setError("");setNotice("");
  void adminJson<Status>(`/api/admin/discovery/${intakeId}/proposal/google-doc`)
    .then(v=>{if(active)setStatus(v);})
    .catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not load Google Docs export status.");});
  return()=>{active=false;};
 },[intakeId]);
 async function exportDoc(){
  if(!status?.eligible||!status.enabled||status.state!=="none"||busy)return;
  setBusy(true);setError("");setNotice("");
  try {
   const result=await adminJson<{ok:boolean;state:string;url:string}>(
    `/api/admin/discovery/${intakeId}/proposal/google-doc`,{method:"POST"});
   if(!result.ok)throw new Error("Export was not confirmed.");
   setStatus({...status,state:"ready",docUrl:result.url,exportedAt:new Date().toISOString()});
   setNotice("ATG-owned proposal document created. It has not been shared.");
  }catch(e){setError(e instanceof Error?e.message:"Could not export proposal.");
   try{setStatus(await adminJson<Status>(`/api/admin/discovery/${intakeId}/proposal/google-doc`));}catch{/* no extra writes */}
  }finally{setBusy(false);}
 }
 return <section className="rounded-xl border border-canvas-border p-4 space-y-3" aria-label="Google Docs proposal export">
  <h3 className="font-bold">Google Docs | Approved Proposal</h3>
  <p className="text-xs opacity-70">Export the approved client-facing proposal to ATG's Google account. Internal reviewer notes are excluded. No sharing, Gmail sending or client account connection occurs.</p>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  {notice&&<p role="status" className="text-sm text-green-700">{notice}</p>}
  {status&&<>
   {status.state==="ready"&&status.docUrl&&<a href={status.docUrl} target="_blank" rel="noopener noreferrer"
    className="btn-secondary inline-block px-3 py-2 text-sm">Open ATG proposal in Google Docs</a>}
   {status.state==="none"&&status.enabled&&status.eligible&&<button type="button"
    disabled={busy} className="btn-primary px-3 py-2 text-sm" onClick={()=>void exportDoc()}>
    {busy?"Exporting…":"Create private Google Doc"}
   </button>}
   {!status.enabled&&<p className="text-sm opacity-70">Export remains disabled until Replit's Google Docs write permission is verified and ATG_ENABLE_PROPOSAL_DOCS_EXPORT=true is configured.</p>}
   {status.state==="creating"&&<p className="text-sm">A document export is already in progress. Refresh the page to inspect its status.</p>}
   {status.state==="error"&&<p className="text-sm text-amber-700">Export needs manual reconciliation. A private document may already exist; automatic retry is blocked to avoid duplicates.</p>}
  </>}
 </section>;
}
