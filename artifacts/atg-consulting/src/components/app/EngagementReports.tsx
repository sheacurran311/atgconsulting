import { useEffect, useState } from "react";
import type { WorkspaceRecord } from "@/lib/engagementWorkspace";
import { EngagementRecord } from "./EngagementRecord";

export default function EngagementReports() {
  const [records, setRecords] = useState<Exclude<WorkspaceRecord, {kind: "estimate"}>[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/client/engagement-workspace", {credentials: "include", cache: "no-store", signal: controller.signal})
      .then(async response => {
        if (!response.ok) throw new Error("Unable to load published engagement records.");
        const data: {records: Exclude<WorkspaceRecord, {kind: "estimate"}>[]} = await response.json();
        setRecords(data.records);
        setStatus("ready");
      }).catch(() => {if (!controller.signal.aborted) setStatus("error");});
    return () => controller.abort();
  }, []);
  return <section className="mb-8 space-y-3" aria-labelledby="engagement-reports">
    <h2 className="text-xl font-extrabold" id="engagement-reports">Engagement reports and agreements</h2>
    {status === "loading" && <p role="status" className="text-sm">Loading engagement reports…</p>}
    {status === "error" && <p className="text-sm" role="alert">Engagement reports could not be loaded.</p>}
    {status === "ready" && !records.length && <p className="text-sm">No engagement reports or agreements have been published yet.</p>}
    {records.map(item => <details className="space-y-4 rounded-xl border border-canvas-border bg-canvas-1 p-4"
      key={item.workspace + item.kind + item.period + item.version}>
      <summary className="cursor-pointer break-words font-semibold">{item.kind === "value" ? "Monthly value report · " + item.period :
        item.kind === "seo" ? "Search visibility report · " + item.period :
        item.kind === "change" ? item.content.reference + " · " + item.content.title + " · " + (item.status === "accepted" ? "Accepted" : "Review") :
        item.content.title + (item.kind === "sla" ? item.status === "executed" ? " · Executed SLA" : " · SLA review copy" : " · Advisory update")}</summary>
      <EngagementRecord record={item} />
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
