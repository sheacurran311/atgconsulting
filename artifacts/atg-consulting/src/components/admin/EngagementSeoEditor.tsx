import type { SeoEvidenceInput } from "@/lib/engagementWorkspace";
import { card, choices, formGrid, NumericField, SelectField, TextField } from "./EngagementFields";

const search = {start: "", end: "", clicks: 0, impressions: 0, ctr: 0, averagePosition: 0};
const analytics = {start: "", end: "", organicSessions: 0, keyEvents: 0};
const source = {property: "", baselineReference: "", currentReference: ""};

export function newSeoReport(period: string): SeoEvidenceInput {
  return {period, gsc: {...source}, ga4: null, previous: {searchConsole: {...search}}, current: {searchConsole: {...search}},
    notes: "", actions: [], aeo: []};
}

type Snapshot = SeoEvidenceInput["current"];

export function EngagementSeoEditor({value, onChange}: {value: SeoEvidenceInput; onChange: (value: SeoEvidenceInput) => void}) {
  const useAnalytics = !!value.ga4;
  const set = <K extends keyof SeoEvidenceInput>(key: K, next: SeoEvidenceInput[K]) => onChange({...value, [key]: next});
  function toggleAnalytics() {
    if (useAnalytics) onChange({...value, ga4: null, previous: {searchConsole: value.previous.searchConsole}, current: {searchConsole: value.current.searchConsole}});
    else onChange({...value, ga4: {...source}, previous: {...value.previous, analytics: {...analytics}}, current: {...value.current, analytics: {...analytics}}});
  }
  return <>
    <div className={card}>
      <h3 className="font-bold">Search evidence from authorized exports</h3>
      <p className="text-sm">Record equal-length periods from the same property and reporting scope. Use shareable evidence references and aggregate data.</p>
      <div className={formGrid}>
        {(["gsc", "ga4"] as const).map(provider => {
          const input = value[provider];
          const label = provider === "gsc" ? "Search Console" : "GA4";
          return input && <fieldset key={provider} className="space-y-2 rounded-lg border border-canvas-border p-3">
            <legend className="px-1 font-semibold">{label}</legend>
            <TextField label={label + " property"} value={input.property} onChange={property => set(provider, {...input, property})} />
            <TextField label={label + " baseline reference"} value={input.baselineReference} onChange={baselineReference => set(provider, {...input, baselineReference})} />
            <TextField label={label + " current reference"} value={input.currentReference} onChange={currentReference => set(provider, {...input, currentReference})} />
          </fieldset>;
        })}
      </div>
      <button type="button" className="btn-ghost" onClick={toggleAnalytics}>{useAnalytics ? "Remove GA4 dataset" : "Add separate GA4 dataset"}</button>
    </div>
    {(["previous", "current"] as const).map(key => <div className={card} key={key}>
      <h3 className="font-bold">{key === "previous" ? "Baseline window" : "Current window"}</h3>
      <SnapshotEditor value={value[key]} onChange={next => set(key, next)} />
    </div>)}
    <div className={card}>
      <TextField label="Search findings, context and review" multiline value={value.notes} onChange={next => set("notes", next)} />
      {value.actions.map((item, index) => {
        const change = (next: typeof item) => set("actions", value.actions.map((entry, i) => i === index ? next : entry));
        return <fieldset key={index} className={formGrid}>
          <legend className="font-semibold">Remediation {index + 1}</legend>
          <TextField label="Action" value={item.action} onChange={action => change({...item, action})} />
          <TextField label="Owner" value={item.owner} onChange={owner => change({...item, owner})} />
          <TextField label="Due date" type="date" value={item.due} onChange={due => change({...item, due})} />
          <SelectField label="Status" value={item.status} choices={choices(["proposed", "approved", "verified"] as const)} onChange={status => change({...item, status})} />
          <TextField label="Verification evidence" value={item.evidence} onChange={evidence => change({...item, evidence})} />
          <button type="button" className="btn-ghost w-fit" onClick={() => set("actions", value.actions.filter((_, i) => i !== index))}>Remove action</button>
        </fieldset>;
      })}
      <button type="button" className="btn-ghost" disabled={value.actions.length >= 15}
        onClick={() => set("actions", [...value.actions, {action: "", owner: "", due: "", status: "proposed", evidence: ""}])}>Add remediation action</button>
    </div>
    <div className={card}>
      <h3 className="font-bold">Answer engine observations</h3>
      {value.aeo.map((item, index) => {
        const change = (next: typeof item) => set("aeo", value.aeo.map((entry, i) => i === index ? next : entry));
        return <fieldset key={index} className={formGrid}>
          <legend className="font-semibold">Sample {index + 1}</legend>
          <TextField label="Exact question" value={item.question} onChange={question => change({...item, question})} />
          <TextField label="Platform" value={item.platform} onChange={platform => change({...item, platform})} />
          <TextField label="Observation date" type="date" value={item.sampledOn} onChange={sampledOn => change({...item, sampledOn})} />
          <TextField label="Location and context" value={item.locationContext} onChange={locationContext => change({...item, locationContext})} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.observedMention}
            onChange={event => change({...item, observedMention: event.target.checked})} /> Business mentioned</label>
          <TextField label="Citation URLs, one per line" multiline value={item.citations.join("\n")}
            onChange={next => change({...item, citations: next.split("\n")})} />
          <button type="button" className="btn-ghost w-fit" onClick={() => set("aeo", value.aeo.filter((_, i) => i !== index))}>Remove sample</button>
        </fieldset>;
      })}
      <button type="button" className="btn-ghost" disabled={value.aeo.length >= 25}
        onClick={() => set("aeo", [...value.aeo, {question: "", platform: "", sampledOn: "", locationContext: "", observedMention: false, citations: []}])}>Add answer engine sample</button>
    </div>
  </>;
}

