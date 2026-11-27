import EngagementMilestones from "./EngagementMilestones";
import EngagementGoogleSeo from "./EngagementGoogleSeo";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { adminJson } from "@/lib/adminWork";
import type { EstimateCatalog, WorkspaceRecord, WorkspaceSource } from "@/lib/engagementWorkspace";
import { card, SelectField, TextField } from "./EngagementFields";
import { emptyEstimate, EngagementEstimateEditor } from "./EngagementEstimateEditor";
import { AdvisoryEditor, ChangeOrderEditor, newChangeOrder, defaultAdvisory, defaultSla, newValueReport, SlaEditor, ValueEditor } from "./EngagementDeliveryEditors";
import { EngagementSeoEditor, newSeoReport } from "./EngagementSeoEditor";
import EngagementBilling from "./EngagementBilling";
import { EngagementRecord } from "../app/EngagementRecord";

type Kind = WorkspaceRecord["kind"];
type Intake = {id: string; status: string; createdAt: string; engagementId: string | null};
type Snapshot = {records: WorkspaceRecord[]; source: WorkspaceSource | null};
const tabs = [{value: "estimate", label: "Pricing"}, {value: "sla", label: "SLA"}, {value: "value", label: "Monthly ROI"}, {value: "advisory", label: "Fractional AI leadership"}, {value: "seo", label: "SEO and AEO"}, {value: "change", label: "Change orders"}] as const;
const usesPeriod = (kind: Kind) => kind === "value" || kind === "advisory" || kind === "seo";
const usesKey = (kind: Kind) => usesPeriod(kind) || kind === "change";
const body = (method: string, content: unknown): RequestInit => ({
  method, headers: {"Content-Type": "application/json"}, body: JSON.stringify(content),
});
const month = () => {
  const now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
};

export default function EngagementWorkspacePanel({clientId}: {clientId: string}) {
  const [workspace, setWorkspace] = useState("unlinked");
  const [requested] = useState(() => new URLSearchParams(window.location.search).get("intake"));
  const [catalog, setCatalog] = useState<EstimateCatalog>();
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [error, setError] = useState("");
  const base = "/api/admin/clients/" + encodeURIComponent(clientId) + "/engagement-workspace";
  useEffect(() => {
    let active = true;
    adminJson<{intakes: Intake[]; catalog?: EstimateCatalog}>(base).then(result => {if (active) {
      setIntakes(result.intakes);
      setCatalog(result.catalog);
      if (requested && result.intakes.some(item => item.id === requested)) setWorkspace(requested);
    }})
      .catch((err: Error) => {if (active) setError(err.message);});
    return () => {active = false;};
  }, [base, requested]);
  return <section className="min-w-0 space-y-4" aria-label="Engagement workspace">
    <header>
      <h2 className="text-xl font-extrabold">Engagement workspace</h2>
      <p className="text-sm">Scope pricing, service levels, value reports, and advisory delivery for this client.</p>
    </header>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <SelectField label="Client engagement" value={workspace} onChange={setWorkspace} choices={[
      {value: "unlinked", label: "Client workspace without a linked intake"},
      ...intakes.map(intake => ({value: intake.id, label: "Intake " + new Date(intake.createdAt).toLocaleDateString() + " · " + intake.status + " · " + intake.id.slice(-6)})),
    ]} />
    {workspace !== "unlinked" && <Link className="text-sm font-semibold text-blue underline" to={"/admin/discovery/" + workspace}>Open linked discovery</Link>}
    <Workspace key={workspace} clientId={clientId} catalog={catalog} url={base + "/" + encodeURIComponent(workspace)} />
    {workspace !== "unlinked" && <div key={workspace} className="space-y-4">
      <EngagementBilling clientId={clientId} intakeId={workspace} />
      <EngagementMilestones clientId={clientId} intakeId={workspace} />
    </div>}
  </section>;
}

