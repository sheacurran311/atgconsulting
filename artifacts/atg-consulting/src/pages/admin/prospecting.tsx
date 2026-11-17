import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/adminWork";

type Status = "NEW"|"RESEARCHED"|"QUALIFIED"|"DISQUALIFIED"|"DRAFT_READY"|"APPROVED"|"CONTACTED"|"REPLIED"|"BOOKED"|"WON"|"LOST"|"SUPPRESSED";
interface Prospect {
  id: string; businessName: string; website: string; domain: string; industry: string; updatedAt: string;
  notes: string; status: Status; score: number | null; outreachDraft: string;
  review?: Review | null;
}
interface Review { industryFit:number; sizeFit:number; observableNeed:number; contactConfidence:number; urgency:number; suppressed:boolean; evidence: Array<{claim:string;sourceUrl:string;observedAt:string;verified:boolean}> }
const emptyReview:Review={industryFit:0,sizeFit:0,observableNeed:0,contactConfidence:0,urgency:0,suppressed:false,evidence:[]};
const transitions: Record<Status, Status[]> = {
  NEW:["RESEARCHED","DISQUALIFIED","SUPPRESSED"],
  RESEARCHED:["QUALIFIED","DISQUALIFIED","SUPPRESSED"],
  QUALIFIED:["DRAFT_READY","DISQUALIFIED","SUPPRESSED"],
  DISQUALIFIED:["RESEARCHED","SUPPRESSED"],
  DRAFT_READY:["APPROVED","QUALIFIED","SUPPRESSED"],
  APPROVED:["CONTACTED","DRAFT_READY","SUPPRESSED"],
  CONTACTED:["REPLIED","LOST","SUPPRESSED"],
  REPLIED:["BOOKED","LOST","SUPPRESSED"],
  BOOKED:["WON","LOST","SUPPRESSED"],
  WON:["SUPPRESSED"], LOST:["RESEARCHED","SUPPRESSED"], SUPPRESSED:[],
};
export default function AdminProspectingPage() {
  const [rows,setRows]=useState<Prospect[]>([]);
  const [name,setName]=useState(""); const [website,setWebsite]=useState("");
  const [selected,setSelected]=useState<Prospect|null>(null);
  const [draft,setDraft]=useState(""); const [notes,setNotes]=useState("");
  const [review,setReview]=useState<Review>(emptyReview);
  const [claim,setClaim]=useState(""); const [sourceUrl,setSourceUrl]=useState("");
  const [evidenceVerified,setEvidenceVerified]=useState(false);
  const [error,setError]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function load() {
    try { setRows(await adminJson<Prospect[]>("/api/admin/prospecting")); }
    catch(e) { setError(e instanceof Error ? e.message : "Unable to load prospects."); }
  }
  useEffect(()=>{void load();},[]);
  async function add(e: React.FormEvent) {
    e.preventDefault(); if(busy) return; setBusy(true); setError(""); setMessage("");
    try {
      await adminJson("/api/admin/prospecting",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessName:name,website})});
      setName("");setWebsite("");setMessage("Prospect saved for research.");await load();
    } catch(e) {setError(e instanceof Error?e.message:"Could not add prospect.");}
    finally {setBusy(false);}
  }
  async function save(nextStatus?:Status) {
    if(!selected||busy)return;
    if(nextStatus==="APPROVED" && draft!==selected.outreachDraft) { setError("Save and review the latest outreach draft before approving it."); return; }
    setBusy(true);setError("");setMessage("");
    try {
      if ((claim.trim() || sourceUrl.trim()) && (!claim.trim() || !sourceUrl.trim() || !evidenceVerified)) {
        setError("Enter a complete observation and URL, then confirm you verified the source."); setBusy(false); return;
      }
      const evidence = evidenceVerified && claim.trim() && sourceUrl.trim() ? [{claim:claim.trim(),sourceUrl:sourceUrl.trim(),observedAt:new Date().toISOString(),verified:true}] : [];
      const payload:Record<string,unknown>={notes,expectedUpdatedAt:selected.updatedAt,review:{...review,evidence: evidence.length ? [...review.evidence,...evidence] : review.evidence}};
      if(selected.status!=="APPROVED"&&nextStatus!=="APPROVED")payload.outreachDraft=draft;
      if(nextStatus)payload.nextStatus=nextStatus;
      const updated=await adminJson<Prospect>(`/api/admin/prospecting/${selected.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      setSelected(updated);setDraft(updated.outreachDraft);setNotes(updated.notes);setReview(updated.review ?? review);
      setClaim(""); setSourceUrl(""); setEvidenceVerified(false); setMessage("Changes saved. Sending is not automated.");await load();
    }catch(e){setError(e instanceof Error?e.message:"Unable to save prospect.");}
    finally{setBusy(false);}
  }
  async function createDraft() {
    if(!selected||busy||selected.status!=="QUALIFIED")return;
    if(claim.trim()||sourceUrl.trim()||notes!==selected.notes) {
      setError("Save all research notes and verified evidence before generating an outreach draft."); return;
    }
    setBusy(true);setError("");setMessage("");
    try {
      const updated=await adminJson<Prospect>(`/api/admin/prospecting/${selected.id}/draft`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({expectedUpdatedAt:selected.updatedAt}),
      });
      setSelected(updated);setDraft(updated.outreachDraft);
      setReview(updated.review??review);
      setMessage("A draft is ready for review. Nothing has been sent.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Unable to prepare an outreach draft.");}
    finally{setBusy(false);}
  }
  return <AdminShell><div className="max-w-5xl mx-auto space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-widest" style={{color:"var(--blue)"}}>ATG INTERNAL SALES</p>
      <h1 className="text-2xl font-bold">Prospect Review</h1>
      <p className="text-sm opacity-70">Private research queue. No outbound emails, OAuth connections, or automated messages.</p></div>
    {error&&<p role="alert" className="p-3 rounded bg-red-100 text-red-900">{error}</p>}
    {message&&<p role="status" className="p-3 rounded bg-green-100 text-green-900">{message}</p>}
    <form onSubmit={add} className="flex flex-wrap gap-2">
      <input aria-label="Business name" className="field-input flex-1 min-w-48" placeholder="Business name" value={name} onChange={e=>setName(e.target.value)} required/>
      <input aria-label="Website" className="field-input flex-1 min-w-48" placeholder="https://business.com" value={website} onChange={e=>setWebsite(e.target.value)} required/>
      <button disabled={busy} className="btn-primary px-4 py-2">Add prospect</button>
    </form>
    <div className="grid md:grid-cols-2 gap-4">
      <section className="space-y-2" aria-label="Prospects">
        {rows.length===0&&<p className="text-sm opacity-70">No prospects recorded.</p>}
        {rows.map(p=><button key={p.id} type="button" onClick={()=>{setSelected(p);setDraft(p.outreachDraft);setNotes(p.notes);setReview(p.review??emptyReview);setClaim("");setSourceUrl("");setEvidenceVerified(false);setMessage("");}}
          className="block w-full text-left rounded-lg border p-3" style={{borderColor:selected?.id===p.id?"var(--blue)":"var(--canvas-border)"}}>
          <div className="font-semibold">{p.businessName}</div><div className="text-xs opacity-70">{p.domain}</div>
          <div className="text-xs mt-2">{p.status} {p.score!==null?`· Fit ${p.score}/100`:""}</div>
        </button>)}
      </section>
      <section className="rounded-lg border p-4 space-y-3" style={{borderColor:"var(--canvas-border)"}}>
        {selected?<>
          <div><h2 className="font-semibold text-lg">{selected.businessName}</h2>
            <a className="text-sm underline" href={selected.website} target="_blank" rel="noopener noreferrer">{selected.domain}</a>
            <p className="text-xs opacity-70 mt-1">Status: {selected.status}. Qualification requires verified source evidence.</p></div>
          <div className="space-y-2 rounded border p-3" style={{borderColor:"var(--canvas-border)"}}>
            <p className="font-semibold text-sm">Evidence-backed qualification (0–5)</p>
            {(["industryFit","sizeFit","observableNeed","contactConfidence","urgency"] as const).map(key=><label key={key} className="flex items-center justify-between gap-2 text-xs">
              <span>{key.replace(/([A-Z])/g," $1")}</span><input aria-label={key} type="number" min={0} max={5} step={1} className="field-input w-16" value={review[key]} onChange={e=>setReview(r=>({...r,[key]:Number(e.target.value)}))}/>
            </label>)}
            <label className="block text-xs">Verified observation<input className="field-input mt-1 w-full" value={claim} onChange={e=>setClaim(e.target.value)} placeholder="Specific observable business fact"/></label>
            <label className="block text-xs">Source URL<input className="field-input mt-1 w-full" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://source.example/page"/></label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={evidenceVerified} onChange={e=>setEvidenceVerified(e.target.checked)}/> I personally checked this fact against the supplied public source</label>
            <p className="text-xs opacity-70">Do not invent needs or contacts. Existing observations: {review.evidence.length}.</p>
          </div>
          <label className="block text-sm font-medium">Research notes
            <textarea className="field-input mt-1 w-full" rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
          <label className="block text-sm font-medium">Draft outreach (never sent by ATG)
            <textarea className="field-input mt-1 w-full" rows={6} value={draft} onChange={e=>setDraft(e.target.value)} readOnly={selected.status==="APPROVED"||selected.status==="SUPPRESSED"}/></label>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary px-3 py-2" disabled={busy||selected.status==="SUPPRESSED"} onClick={()=>void save()}>Save notes / draft</button>
            {selected.status==="QUALIFIED"&&<button type="button" className="btn-secondary px-3 py-2" disabled={busy} onClick={()=>void createDraft()}>Prepare AI outreach draft</button>}
            {transitions[selected.status].map(s=><button type="button" key={s} disabled={busy} onClick={()=>void save(s)}
              className="text-xs font-semibold rounded border px-3 py-2" style={{borderColor:"var(--canvas-border)"}}>{s.replaceAll("_"," ")}</button>)}
          </div>
          <p className="text-xs opacity-70">Qualification is intentionally blocked until a source-backed assessment is saved through the reviewed API workflow. Mark CONTACTED only after separately completing approved outreach.</p>
        </>:<p className="text-sm opacity-70">Select a prospect to see research and draft history.</p>}
      </section>
    </div>
  </div></AdminShell>;
}
