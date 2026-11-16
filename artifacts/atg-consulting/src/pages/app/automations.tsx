import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import AppShell from "@/components/app/AppShell";
import AdminShell from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/adminWork";

type Provider = { id: string; name: string; home: string; sources: string[]; steps: string[] };
type Bot = { id: string; name: string; does: string; audience: string; sources: string[]; cadence: string; output: string; rule: string; example: string; reasons: string[]; blockedReasons: string[]; preferredPlatforms: string[]; instructions: string; setupPrompts: Record<string, string> };
type Library = { reviewedAt: string; providers: Provider[]; bots: Bot[]; recommendedIds: string[]; personalization: { hasIntake: boolean; intakeDate: string | null }; note: string };

function AutomationLibrary({ admin = false }: { admin?: boolean }) {
  const [data, setData] = useState<Library | null>(null); const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  const [clients, setClients] = useState<{ id: string; user: { name: string | null; email: string } }[]>([]); const [clientId, setClientId] = useState("");
  const [platform, setPlatform] = useState("chatgpt"); const platformPicked = useRef(false);
  const [all, setAll] = useState(false); const [search, setSearch] = useState(""); const [selectedId, setSelectedId] = useState<string | null>(null); const [scope, setScope] = useState(""); const [notice, setNotice] = useState(""); const guide = useRef<HTMLDivElement>(null);
  useEffect(() => { if (admin) adminJson<typeof clients>("/api/admin/clients").then(setClients).catch(() => setClients([])); }, [admin]);
  useEffect(() => {
    let active = true; setData(null); setError("");
    const endpoint = admin ? `/api/admin/automation-library${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ""}` : "/api/automation-library";
    adminJson<Library>(endpoint).then((value) => { if (!active) return; setData(value); setAll(!value.recommendedIds.length); if (!platformPicked.current) setPlatform(value.bots.find((b) => b.preferredPlatforms.length)?.preferredPlatforms[0] ?? "chatgpt"); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "Could not load the native library."); });
    return () => { active = false; };
  }, [admin, clientId, retry]);
  const selected = data?.bots.find((b) => b.id === selectedId); const provider = data?.providers.find((p) => p.id === platform);
  const recommended = data?.bots.filter((b) => data.recommendedIds.includes(b.id)) ?? [];
  const visible = (all ? data?.bots ?? [] : recommended).filter((b) => `${b.name} ${b.does} ${b.sources.join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  const prompt = selected ? `${selected.setupPrompts[platform] ?? selected.instructions}${scope.trim() ? `\n\nOwner-provided source scope, timezone and review destination to confirm:\n${scope.trim()}` : ""}` : "";
  useEffect(() => { if (selectedId) guide.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [selectedId]);
  async function copy() { try { await navigator.clipboard.writeText(prompt); setNotice("Setup prompt copied."); } catch { setNotice("Select and copy the setup prompt below; clipboard access was unavailable."); } }
  function download() {
    if (!selected || !provider || !data) return;
    const text = `# ${selected.name}\n\n${selected.does}\n\n## ${provider.name}: setup\n${provider.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n## Reusable workflow instructions\n${prompt}\n\n## Official references (reviewed ${data.reviewedAt})\n${provider.sources.join("\n")}\n\nThis is an installation guide, not a plugin package or an activated native task. Test and confirm the schedule in your own account.`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `${selected.id}-${platform}-setup.md`; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="max-w-5xl mx-auto space-y-5">
    <div><p className="section-eyebrow">NATIVE AUTOMATION LIBRARY</p><h1 className="text-3xl font-bold">30 automation bots</h1><p className="mt-3 text-sm">Repeatable workflows for ChatGPT plugins, Grok Bot and Claude plugins. You and Shea use the same setup guides. Choose one workflow, connect approved sources, test it, then save its native schedule.</p></div>
    {admin && <><Link to="/admin/playbook" className="underline">Back to the Delivery Playbook</Link><label className="block text-sm">Recommend for a client<select aria-label="Recommend for a client" className="field-input mt-1" value={clientId} onChange={(e) => { setClientId(e.target.value); setSelectedId(null); setScope(""); }}><option value="">My assessment, if linked</option>{clients.map((c) => <option value={c.id} key={c.id}>{c.user.name ?? c.user.email ?? c.id}</option>)}</select></label><p className="text-sm">These 30 are starter recipes. For wider provider marketplaces and exact deployment selections, open a client → Playbook → Exact implementation list.{clientId && <> <Link className="underline" to={`/admin/clients/${encodeURIComponent(clientId)}/playbook`}>Open this client's implementation list →</Link></>}</p></>}
    {error && <div><p role="alert">{error}</p><button className="btn-secondary mt-3" onClick={() => setRetry((v) => v + 1)}>Try again</button></div>}
    {!data && !error && <p>Loading native workflow guides…</p>}
    {data && <>
      <div className="rounded-xl border border-canvas-border p-4 text-sm space-y-2"><p>{data.note}</p><p>Native only: no Zapier, Make or hosted automation service. Results are prepared for your review; these recipes do not automatically send, publish, pay or alter customer records.</p><p>Platform guidance checked {data.reviewedAt}. A recipe is not a verified installation in your account.</p></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Native platform">{data.providers.map((p) => <button key={p.id} className={platform === p.id ? "btn-primary text-sm" : "btn-secondary text-sm"} aria-pressed={platform === p.id} onClick={() => { platformPicked.current = true; setPlatform(p.id); setNotice(""); }}>{p.name}</button>)}</div>
      {data.personalization.hasIntake ? <p className="text-sm">Recommendations use your latest submitted intake{data.personalization.intakeDate ? ` (${new Date(data.personalization.intakeDate).toLocaleDateString()})` : ""}. Each match explains why it fits.</p> : <p className="text-sm">No submitted intake is linked for this account yet. Browse all 30; recommendations appear once an assessment is linked.</p>}
      {data.personalization.hasIntake && !recommended.length && <p className="text-sm">Your intake did not produce a specific match yet. Browse the library or ask Shea to help choose one pilot.</p>}
      <div className="flex flex-wrap gap-2"><button className={!all ? "btn-primary text-sm" : "btn-secondary text-sm"} onClick={() => setAll(false)}>Recommended starting bots</button><button className={all ? "btn-primary text-sm" : "btn-secondary text-sm"} onClick={() => setAll(true)}>Browse all 30</button></div>
      <label className="block text-sm">Find a workflow<input aria-label="Find a workflow" className="field-input mt-1" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Email, schedules, sales, household…" /></label>
      <h2 className="text-xl font-bold">{all ? "All 30 native workflow recipes" : "Recommended starting bots"}</h2>
      <div className="grid sm:grid-cols-2 gap-3">{visible.map((bot) => <button aria-label={`Setup guide: ${bot.name}`} key={bot.id} className="text-left border border-canvas-border rounded-xl p-4 hover:border-blue" onClick={() => { setSelectedId(bot.id); setNotice(""); }}><h3 className="font-bold">{bot.name}</h3><p className="text-sm mt-2">{bot.does}</p><p className="text-xs mt-2">{bot.cadence} · {bot.audience}</p>{bot.reasons.map((r) => <p key={r} className="text-xs mt-2">{r}</p>)}{bot.blockedReasons.map((r) => <p key={r} className="text-xs mt-2">{r}</p>)}<p className="text-sm underline mt-2">Open setup guide →</p></button>)}</div>
      {selected && provider && <div ref={guide} className="rounded-xl border border-canvas-border p-5 space-y-4 scroll-mt-4">
        <div><h2 className="text-2xl font-bold">{selected.name}</h2><p className="mt-2 text-sm">{selected.does}</p></div><h3 className="font-bold">{provider.name} · add and activate</h3>
        <ol className="list-decimal pl-5 text-sm space-y-2">{provider.steps.map((step) => <li key={step}>{step}</li>)}</ol><a className="underline text-sm" href={provider.home} target="_blank" rel="noreferrer">Open {provider.name} ↗</a>
        <dl className="text-sm space-y-2"><div><dt className="font-semibold">Native source apps</dt><dd>{selected.sources.join(", ")}</dd></div><div><dt className="font-semibold">Recurring schedule to confirm</dt><dd>{selected.cadence}</dd></div><div><dt className="font-semibold">Expected result</dt><dd>{selected.output}</dd></div><div><dt className="font-semibold">Approval rule</dt><dd>{selected.rule}</dd></div><div><dt className="font-semibold">First redacted test</dt><dd>{selected.example}</dd></div></dl>
        <label className="block text-sm">Your approved source scope, timezone and review destination<textarea className="field-input mt-1" rows={3} value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Keep examples redacted. These details stay on this page." /></label>
        <label className="block text-sm">Native setup prompt<textarea aria-label="Native setup prompt" readOnly className="field-input mt-1 font-mono text-xs" rows={14} value={prompt} /></label>
        <div className="flex flex-wrap gap-2"><button className="btn-primary text-sm" onClick={copy}>Copy setup prompt</button><button className="btn-secondary text-sm" onClick={download}>Download setup guide</button></div>{notice && <p role="status" className="text-sm">{notice}</p>}
        <p className="text-sm">Test normal, empty, duplicate, stale and missing-permission cases. Check the first real scheduled run. Pause the native task/routine before changing scope or reconnecting. If a required native capability is unavailable, stop and review the choice with Shea.</p>
        <div className="text-xs"><p>Official platform guidance · checked {data.reviewedAt}</p>{provider.sources.map((s) => <a key={s} className="block underline break-all mt-1" href={s} target="_blank" rel="noreferrer">{s}</a>)}</div>
      </div>}
    </>}
  </div>;
}
export function AdminAutomationLibraryPage() { return <AdminShell><AutomationLibrary admin /></AdminShell>; }
export default function AutomationsPage() { return <AppShell allowWithoutIntake><AutomationLibrary /></AppShell>; }