function Workspace({url, clientId, catalog}: {url: string; clientId: string; catalog?: EstimateCatalog}) {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [kind, setKind] = useState<Kind>("estimate");
  const [period, setPeriod] = useState(month);
  const [reference, setReference] = useState("CO-001");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    adminJson<Snapshot>(url).then(result => {if (active) setSnapshot(result);})
      .catch((err: Error) => {if (active) setError(err.message);})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [url, reload]);
  const key = kind === "change" ? reference : period;
  const record = snapshot?.records.find(item => item.kind === kind && (!usesKey(kind) || item.period === key));
  return <>
    <div className="flex flex-wrap gap-2" aria-label="Workspace section">
      {tabs.map(tab => <button type="button" key={tab.value} aria-pressed={kind === tab.value}
        className={kind === tab.value ? "btn-primary" : "btn-ghost"} onClick={() => setKind(tab.value)}>{tab.label}</button>)}
    </div>
    {usesKey(kind) && <div className={card}>
      {kind === "change" ? <TextField label="Change order reference" value={reference} onChange={value => setReference(value.toUpperCase())} />
        : <TextField label="Report month" type="month" value={period} onChange={setPeriod} />}
      <div className="flex flex-wrap gap-2">{snapshot?.records.filter(item => item.kind === kind).map(item =>
        <button className="btn-ghost" type="button" key={item.period} onClick={() => kind === "change" ? setReference(item.period) : setPeriod(item.period)}>{item.period} · {item.status}</button>)}</div>
    </div>}
    {loading ? <p role="status">Loading workspace…</p> : error ? <p role="alert" className="text-red-600">{error} <button type="button" onClick={() => setReload(value => value + 1)} className="btn-ghost">Retry</button></p> :
      snapshot && (!usesKey(kind) || key) && <Editor key={kind + key} kind={kind} period={key} record={record} url={url} clientId={clientId} catalog={catalog}
        source={snapshot.source} onRecord={next => setSnapshot(current => current && ({
          ...current, records: [next, ...current.records.filter(item => item.kind !== next.kind || item.period !== next.period)],
        }))} onSource={next => setSnapshot(current => current && ({...current, source: next}))}
        onReload={() => setReload(value => value + 1)} />}
  </>;
}

