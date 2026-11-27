import WorkflowSpecifications from "./WorkflowSpecifications";
import type { workflowSpecifications } from "../../../../api-server/src/lib/workflowSpecifications";
import { EngagementSlaIncident, newSlaIncident, SlaCoverageEditor } from "./EngagementSlaIncident";
import { EngagementFinancialEditor, newFinancialEntry } from "./EngagementFinancialEditor";
import { EngagementFinanceSummary } from "../app/EngagementFinanceSummary";
import EngagementMilestones from "./EngagementMilestones";
import EngagementGoogleSeo from "./EngagementGoogleSeo";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { adminJson } from "@/lib/adminWork";
import type { EstimateCatalog, FinancialSummary, MeasurementConfig, WorkspaceRecord, WorkspaceSource } from "@/lib/engagementWorkspace";
import { card, SelectField, TextField } from "./EngagementFields";
import { emptyEstimate, EngagementEstimateEditor } from "./EngagementEstimateEditor";
import { AdvisoryEditor, ChangeOrderEditor, newChangeOrder, defaultAdvisory, defaultSla, newValueReport, SlaEditor, ValueEditor } from "./EngagementDeliveryEditors";
import { EngagementSeoEditor, newSeoReport } from "./EngagementSeoEditor";
import { emptyMeasurement, emptyOpportunity, emptyReadiness, MeasurementEditor, OpportunityEditor, ReadinessEditor } from "./EngagementMeasurementEditors";
import EngagementBilling from "./EngagementBilling";
import { EngagementRecord } from "../app/EngagementRecord";

