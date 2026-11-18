import { useEffect, useState } from "react";
import { adminJson } from "@/lib/adminWork";

interface FitStage { minutes:string; title:string; outcome:string; questions:string[] }
interface GuidedSession { session:number; title:string; objective:string; prerequisites:string[]; acceptance:string }
interface Brief {
  organization:string|null;primaryPriority:string;audience:string;
  knownContext:Array<{label:string;value:string}>;missingInformation:string[];
  fitCall:FitStage[];guidedSessions:GuidedSession[];
  recommendedSkills:Array<{id:string;title:string;purpose:string}>;
  assessmentSubmittedAt:string;note:string;
}
export default function ConsultationBriefPanel({clientId}:{clientId:string}){
  const [brief,setBrief]=useState<Brief|null>(null);
  const [error,setError]=useState("");const [loading,setLoading]=useState(true);
  const [copied,setCopied]=useState(false);
  useEffect(()=>{
    let live=true;
    setLoading(true);setError("");setBrief(null);
    void adminJson<Brief>(`/api/admin/clients/${clientId}/playbook/consultation-brief`)
      .then(data=>{if(live)setBrief(data);})
      .catch((e:Error)=>{if(live)setError(e.message);})
      .finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;};
  },[clientId]);
  function copyAgenda(){
    if(!brief)return;
    const lines=[
      `ATG CLIENT FIT CALL | ${brief.organization??"Client"} | Priority: ${brief.primaryPriority}`,
      ...brief.fitCall.flatMap(stage=>[
        `${stage.minutes} minutes | ${stage.title} | ${stage.outcome}`,
        ...stage.questions.map(q=>`• ${q}`),
      ]),
      "Unresolved information:",...brief.missingInformation.map(q=>`• ${q}`),
    ];
    void navigator.clipboard.writeText(lines.join("\n"))
      .then(()=>setCopied(true)).catch(()=>setError("Clipboard permission was denied."));
  }
  return <section className="rounded-xl border border-canvas-border p-4 sm:p-6 my-5 space-y-4"
    aria-label="Client-specific consultation preparation">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="font-mono text-2xs font-semibold uppercase tracking-widest" style={{color:"var(--blue)"}}>Client-specific preparation</p>
        <h3 className="text-xl font-bold mt-1">20-minute Fit Call & Guided Milestones</h3>
        <p className="text-sm mt-1" style={{color:"var(--canvas-text-2)"}}>Prepared from this client's submitted intake. It does not alter their playbook or mark work complete.</p>
      </div>
      {brief&&<button type="button" onClick={copyAgenda} className="btn-secondary px-3 py-2 text-xs">{copied?"Agenda copied":"Copy fit-call agenda"}</button>}
    </div>
    {loading&&<p className="text-sm">Preparing the client-specific briefing…</p>}
    {!loading&&error&&<p role="status" className="text-sm">{error}</p>}
    {brief&&<div className="space-y-3">
      <div className="rounded-lg p-4" style={{background:"var(--canvas-2)"}}>
        <p className="text-xs uppercase tracking-wide" style={{color:"var(--canvas-text-3)"}}>First priority</p>
        <p className="font-semibold mt-1">{brief.primaryPriority}</p>
        <p className="text-xs mt-2" style={{color:"var(--canvas-text-2)"}}>Intake: {new Date(brief.assessmentSubmittedAt).toLocaleDateString()}</p>
      </div>
      <details open className="rounded-lg border border-canvas-border p-4">
        <summary className="cursor-pointer font-bold text-base">20-minute consultation agenda</summary>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">{brief.fitCall.map(stage=><article key={stage.minutes}
          className="rounded-lg p-3" style={{background:"var(--canvas-2)"}}>
          <p className="font-mono text-xs font-bold" style={{color:"var(--blue)"}}>{stage.minutes} MIN</p>
          <h4 className="font-semibold mt-1">{stage.title}</h4>
          <p className="text-xs mt-1" style={{color:"var(--canvas-text-2)"}}>{stage.outcome}</p>
          <ul className="list-disc pl-4 mt-3 text-sm space-y-1">{stage.questions.map((q,i)=><li key={i}>{q}</li>)}</ul>
        </article>)}</div>
      </details>
      <details className="rounded-lg border border-canvas-border p-4">
        <summary className="cursor-pointer font-bold text-base">Guided sessions ({brief.guidedSessions.length})</summary>
        <div className="space-y-3 mt-4">{brief.guidedSessions.map(session=><article key={session.session}
          className="rounded-lg border border-canvas-border p-3">
          <p className="text-xs font-bold uppercase" style={{color:"var(--blue)"}}>Session {session.session}</p>
          <h4 className="font-semibold mt-1">{session.title}</h4>
          <p className="text-sm mt-1">{session.objective}</p>
          <p className="text-xs mt-3"><strong>Prepare:</strong> {session.prerequisites.join(" · ")}</p>
          <p className="text-xs mt-1"><strong>Done when:</strong> {session.acceptance}</p>
        </article>)}</div>
      </details>
      <details className="rounded-lg border border-canvas-border p-4">
        <summary className="cursor-pointer font-bold text-base">Known facts & unresolved questions ({brief.missingInformation.length})</summary>
        <div className="grid sm:grid-cols-2 gap-5 mt-3 text-sm">
          <div><h4 className="font-semibold mb-2">Known from intake</h4>
            {brief.knownContext.length?<ul className="space-y-1">{brief.knownContext.map((v,i)=><li key={i}><strong>{v.label}:</strong> {v.value}</li>)}</ul>:<p>No confirmed context yet.</p>}
          </div>
          <div><h4 className="font-semibold mb-2">Confirm during discovery</h4>
            {brief.missingInformation.length?<ul className="list-disc pl-4 space-y-1">{brief.missingInformation.map((q,i)=><li key={i}>{q}</li>)}</ul>:<p>No key gaps identified. Confirm current conditions.</p>}
          </div>
        </div>
      </details>
      <details className="rounded-lg border border-canvas-border p-4">
        <summary className="cursor-pointer font-bold text-base">Recommended consultant Skills</summary>
        <ul className="list-disc pl-4 mt-3 text-sm space-y-1">
          {brief.recommendedSkills.map(skill=><li key={skill.id}><strong>{skill.title}:</strong> {skill.purpose}</li>)}
        </ul>
      </details>
      <p className="text-xs" style={{color:"var(--canvas-text-3)"}}>{brief.note}</p>
    </div>}
  </section>;
}
