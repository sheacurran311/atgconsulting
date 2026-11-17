import { useEffect, useState } from "react";
import { Link } from "wouter";
import AdminShell from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/adminWork";
interface Guide {
  title: string; purpose: string; templateExample: string;
  screens: Array<{ name: string; use: string; href: string }>;
  plans: Array<{ key: string; label: string; summary: string; steps: Array<{ title: string; action: string; done: string; screen: string; href: string }> }>;
  fitCall: Array<{ stage: string; action: string }>;
}
interface BusinessSkill { id:string; title:string; area:string; description:string; audiences:string[]; consultantAction:string; evidenceRequired:string; humanApproval:boolean; source:string }
interface GuidedModule { id: string; title: string; objective: string; discovery: string[]; resources: string[]; implementation: string[]; acceptance: string[]; monitoring: string[]; skills: string[] }
export default function DeliveryPlaybookPage() {
  const [guide, setGuide] = useState<Guide | null>(null); const [error, setError] = useState("");
  const [plan, setPlan] = useState("GUIDED");
  const [modules, setModules] = useState<GuidedModule[]>([]);
  const [moduleError, setModuleError] = useState("");
  const [businessSkills, setBusinessSkills] = useState<BusinessSkill[]>([]);
  const [skillsError, setSkillsError] = useState("");
  const [skillAudience, setSkillAudience] = useState<"internal"|"guided"|"dfy">("guided");
  function load() { setError(""); void adminJson<Guide>("/api/admin/playbook").then(setGuide).catch((e: Error) => setError(e.message)); }
  useEffect(load, []);
  useEffect(() => { void adminJson<GuidedModule[]>("/api/admin/playbook/guided-modules").then(setModules).catch((e: Error) => setModuleError(e.message)); }, []);
  useEffect(() => { void adminJson<BusinessSkill[]>("/api/admin/playbook/business-skills").then(setBusinessSkills).catch((e: Error) => setSkillsError(e.message)); }, []);
  const selected = guide?.plans.find((p) => p.key === plan);
  return <AdminShell><div className="max-w-4xl space-y-6">
    <div><p className="section-eyebrow">YOUR ENGAGEMENT GUIDE</p><h1 className="text-3xl font-bold">Delivery Playbook</h1><p className="mt-3 text-sm">{guide?.purpose}</p></div>
    {error && <div><p role="alert">{error}</p><button onClick={load} className="btn-secondary">Try again</button></div>}
    {!guide && !error && <p>Loading the delivery guide…</p>}
    {guide && <>
      <section className="rounded-xl border border-canvas-border p-5 space-y-3"><h2 className="font-semibold">Which screen do I use?</h2><div className="grid sm:grid-cols-2 gap-4">{guide.screens.map((screen) => <div key={screen.name}><Link to={screen.href} className="font-semibold underline">{screen.name} →</Link><p className="text-sm mt-1">{screen.use}</p></div>)}</div></section>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Client plan">{guide.plans.map((p) => <button key={p.key} className={plan === p.key ? "btn-primary" : "btn-secondary"} aria-pressed={plan === p.key} onClick={() => setPlan(p.key)}>{p.label}</button>)}</div>
      {selected && <section className="space-y-4"><h2 className="text-2xl font-bold">{selected.label}</h2><p>{selected.summary}</p>{selected.steps.map((step) => <article key={step.title} className="rounded-xl border border-canvas-border p-5 space-y-3"><h3 className="font-bold">{step.title}</h3><p className="text-sm">{step.action}</p><p className="text-sm"><strong>Done when:</strong> {step.done}</p><Link to={step.href} className="underline text-sm">Open {step.screen} →</Link></article>)}</section>}
      <section className="space-y-3" aria-label="Guided consultant modules">
        <h2 className="text-xl font-bold">Guided Consultant Command Center</h2>
        <p className="text-sm">Private consultant resources. Use with an individual client's saved playbook, sessions and implementation list. These modules do not publish to clients automatically.</p>
        {moduleError && <p role="alert">Could not load consultant modules: {moduleError}</p>}
        {modules.map((module) => <details key={module.id} className="rounded-xl border border-canvas-border p-4">
          <summary className="cursor-pointer font-semibold">{module.title}</summary>
          <p className="text-sm mt-2">{module.objective}</p>
          {([["Discovery questions",module.discovery],["Resources",module.resources],["Implementation steps",module.implementation],["Acceptance criteria",module.acceptance],["Monitoring",module.monitoring],["Related Skills",module.skills]] as const).map(([title,items])=><div key={title} className="mt-3">
            <h3 className="font-semibold text-sm">{title}</h3><ul className="list-disc pl-5 text-sm mt-1 space-y-1">{items.map((item)=><li key={item}>{item}</li>)}</ul>
          </div>)}
        </details>)}
      </section>
      <section className="space-y-3" aria-label="Curated business Skills">
        <h2 className="text-xl font-bold">Curated Business Skills</h2>
        <p className="text-sm">Verified source references for consultant research and approved client delivery. These are playbook methods, not connected third-party automations or installed packages.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Skill audience">
          {([["internal","ATG internal"],["guided","Guided"],["dfy","Do-It-For-You"]] as const).map(([id,label])=>
            <button key={id} type="button" aria-pressed={skillAudience===id}
              className={skillAudience===id?"btn-primary":"btn-secondary"} onClick={()=>setSkillAudience(id)}>{label}</button>)}
        </div>
        {skillsError && <p role="alert">Could not load curated Skills: {skillsError}</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          {businessSkills.filter(item=>item.audiences.includes(skillAudience)).map(item=>
            <article key={item.id} className="rounded-lg border border-canvas-border p-4 space-y-2">
              <p className="text-xs uppercase tracking-wide opacity-60">{item.area}</p>
              <h3 className="font-semibold">{item.title}</h3><p className="text-sm">{item.description}</p>
              <p className="text-xs"><strong>Consultant action:</strong> {item.consultantAction}</p>
              <p className="text-xs"><strong>Evidence required:</strong> {item.evidenceRequired}</p>
              <a href={item.source} target="_blank" rel="noopener noreferrer" className="text-sm underline">Review source Skill</a>
            </article>)}
        </div>
      </section>
      <section className="rounded-xl border border-canvas-border p-5 space-y-2"><h2 className="font-semibold">A template versus an automated bot</h2><p className="text-sm">{guide.templateExample}</p><Link to="/admin/automations" className="underline">Use the same native setup instructions as DIY clients →</Link></section>
      <section className="rounded-xl border border-canvas-border p-5 space-y-4"><h2 className="font-semibold">Shared fit-call outline</h2>{guide.fitCall.map((s) => <div key={s.stage}><h3 className="font-semibold">{s.stage}</h3><p className="text-sm">{s.action}</p></div>)}</section>
    </>}
  </div></AdminShell>;
}