function Editor({kind, period, record, source, url, clientId, catalog, onRecord, onSource, onReload}: {
  kind: Kind; period: string; record: WorkspaceRecord | undefined; source: WorkspaceSource | null; url: string; clientId: string; catalog?: EstimateCatalog;
  onRecord: (value: WorkspaceRecord) => void; onSource: (value: WorkspaceSource | null) => void; onReload: () => void;
}) {
  const [estimate, setEstimate] = useState(record?.kind === "estimate" ? record.content : emptyEstimate);
  const [sla, setSla] = useState(record?.kind === "sla" ? record.content : defaultSla);
  const [advisory, setAdvisory] = useState(record?.kind === "advisory" ? record.content : {...defaultAdvisory, period});
  const [value, setValue] = useState(record?.kind === "value" ? record.content : newValueReport(period));
  const [seo, setSeo] = useState(record?.kind === "seo" ? record.content : newSeoReport(period));
  const [order, setOrder] = useState(record?.kind === "change" ? record.content : newChangeOrder(period));
  const [signature, setSignature] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<WorkspaceRecord[]>();
  const content = {estimate, sla, advisory, value, seo, change: order}[kind];
  const dirty = JSON.stringify(content) !== JSON.stringify(record?.content);
  const endpoint = url + "/" + kind;
  const expectedVersion = record?.version ?? 0;

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try { await task(); }
    catch (err) {setError(err instanceof Error ? err.message : "The request could not be completed.");}
    finally {setBusy(false);}
  }

  async function change(action: "save" | "publish" | "execute") {
    const [path, method, payload] = action === "save" ? ["", "PUT", {expectedVersion, content}] as const :
      action === "publish" ? ["/publish", "POST", {expectedVersion, ...(usesKey(kind) ? {period} : {})}] as const :
      ["/execute", "POST", {expectedVersion, signatureReference: signature, executedOn: date}] as const;
    await run(async () => {
      const saved = await adminJson<WorkspaceRecord>(endpoint + path, body(method, payload));
      if (saved.kind === "estimate") setEstimate(saved.content);
      if (saved.kind === "sla") setSla(saved.content);
      if (saved.kind === "advisory") setAdvisory(saved.content);
      if (saved.kind === "value") setValue(saved.content);
      if (saved.kind === "seo") setSeo(saved.content);
      if (saved.kind === "change") setOrder(saved.content);
      onRecord(saved);
      setHistory(undefined);
      setMessage(saved.status === "draft" ? "Draft revision saved." : saved.status === "published" ? "Published to the client portal." : "Signed agreement reference recorded.");
    });
  }

  return <div className="min-w-0 space-y-4">
    {kind === "estimate" && <EngagementEstimateEditor value={estimate} onChange={setEstimate} source={source} catalog={catalog}
      saved={record?.kind === "estimate" ? record : undefined} busy={busy} dirty={dirty} copyQuote={installments => {
        void run(async () => {
          await adminJson(endpoint + "/copy-quote", body("POST", {
            expectedVersion, expectedProposalUpdatedAt: source?.source.proposal?.updatedAt, installments,
          }));
          setMessage("The draft proposal investment has been updated.");
          try { onSource((await adminJson<Snapshot>(url)).source); }
          catch { setMessage("Draft proposal updated. Reload before making further proposal changes."); }
        });
      }} />}
    {kind === "sla" && <SlaEditor value={sla} onChange={setSla} />}
    {kind === "advisory" && <AdvisoryEditor value={advisory} onChange={next => setAdvisory({...next, period})} />}
    {kind === "seo" && <>
      <EngagementGoogleSeo clientId={clientId} onImport={(provider, baseline, current) => {
        if (baseline.data.end >= current.data.start || !current.data.end.startsWith(period) || baseline.property !== current.property) return false;
        const source = {property: current.property, baselineReference: "Google snapshot " + baseline.id, currentReference: "Google snapshot " + current.id};
        if (provider === "searchConsole" && "clicks" in baseline.data && "clicks" in current.data) {
          setSeo({...seo, gsc: source, previous: {...seo.previous, searchConsole: baseline.data}, current: {...seo.current, searchConsole: current.data}});
          return true;
        }
        if (provider === "analytics" && "organicSessions" in baseline.data && "organicSessions" in current.data) {
          setSeo({...seo, ga4: source, previous: {...seo.previous, analytics: baseline.data}, current: {...seo.current, analytics: current.data}});
          return true;
        }
        return false;
      }} />
      <EngagementSeoEditor value={seo} onChange={setSeo} />
    </>}
    {kind === "change" && <ChangeOrderEditor value={order} onChange={setOrder} locked={record?.status === "accepted"} />}
    {kind === "value" && <ValueEditor value={value} onChange={setValue} />}
    <div className={card}>
      {record && <p className="text-sm">Revision {record.version} · {record.status}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={busy || !dirty || record?.status === "accepted"} onClick={() => void change("save")}>Save draft revision</button>
        {kind !== "estimate" && record?.status === "draft" && <button type="button" className="btn-ghost" disabled={busy || dirty}
          onClick={() => void change("publish")}>Publish reviewed copy to client</button>}
        {record && <button type="button" className="btn-ghost" disabled={busy} onClick={() => void run(async () => {
          setHistory((await adminJson<{records: WorkspaceRecord[]}>(endpoint + "/history" + (usesKey(kind) ? "?period=" + encodeURIComponent(period) : ""))).records);
        })}>Load revision history</button>}
        {error && <button type="button" className="btn-ghost" disabled={busy} onClick={onReload}>Reload saved workspace</button>}
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
      {history && <ol className="space-y-1 text-sm">{history.map(item => <li key={item.version}>
        Revision {item.version} · {item.status} · {new Date(item.createdAt).toLocaleString()}
        <button type="button" className="ml-2 underline" onClick={() => {
          if (item.kind === "estimate") setEstimate(item.content);
          if (item.kind === "sla") setSla(item.content);
          if (item.kind === "advisory") setAdvisory(item.content);
          if (item.kind === "value") setValue(item.content);
          if (item.kind === "seo") setSeo(item.content);
          if (item.kind === "change") setOrder(item.content);
          setMessage("Revision " + item.version + " loaded into the editor for review.");
        }}>Load into editor</button>
      </li>)}</ol>}
    </div>
    {record?.kind === "sla" && record.status === "published" && <div className={card}>
      <h3 className="font-bold">Record a signed SLA</h3>
      <TextField label="Signed document reference" value={signature} onChange={setSignature} />
      <TextField label="Date signed by both parties" type="date" value={date} onChange={setDate} />
      <button type="button" className="btn-primary" disabled={busy || dirty || !signature.trim() || !date} onClick={() => void change("execute")}>Record executed agreement</button>
    </div>}
    {record && record.kind !== "estimate" && <details className={card}><summary className="cursor-pointer font-bold">Saved revision preview</summary><EngagementRecord record={record} /></details>}
  </div>;
}