type Kind = WorkspaceRecord["kind"];
type Intake = {id: string; status: string; createdAt: string; engagementId: string | null};
type Snapshot = {records: WorkspaceRecord[]; source: WorkspaceSource | null; contextVersion?: number; measurement?: MeasurementConfig; financialSummary?: FinancialSummary; executedSlaVersions?: number[]; latestSlaVersion?: number | null};
const tabs = [{value: "readiness", label: "Readiness"}, {value: "opportunity", label: "Opportunities"}, {value: "measurement", label: "Value Measurement Plan"}, {value: "estimate", label: "Pricing"}, {value: "sla", label: "SLA"}, {value: "sla-incident", label: "SLA performance"}, {value: "value", label: "Monthly ROI"}, {value: "financial", label: "Financial evidence"}, {value: "advisory", label: "Fractional AI leadership"}, {value: "seo", label: "SEO and AEO"}, {value: "change", label: "Change orders"}] as const;
const usesPeriod = (kind: Kind) => kind === "value" || kind === "advisory" || kind === "seo" || kind === "readiness";
const usesKey = (kind: Kind) => usesPeriod(kind) || kind === "change" || kind === "opportunity" || kind === "financial" || kind === "sla-incident";
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
  const [specifications, setSpecifications] = useState<typeof workflowSpecifications>([]);
  const [catalog, setCatalog] = useState<EstimateCatalog>();
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [error, setError] = useState("");
  const base = "/api/admin/clients/" + encodeURIComponent(clientId) + "/engagement-workspace";
  useEffect(() => {
    let active = true;
    adminJson<{intakes: Intake[]; catalog?: EstimateCatalog; workflowSpecifications?: typeof workflowSpecifications}>(base).then(result => {if (active) {
      setIntakes(result.intakes);
      setCatalog(result.catalog);
      setSpecifications(result.workflowSpecifications ?? []);
      if (requested && result.intakes.some(item => item.id === requested)) setWorkspace(requested);
    }})
      .catch((err: Error) => {if (active) setError(err.message);});
    return () => {active = false;};
  }, [base, requested]);
  return <section className="min-w-0 space-y-4" aria-label="Engagement workspace">
    <header>
      <h2 className="text-xl font-extrabold">Engagement workspace</h2>
      <p className="text-sm">Review readiness and opportunities, scope the engagement, and report its outcomes.</p>
    </header>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <SelectField label="Client engagement" value={workspace} onChange={setWorkspace} choices={[
      {value: "unlinked", label: "Client workspace without a linked intake"},
      ...intakes.map(intake => ({value: intake.id, label: "Intake " + new Date(intake.createdAt).toLocaleDateString() + " · " + intake.status + " · " + intake.id.slice(-6)})),
    ]} />
    {workspace !== "unlinked" && <Link className="text-sm font-semibold text-blue underline" to={"/admin/discovery?intake=" + encodeURIComponent(workspace)}>Open linked discovery</Link>}
    {!!specifications.length && <WorkflowSpecifications specifications={specifications} />}
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
  const [incidentRef, setIncidentRef] = useState("INC-001");
  const [financialRef, setFinancialRef] = useState("BEN-001");
  const [opportunityRef, setOpportunityRef] = useState("OP-001");
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
  const key = kind === "change" ? reference : kind === "opportunity" ? opportunityRef : kind === "financial" ? financialRef : kind === "sla-incident" ? incidentRef : period;
  const record = snapshot?.records.find(item => item.kind === kind && (!usesKey(kind) || item.period === key));
  return <>
    <div className="flex flex-wrap gap-2" aria-label="Workspace section">
      {tabs.map(tab => <button type="button" key={tab.value} aria-pressed={kind === tab.value}
        className={kind === tab.value ? "btn-primary" : "btn-ghost"} onClick={() => setKind(tab.value)}>{tab.label}</button>)}
    </div>
    {usesKey(kind) && <div className={card}>
      {kind === "change" ? <TextField label="Change order reference" value={reference} onChange={value => setReference(value.toUpperCase())} />
        : kind === "opportunity" ? <TextField label="Opportunity reference" value={opportunityRef} onChange={value => setOpportunityRef(value.toUpperCase())} />
        : kind === "financial" ? <TextField label="Financial evidence reference" value={financialRef} onChange={value => setFinancialRef(value.toUpperCase())} />
        : kind === "sla-incident" ? <TextField label="Incident reference" value={incidentRef} onChange={value => setIncidentRef(value.toUpperCase())} />
        : <TextField label={kind === "readiness" ? "Assessment month" : "Report month"} type="month" value={period} onChange={setPeriod} />}
      <div className="flex flex-wrap gap-2">{snapshot?.records.filter(item => item.kind === kind).map(item =>
        <button className="btn-ghost" type="button" key={item.period} onClick={() => kind === "change" ? setReference(item.period) : kind === "opportunity" ? setOpportunityRef(item.period) : kind === "financial" ? setFinancialRef(item.period) : kind === "sla-incident" ? setIncidentRef(item.period) : setPeriod(item.period)}>{item.period} · {item.status}</button>)}</div>
    </div>}
    {kind === "financial" && snapshot?.financialSummary && <section className={card}>
      <h3 className="font-bold">Approved financial summary</h3><EngagementFinanceSummary summary={snapshot.financialSummary} />
    </section>}
    {loading ? <p role="status">Loading workspace…</p> : error ? <p role="alert" className="text-red-600">{error} <button type="button" onClick={() => setReload(value => value + 1)} className="btn-ghost">Retry</button></p> :
      snapshot && (!usesKey(kind) || key) && <Editor key={kind + key} kind={kind} period={key} record={record} url={url} clientId={clientId} catalog={catalog}
        latestSlaVersion={snapshot.latestSlaVersion} executedSlas={snapshot.executedSlaVersions ?? []} config={snapshot.measurement} contextVersion={snapshot.contextVersion} source={snapshot.source} onRecord={next => setSnapshot(current => current && ({
          ...current, records: [next, ...current.records.filter(item => item.kind !== next.kind || item.period !== next.period)],
        }))} onSource={next => setSnapshot(current => current && ({...current, source: next}))}
        onReload={() => setReload(value => value + 1)} />}
  </>;
}

