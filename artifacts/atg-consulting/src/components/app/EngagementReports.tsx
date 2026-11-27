import { EngagementFinanceSummary } from "./EngagementFinanceSummary";
import { useEffect, useState } from "react";
import type { ClientFinancialSummary, PublishedIncident, WorkspaceRecord } from "@/lib/engagementWorkspace";
import { EngagementRecord } from "./EngagementRecord";

type PublishedRecord = Exclude<WorkspaceRecord, {kind: "estimate" | "opportunity" | "financial" | "sla-incident"}>;
type ReadinessRecord = Extract<PublishedRecord, {kind: "readiness"}>;

export default function EngagementReports() {
  const [reportPeriod, setReportPeriod] = useState("");
  const [records, setRecords] = useState<PublishedRecord[]>([]);
  const [incidents, setIncidents] = useState<PublishedIncident[]>([]);
  const [finance, setFinance] = useState<ClientFinancialSummary[]>([]);
  const [baselines, setBaselines] = useState<ReadinessRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/client/engagement-workspace", {credentials: "include", cache: "no-store", signal: controller.signal})
      .then(async response => {
        if (!response.ok) throw new Error("Unable to load published engagement records.");
        const data: {records: PublishedRecord[]; readinessBaselines?: ReadinessRecord[]; finance?: ClientFinancialSummary[]; incidents?: PublishedIncident[]} = await response.json();
        setRecords(data.records);
        setFinance(data.finance ?? []);
        setIncidents(data.incidents ?? []);
        setBaselines(data.readinessBaselines ?? []);
        setStatus("ready");
      }).catch(() => {if (!controller.signal.aborted) setStatus("error");});
    return () => controller.abort();
  }, []);
  const periods = [...new Set(records.map(item => item.period).filter(period => /^\d{4}-\d{2}$/.test(period)))].sort().reverse();
  const visibleRecords = reportPeriod ? records.filter(item => item.period === reportPeriod || !/^\d{4}-\d{2}$/.test(item.period)) : records;
  const queryHistory = new Map<string, Array<{period: string; date: string; mention: boolean; citations: number; limitations?: string}>>();
  for (const item of records) {
    if (item.kind !== "seo") continue;
    for (const sample of item.content.aeo) {
      if (!sample.queryReference) continue;
      const key = JSON.stringify([item.workspace, sample.queryReference, sample.queryVersion, sample.question, sample.platform, sample.model, sample.locationContext]);
      const history = queryHistory.get(key) ?? [];
      history.push({period: item.period, date: sample.sampledOn, mention: sample.observedMention,
        citations: sample.citations.length, limitations: sample.limitations});
      queryHistory.set(key, history);
    }
  }
  return <section className="mb-8 space-y-3" aria-labelledby="engagement-reports">
    <h2 className="text-xl font-extrabold" id="engagement-reports">Engagement reports and agreements</h2>
    {status === "loading" && <p role="status" className="text-sm">Loading engagement reports…</p>}
    {status === "error" && <p className="text-sm" role="alert">Engagement reports could not be loaded.</p>}
    {status === "ready" && !records.length && !finance.length && !incidents.length && <p className="text-sm">No engagement reports or agreements have been published yet.</p>}
    {periods.length > 0 && <label className="block text-sm font-medium">Report month
      <select className="field-input ml-2" value={reportPeriod} onChange={event => setReportPeriod(event.target.value)}>
        <option value="">All months</option>{periods.map(period => <option key={period} value={period}>{period}</option>)}
      </select>
    </label>}
    {queryHistory.size > 0 && <section className="space-y-3 rounded-xl border border-canvas-border bg-canvas-1 p-4">
      <h3 className="font-semibold">Repeat answer-engine observations</h3>
      <p className="text-sm">Each result describes an individual sample. Results can vary between runs.</p>
      {[...queryHistory].map(([key, samples]) => {
        const [, reference, version, question, platform, model, location] = JSON.parse(key);
        return <details key={key} className="min-w-0 break-words text-sm">
          <summary className="cursor-pointer font-medium">{question} · {reference} v{version}</summary>
          <p>{platform}{model ? " · " + model : ""} · {location}</p>
          <ul className="mt-2 list-disc pl-5">{samples.sort((a, b) => a.date.localeCompare(b.date)).map((sample, index) =>
            <li key={index}>{sample.date} · {sample.mention ? "Mention observed" : "No mention observed"} · {sample.citations} citations{sample.limitations && " · " + sample.limitations}</li>)}</ul>
        </details>;
      })}
    </section>}
    {incidents.length > 0 && <section className="space-y-3 rounded-xl border border-canvas-border bg-canvas-1 p-4">
      <h3 className="font-semibold">Reviewed SLA performance</h3>
      {incidents.map(item => <details key={item.workspace + item.reference} className="rounded-lg border border-canvas-border p-3 text-sm">
        <summary className="cursor-pointer font-medium">{item.severity} · {item.reference} · {item.title}</summary>
        <p>Reported {new Date(item.reportedAt).toLocaleString()} · Executed SLA revision {item.slaVersion}</p>
        {item.timing ? <ul className="ml-5 list-disc">
          <li>Initial response {item.timing.response === null ? "pending evidence" : item.timing.response.toFixed(1) + " covered min"} / {item.timing.responseMinutes} min target</li>
          <li>Restoration {item.timing.restoration === null ? "pending evidence" : item.timing.restoration.toFixed(1) + " covered min"} / {item.timing.restorationMinutes} min target</li>
          <li>Resolution {item.timing.resolution === null ? "pending evidence" : item.timing.resolution.toFixed(1) + " covered min"}</li>
          <li>SLA time zone {item.timing.timezone}</li>
          {item.timing.asOf && <li>Reviewed {new Date(item.timing.asOf).toLocaleString()} · Response {item.timing.responseStatus} · Restoration {item.timing.restorationStatus}</li>}
          {item.timing.complete === false && <li>Elapsed coverage exceeds the supported ten-year window.</li>}
        </ul> : <p>Covered-hours targets are unavailable for this agreement. The recorded timestamps are shown below.</p>}
        <p>{[["Acknowledged", item.acknowledgedAt], ["Responded", item.respondedAt], ["Restored", item.restoredAt], ["Resolved", item.resolvedAt]]
          .map(([label, time]) => label + " " + (time ? new Date(time).toLocaleString() : "pending evidence")).join(" · ")}</p>
        {item.exceptions && <p>{item.exceptions}</p>}
      </details>)}
    </section>}
    {finance.map((summary, index) => <section key={summary.workspace} className="rounded-xl border border-canvas-border bg-canvas-1 p-4">
      <h3 className="mb-2 font-semibold">Cumulative value realization{finance.length > 1 ? " · Engagement " + (index + 1) : ""}</h3>
      <EngagementFinanceSummary summary={summary} contracted={summary.contractedFeeCents} />
    </section>)}
    {baselines.map(baseline => {
      const latest = records.filter((item): item is ReadinessRecord => item.kind === "readiness" && item.workspace === baseline.workspace)
        .sort((a, b) => b.period.localeCompare(a.period) || b.version - a.version)[0] ?? baseline;
      const score = (assessment: ReadinessRecord) => assessment.calculation.score === null
        ? "Awaiting evidence (" + assessment.calculation.coverage + "/6 dimensions)" : assessment.calculation.score + "/100";
      return <details key={baseline.workspace} className="rounded-xl border border-canvas-border bg-canvas-1 p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Readiness baseline and comparison</summary>
        <p className="my-2">Original baseline ({baseline.period}) · {score(baseline)}. Latest period ({latest.period}) · {score(latest)}.</p>
        <EngagementRecord record={baseline} />
      </details>;
    })}
    {visibleRecords.map(item => <details className="space-y-4 rounded-xl border border-canvas-border bg-canvas-1 p-4"
      key={item.workspace + item.kind + item.period + item.version}>
      <summary className="cursor-pointer break-words font-semibold">{item.kind === "value" ? "Monthly value report · " + item.period :
        item.kind === "readiness" ? "Readiness assessment · " + item.period :
        item.kind === "measurement" ? "Current Value Measurement Plan · revision " + item.version :
        item.kind === "seo" ? "Search visibility report · " + item.period :
        item.kind === "change" ? item.content.reference + " · " + item.content.title + " · " + (item.status === "accepted" ? "Accepted" : "Review") :
        item.content.title + (item.kind === "sla" ? item.status === "executed" ? " · Executed SLA" : " · SLA review copy" : " · Advisory update")}</summary>
      <EngagementRecord record={item} />
      {item.kind === "value" && <a className="inline-block text-sm font-semibold underline"
        href={"/api/client/engagement-workspace/" + encodeURIComponent(item.workspace) + "/value/" + item.period + "/" + item.version + "/print"}
        target="_blank" rel="noopener noreferrer">Open print-ready report</a>}
      {item.kind === "change" && item.status === "published" && <AcceptChange item={item}
        onAccepted={next => setRecords(current => current.map(row => row === item ? next : row))} />}
    </details>)}
  </section>;
}


function AcceptChange({item, onAccepted}: {item: Extract<WorkspaceRecord, {kind: "change"}>;
  onAccepted: (record: Extract<WorkspaceRecord, {kind: "change"}>) => void}) {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="space-y-2 border-t border-canvas-border pt-3">
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
      I am authorized to accept this change and its commercial terms.</label>
    <button className="btn-primary" type="button" disabled={busy || !confirmed} onClick={async () => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/client/engagement-workspace/change/accept", {
          method: "POST", credentials: "include", headers: {"Content-Type": "application/json"}, body: JSON.stringify({
            workspace: item.workspace, reference: item.content.reference, expectedVersion: item.version, authorized: true,
          }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.status !== "accepted") throw new Error(result?.error ?? "Acceptance could not be confirmed.");
        onAccepted(result);
      } catch (err) {setError(err instanceof Error ? err.message : "Acceptance could not be confirmed.");}
      finally {setBusy(false);}
    }}>Accept this change order</button>
    {error && <p role="alert" className="text-sm">{error}</p>}
  </div>;
}
