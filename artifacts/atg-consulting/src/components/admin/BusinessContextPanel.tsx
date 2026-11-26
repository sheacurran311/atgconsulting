import { useEffect, useState } from "react";
import { adminJson } from "@/lib/adminWork";
type ReviewState="unknown"|"confirmed"|"blocked";
type Source={label:string;owner:string;classification:"public"|"internal"|"confidential"|"restricted";authorization:ReviewState};
type Profile={clientId:string;version:number;objectives:string[];systems:string[];sources:Source[];decisionOwner:string|null;accessReview:ReviewState;dataReview:ReviewState;humanOversight:ReviewState;regulatedReview:ReviewState|"not-applicable"};
type Result={profile:Profile;savedVersion:number;reviews:{id:string;name:string;status:string;reasons:string[]}[]};
const fields=["accessReview","dataReview","humanOversight","regulatedReview"] as const;
const labels={accessReview:"Access authorization",dataReview:"Data handling",humanOversight:"Human oversight",regulatedReview:"Regulatory review"};
export default function BusinessContextPanel({clientId}:{clientId:string}){
  const [data,setData]=useState<Result|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const url="/api/admin/clients/"+encodeURIComponent(clientId)+"/business-context";
  useEffect(()=>{let active=true;setData(null);setError("");adminJson<Result>(url).then(r=>{if(active)setData(r)}).catch(e=>{if(active)setError(String(e.message))});return()=>{active=false}},[url]);
  function edit(patch:Partial<Profile>){setData(d=>d?{...d,profile:{...d.profile,...patch}}:d)}
  async function save(){
    if(!data)return;setBusy(true);setError("");
    try{const {clientId:_,version:__,...profile}=data.profile;
      await adminJson(url,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({expectedVersion:data.savedVersion,profile:{...profile,objectives:profile.objectives.map(s=>s.trim()).filter(Boolean),systems:profile.systems.map(s=>s.trim()).filter(Boolean)}})});
      setData(await adminJson<Result>(url));
    }catch(e){setError(e instanceof Error?e.message:"Save failed. Reload before retrying.");}finally{setBusy(false)}
  }
  if(!data)return <p role={error?"alert":undefined}>{error||"Loading business context..."}</p>;
  const p=data.profile;
  const inputClass="w-full rounded border border-canvas-border bg-transparent p-2 text-sm";
  return <section className="space-y-4">
    <h2 className="text-xl font-bold">Business context & governance</h2>
    <p className="text-sm">Internal metadata only. Do not enter credentials, raw records or sensitive customer data. Confirm reviews only with documented authority. Saved version: {data.savedVersion||"Not saved"}. Review results reflect the last server read, not unsaved edits.</p>
    {error&&<p role="alert">{error}</p>}
    <fieldset disabled={busy} className="space-y-3">
      <label className="block">Decision owner (role)<input className={inputClass} value={p.decisionOwner??""} onChange={e=>edit({decisionOwner:e.target.value||null})}/></label>
      {(["objectives","systems"] as const).map(key=><label key={key} className="block">{key==="objectives"?"Business objectives":"System names"} (one per line)<textarea className={inputClass} value={p[key].join("\n")} onChange={e=>edit({[key]:e.target.value.split("\n")})}/></label>)}
      {fields.map(key=><label key={key} className="block">{labels[key]}<select className={inputClass} value={p[key]} onChange={e=>edit({[key]:e.target.value})}><option value="unknown">Needs review</option><option value="confirmed">Confirmed</option><option value="blocked">Blocked</option>{key==="regulatedReview"&&<option value="not-applicable">Not applicable</option>}</select></label>)}
      <h3 className="font-semibold">Approved source inventory</h3>
      {p.sources.map((s,i)=><div key={i} className="grid gap-2 border border-canvas-border rounded p-3">
        <label>Source label<input className={inputClass} value={s.label} onChange={e=>edit({sources:p.sources.map((x,j)=>i===j?{...x,label:e.target.value}:x)})}/></label>
        <label>Owner role<input className={inputClass} value={s.owner} onChange={e=>edit({sources:p.sources.map((x,j)=>i===j?{...x,owner:e.target.value}:x)})}/></label>
        <label>Classification<select className={inputClass} value={s.classification} onChange={e=>edit({sources:p.sources.map((x,j)=>i===j?{...x,classification:e.target.value as Source["classification"]}:x)})}>{["public","internal","confidential","restricted"].map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Authorization<select className={inputClass} value={s.authorization} onChange={e=>edit({sources:p.sources.map((x,j)=>i===j?{...x,authorization:e.target.value as ReviewState}:x)})}>{["unknown","confirmed","blocked"].map(v=><option key={v}>{v}</option>)}</select></label>
        <button type="button" className="btn-ghost" onClick={()=>edit({sources:p.sources.filter((_,j)=>i!==j)})}>Remove source</button>
      </div>)}
      <button type="button" className="btn-ghost" disabled={p.sources.length>=30} onClick={()=>edit({sources:[...p.sources,{label:"",owner:"",classification:"internal",authorization:"unknown"}]})}>Add source</button>
      <button type="button" className="btn-primary" onClick={()=>void save()}>{busy?"Saving...":"Save context version"}</button>
    </fieldset>
    <h3 className="font-semibold">Saved governance review</h3>
    {data.reviews.map(r=><div key={r.id} className="rounded border border-canvas-border p-3"><strong>{r.name}: {r.status}</strong>{r.reasons.map(reason=><p key={reason} className="text-sm">{reason}</p>)}</div>)}
  </section>
}