function SnapshotEditor({value, onChange}: {value: Snapshot; onChange: (value: Snapshot) => void}) {
  const gsc = value.searchConsole;
  const ga = value.analytics;
  return <div className={formGrid}>
    <fieldset className="space-y-2 rounded-lg border border-canvas-border p-3">
      <legend className="px-1 font-semibold">Search Console</legend>
      <TextField label="Search Console start" type="date" value={gsc.start} onChange={start => onChange({...value, searchConsole: {...gsc, start}})} />
      <TextField label="Search Console end" type="date" value={gsc.end} onChange={end => onChange({...value, searchConsole: {...gsc, end}})} />
      {([["clicks", "Search clicks"], ["impressions", "Search impressions"], ["ctr", "Search CTR (%)"], ["averagePosition", "Average position"]] as const).map(([key, label]) =>
        <NumericField key={key} label={label} value={key === "ctr" ? gsc[key] * 100 : gsc[key]}
          onChange={next => onChange({...value, searchConsole: {...gsc, [key]: key === "ctr" ? (next ?? 0) / 100 : next ?? 0}})} />)}
    </fieldset>
    {ga && <fieldset className="space-y-2 rounded-lg border border-canvas-border p-3">
      <legend className="px-1 font-semibold">GA4</legend>
      <TextField label="GA4 start" type="date" value={ga.start} onChange={start => onChange({...value, analytics: {...ga, start}})} />
      <TextField label="GA4 end" type="date" value={ga.end} onChange={end => onChange({...value, analytics: {...ga, end}})} />
      <NumericField label="Organic sessions" value={ga.organicSessions} onChange={organicSessions => onChange({...value, analytics: {...ga, organicSessions: organicSessions ?? 0}})} />
      <NumericField label="GA4 key events" value={ga.keyEvents} onChange={keyEvents => onChange({...value, analytics: {...ga, keyEvents: keyEvents ?? 0}})} />
    </fieldset>}
  </div>;
}