function Editor({kind, period, record, source, url, clientId, catalog, config, contextVersion, executedSlas, latestSlaVersion, onRecord, onSource, onReload}: {
  kind: Kind; period: string; record: WorkspaceRecord | undefined; source: WorkspaceSource | null; url: string; clientId: string; catalog?: EstimateCatalog; config?: MeasurementConfig; contextVersion?: number; executedSlas: number[]; latestSlaVersion?: number | null;
  onRecord: (value: WorkspaceRecord) => void; onSource: (value: WorkspaceSource | null) => void; onReload: () => void;
}) {
  const [incident, setIncident] = useState(record?.kind === "sla-incident" ? record.content : () => newSlaIncident(period, executedSlas[0] ?? 0));
  const [financial, setFinancial] = useState(record?.kind === "financial" ? record.content : () => newFinancialEntry(period, month()));
  const [readiness, setReadiness] = useState(record?.kind === "readiness" ? record.content : emptyReadiness(period));
  const [opportunity, setOpportunity] = useState(record?.kind === "opportunity" ? record.content : emptyOpportunity(period));
  const [measurement, setMeasurement] = useState(record?.kind === "measurement" ? record.content : emptyMeasurement);
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
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const content = {readiness, opportunity, measurement, financial, "sla-incident": incident, estimate, sla, advisory, value, seo, change: order}[kind];
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
      if (saved.kind === "sla-incident") setIncident(saved.content);
      if (saved.kind === "financial") setFinancial(saved.content);
      if (saved.kind === "readiness") setReadiness(saved.content);
      if (saved.kind === "opportunity") setOpportunity(saved.content);
      if (saved.kind === "measurement") setMeasurement(saved.content);
      if (saved.kind === "estimate") setEstimate(saved.content);
      if (saved.kind === "sla") setSla(saved.content);
      if (saved.kind === "advisory") setAdvisory(saved.content);
      if (saved.kind === "value") setValue(saved.content);
      if (saved.kind === "seo") setSeo(saved.content);
      if (saved.kind === "change") setOrder(saved.content);
      onRecord(saved);
      if (saved.kind === "financial" && saved.status === "published") onReload();
      setHistory(undefined);
      setHistoryCursor(null);
      setMessage(saved.status === "draft" ? "Draft revision saved." : saved.status === "published" ? "Published to the client portal." : saved.status === "reviewed" ? "Opportunity review recorded internally." : "Signed agreement reference recorded.");
    });
  }

  function loadHistory(before?: number) {
    void run(async () => {
      const query = new URLSearchParams();
      if (usesKey(kind)) query.set("period", period);
      if (before) query.set("before", String(before));
      const data = await adminJson<{records: WorkspaceRecord[]; nextBefore?: number | null}>(endpoint + "/history?" + query);
      setHistory(current => before ? [...(current ?? []), ...data.records] : data.records);
      setHistoryCursor(data.nextBefore ?? null);
    });
  }

  return <div className="min-w-0 space-y-4">
    {config && (kind === "readiness" || kind === "opportunity" || kind === "measurement") && <p className="text-sm">
      Business Context Profile {contextVersion ? "revision " + contextVersion : "awaiting review"}.
      {source?.source.fitCall && " Linked fit-call revision " + source.source.fitCall.revision + "."}
    </p>}
    {kind === "financial" && <EngagementFinancialEditor entry={financial} onChange={setFinancial} existing={!!record} />}
    {kind === "readiness" && config && <ReadinessEditor value={readiness} change={setReadiness} config={config} />}
    {kind === "opportunity" && config && <OpportunityEditor value={opportunity} change={setOpportunity} config={config} lockedService={!!record} />}
    {kind === "measurement" && config && <MeasurementEditor value={measurement} change={setMeasurement} config={config} />}
    {kind === "estimate" && <EngagementEstimateEditor value={estimate} onChange={setEstimate} slaVersion={latestSlaVersion} source={source} catalog={catalog}
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
    {kind === "sla" && <>
      <SlaEditor value={sla} onChange={setSla} />
      <SlaCoverageEditor calendar={sla.calendar} change={calendar => setSla({...sla, calendar})} />
    </>}
    {kind === "sla-incident" && <EngagementSlaIncident value={incident} change={setIncident} versions={executedSlas} recorded={!!record} />}
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
          onClick={() => void change("publish")}>{kind === "opportunity" ? "Record reviewed opportunity" : "Publish reviewed copy to client"}</button>}
        {record && <button type="button" className="btn-ghost" disabled={busy} onClick={() => loadHistory()}>Load revision history</button>}
        {error && <button type="button" className="btn-ghost" disabled={busy} onClick={onReload}>Reload saved workspace</button>}
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
      {history && <ol className="space-y-1 text-sm">{history.map(item => <li key={item.version}>
        Revision {item.version} · {item.status} · {new Date(item.createdAt).toLocaleString()}
        <button type="button" className="ml-2 underline" onClick={() => {
          if (item.kind === "sla-incident") setIncident(item.content);
          if (item.kind === "financial") setFinancial(item.content);
          if (item.kind === "readiness") setReadiness(item.content);
          if (item.kind === "opportunity") setOpportunity(item.content);
          if (item.kind === "measurement") setMeasurement(item.content);
          if (item.kind === "estimate") setEstimate(item.content);
          if (item.kind === "sla") setSla(item.content);
          if (item.kind === "advisory") setAdvisory(item.content);
          if (item.kind === "value") setValue(item.content);
          if (item.kind === "seo") setSeo(item.content);
          if (item.kind === "change") setOrder(item.content);
          setMessage("Revision " + item.version + " loaded into the editor for review.");
        }}>Load into editor</button>
      </li>)}</ol>}
      {historyCursor && <button type="button" className="btn-ghost" disabled={busy} onClick={() => loadHistory(historyCursor)}>Load older revisions</button>}
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
