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
export default function DeliveryPlaybookPage() {
  const [guide, setGuide] = useState<Guide | null>(null); const [error, setError] = useState("");
  const [plan, setPlan] = useState("SELF_SERVE");
  function load() { setError(""); void adminJson<Guide>("/api/admin/playbook").then(setGuide).catch((e: Error) => setError(e.message)); }
  useEffect(load, []);
  const selected = guide?.plans.find((p) => p.key === plan);
  return <AdminShell><div className="max-w-4xl space-y-6">
    <div><p className="section-eyebrow">YOUR ENGAGEMENT GUIDE</p><h1 className="text-3xl font-bold">Delivery Playbook</h1><p className="mt-3 text-sm">{guide?.purpose}</p></div>
    {error && <div><p role="alert">{error}</p><button onClick={load} className="btn-secondary">Try again</button></div>}
    {!guide && !error && <p>Loading the delivery guide…</p>}
    {guide && <>
      <section className="rounded-xl border border-canvas-border p-5 space-y-3"><h2 className="font-semibold">Which screen do I use?</h2><div className="grid sm:grid-cols-2 gap-4">{guide.screens.map((screen) => <div key={screen.name}><Link to={screen.href} className="font-semibold underline">{screen.name} →</Link><p className="text-sm mt-1">{screen.use}</p></div>)}</div></section>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Client plan">{guide.plans.map((p) => <button key={p.key} className={plan === p.key ? "btn-primary" : "btn-secondary"} aria-pressed={plan === p.key} onClick={() => setPlan(p.key)}>{p.label}</button>)}</div>
      {selected && <section className="space-y-4"><h2 className="text-2xl font-bold">{selected.label}</h2><p>{selected.summary}</p>{selected.steps.map((step) => <article key={step.title} className="rounded-xl border border-canvas-border p-5 space-y-3"><h3 className="font-bold">{step.title}</h3><p className="text-sm">{step.action}</p><p className="text-sm"><strong>Done when:</strong> {step.done}</p><Link to={step.href} className="underline text-sm">Open {step.screen} →</Link></article>)}</section>}
      <section className="rounded-xl border border-canvas-border p-5 space-y-2"><h2 className="font-semibold">A template versus an automated bot</h2><p className="text-sm">{guide.templateExample}</p><Link to="/admin/automations" className="underline">Use the same native setup instructions as DIY clients →</Link></section>
      <section className="rounded-xl border border-canvas-border p-5 space-y-4"><h2 className="font-semibold">Shared fit-call outline</h2>{guide.fitCall.map((s) => <div key={s.stage}><h3 className="font-semibold">{s.stage}</h3><p className="text-sm">{s.action}</p></div>)}</section>
    </>}
  </div></AdminShell>;
}
