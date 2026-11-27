import { useEffect, useState } from "react";
import { adminJson } from "@/lib/adminWork";
import type { SeoEvidenceInput } from "@/lib/engagementWorkspace";
import { card, formGrid, SelectField, TextField } from "./EngagementFields";

type Provider = "searchConsole" | "analytics";
type SearchData = SeoEvidenceInput["current"]["searchConsole"];
type AnalyticsData = NonNullable<SeoEvidenceInput["current"]["analytics"]>;
type Snapshot = {id: string; property: string; capturedAt: string; data: SearchData | AnalyticsData};
type Connection = {provider: Provider; property: string | null; status: string; freshness: string; snapshots: Snapshot[]};

export default function EngagementGoogleSeo({clientId, onImport}: {
  clientId: string; onImport: (provider: Provider, baseline: Snapshot, current: Snapshot) => boolean;
}) {
  const [data, setData] = useState<{enabled: boolean; connections: Connection[]}>();
  const [error, setError] = useState("");
  const url = "/api/admin/clients/" + encodeURIComponent(clientId) + "/seo/connections";
  async function refresh() {setData(await adminJson(url));}
  useEffect(() => {
    let active = true;
    adminJson<{enabled: boolean; connections: Connection[]}>(url).then(result => {if (active) setData(result);})
      .catch((err: Error) => {if (active) setError(err.message);});
    return () => {active = false;};
  }, [url]);
  return <div className={card}>
    <h3 className="font-bold">Google monitoring</h3>
    {error && <p role="alert" className="text-sm">{error}</p>}
    {data && (!data.enabled ? <p className="text-sm">Google sync is disabled. Use authorized exports for this report.</p> :
      !data.connections.length ? <p className="text-sm">The client can connect a Google property from Reports.</p> :
      data.connections.map(item => <ConnectionPanel key={item.provider} value={item} url={url} refresh={refresh} onImport={onImport} />))}
  </div>;
}
function ConnectionPanel({value, url, refresh, onImport}: {
  value: Connection; url: string; refresh: () => Promise<void>;
  onImport: (provider: Provider, baseline: Snapshot, current: Snapshot) => boolean;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [baseline, setBaseline] = useState("");
  const [current, setCurrent] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const label = value.provider === "analytics" ? "Google Analytics 4" : "Google Search Console";
  const select = [{value: "", label: "Choose captured dates"}, ...value.snapshots.map(item => ({value: item.id, label: item.data.start + " to " + item.data.end}))];
  return <section className="space-y-2 rounded-lg border border-canvas-border p-3">
    <h4 className="font-bold">{label}</h4>
    <p className="break-words text-sm">{value.property ?? "Waiting for client property selection"} · {value.status} · {value.freshness}</p>
    {value.status === "connected" && <>
      <div className={formGrid}><TextField label={label + " pull start"} type="date" value={start} onChange={setStart} />
        <TextField label={label + " pull end"} type="date" value={end} onChange={setEnd} /></div>
      <button className="btn-ghost" type="button" disabled={busy || !start || !end} onClick={async () => {
        setBusy(true);
        setNotice("");
        try {
          await adminJson(url + "/" + value.provider + "/pull", {
            method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({start, end}),
          });
          await refresh();
          setNotice("Measurement window captured.");
        } catch (err) {setNotice(err instanceof Error ? err.message : "Could not capture this window.");}
        finally {setBusy(false);}
      }}>Capture authorized data</button>
      {!!value.snapshots.length && <>
        <div className={formGrid}><SelectField label={label + " baseline data"} choices={select} value={baseline} onChange={setBaseline} />
          <SelectField label={label + " current data"} choices={select} value={current} onChange={setCurrent} /></div>
        <button className="btn-ghost" type="button" disabled={!baseline || !current || baseline === current} onClick={() => {
          const before = value.snapshots.find(item => item.id === baseline);
          const after = value.snapshots.find(item => item.id === current);
          if (before && after) setNotice(onImport(value.provider, before, after)
            ? "Captured values added to the draft." : "Choose non-overlapping windows that end in the selected report month.");
        }}>Import selected measurement windows</button>
      </>}
    </>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </section>;
}
