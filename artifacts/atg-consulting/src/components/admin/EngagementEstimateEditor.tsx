import type { FieldProvenance } from "../../../../api-server/src/lib/engagementWorkspace";
import { useState } from "react";
import { transformationServices } from "@/content/transformationServices";
import { usd, type EstimateCatalog, type SavedEstimate, type WorkspaceRecord, type WorkspaceSource } from "@/lib/engagementWorkspace";
import { card, choices, formGrid, NumericField, SelectField, TextField } from "./EngagementFields";

type Estimate = SavedEstimate["input"];
type Workstream = Estimate["workstreams"][number];
export const emptyWorkstream: Workstream = {
  label: "", serviceId: null, quantity: 1, complexity: "medium", discovery: 0, implementation: 0, testing: 0,
  documentation: 0, training: 0, advisory: 0, support: 0, monitoring: 0, setupDirectCents: 0, monthlyDirectCents: 0,
  setupFeeCents: null, monthlyFeeCents: null,
};
export const emptyEstimate: SavedEstimate = {
  input: {
    label: "", engagement: "project", months: 1, internalHourlyCents: 0, additionalHourlyCents: 10000,
    contingencyPercent: 0, marginPercent: 0, sharedSetupCents: 0, sharedMonthlyCents: 0, monthlyReserveCents: 0, slaCoverage: "",
    workstreams: [{...emptyWorkstream}],
  }, source: null, formulaVersion: 1,
};

const hours = [
  ["discovery", "Discovery hours"], ["implementation", "Implementation hours"], ["testing", "QA hours"],
  ["documentation", "Documentation hours"], ["training", "Training hours"], ["advisory", "Monthly advisory hours"],
  ["support", "Monthly support hours"], ["monitoring", "Monthly monitoring hours"],
] as const;
const expenses = [
  ["setupDirectCents", "Direct setup cost (USD)"], ["monthlyDirectCents", "Direct monthly cost (USD)"],
  ["setupFeeCents", "Negotiated setup fee (USD)"], ["monthlyFeeCents", "Negotiated monthly fee (USD)"],
] as const;

export function EngagementEstimateEditor({value, onChange, source, catalog, saved, copyQuote, busy, dirty, slaVersion}: {
  slaVersion?: number | null; catalog?: EstimateCatalog; value: SavedEstimate; onChange: (value: SavedEstimate) => void; source: WorkspaceSource | null;
  saved: Extract<WorkspaceRecord, {kind: "estimate"}> | undefined;
  copyQuote: (installments: {label: string; amount: string}[]) => void; busy: boolean; dirty: boolean;
}) {
  const [catalogId, setCatalogId] = useState("");
  const [catalogSizing, setCatalogSizing] = useState<"low" | "high">("low");
  const selectedCatalog = catalog?.find(item => item.id === catalogId);
  const [installments, setInstallments] = useState<{label: string; amount: string}[]>([{label: "", amount: ""}]);
  const input = value.input;
  const [provenanceField, setProvenanceField] = useState("internalHourlyCents");
  const fieldChoice = provenanceField.startsWith("workstreams.") ? Number(provenanceField.split(".")[1]) : -1;
  const fields = [
    ...Object.keys(input).filter(key => key !== "workstreams").map(key => ({value: key, label: key.replace(/([A-Z])/g, " $1")})),
    ...input.workstreams.flatMap((item, index) => Object.keys(item).filter(key => key !== "catalog")
      .map(key => ({value: "workstreams." + index + "." + key, label: "Workstream " + (index + 1) + " · " + key.replace(/([A-Z])/g, " $1")}))),
  ];
  const origin = value.provenance?.[provenanceField];
  function setOrigin(sourceOrigin: FieldProvenance["origin"]) {
    const metadata: FieldProvenance = {origin: sourceOrigin};
    const catalogSource = input.workstreams[fieldChoice]?.catalog;
    if (sourceOrigin === "intake" && source) Object.assign(metadata, {reference: source.source.intakeId, revision: source.source.updatedAt});
    if (sourceOrigin === "fit-call" && source?.source.fitCall) Object.assign(metadata, {reference: source.source.fitCall.id, revision: String(source.source.fitCall.revision)});
    if (sourceOrigin === "proposal" && source?.source.proposal) Object.assign(metadata, {reference: source.source.proposal.id, revision: source.source.proposal.updatedAt});
    if (sourceOrigin === "catalog" && catalogSource) Object.assign(metadata, {reference: catalogSource.id, revision: String(catalogSource.version)});
    if (sourceOrigin === "sla" && slaVersion) Object.assign(metadata, {reference: "sla", revision: String(slaVersion)});
    onChange({...value, source: ["intake", "fit-call", "proposal"].includes(sourceOrigin) ? source?.source ?? value.source : value.source,
      provenance: {...value.provenance, [provenanceField]: metadata}});
  }
  function clearSource(key: string) {
    return {...value.provenance, [key]: {origin: "manual" as const}};
  }
  const monthly = input.engagement === "monthly";
  const set = <K extends keyof Estimate>(key: K, next: Estimate[K]) => onChange({...value, input: {...input, [key]: next}, provenance: key === "workstreams" ? value.provenance : clearSource(key)});
  const row = <K extends keyof Workstream>(index: number, field: K, next: Workstream[K]) =>
    onChange({...value, input: {...input, workstreams: input.workstreams.map((item, i) => i === index ? {...item, [field]: next} : item)},
      provenance: clearSource("workstreams." + index + "." + String(field))});
  const stale = !!value.source && JSON.stringify(value.source) !== JSON.stringify(source?.source);
  return <>
    <div className={card}>
      <h3 className="font-bold">Estimate inputs</h3>
      <p className="text-sm">Cost, margin and fee assumptions are private to ATG. The additional-work rate requires written authorization before extra work is billable.</p>
      <div className={formGrid}>
        <TextField label="Engagement name" value={input.label} onChange={next => set("label", next)} />
        <SelectField label="Engagement type" value={input.engagement} onChange={next => set("engagement", next)}
          choices={[{value: "project", label: "One-time project"}, {value: "monthly", label: "Monthly engagement"}]} />
        {monthly && <NumericField label="Initial term in months" min={1} value={input.months} onChange={next => set("months", next ?? 1)} />}
        <NumericField label="ATG internal hourly cost (USD)" currency value={input.internalHourlyCents} onChange={next => set("internalHourlyCents", next ?? 0)} />
        <NumericField label="Additional-work hourly rate (USD)" currency min={100} value={input.additionalHourlyCents}
          onChange={next => set("additionalHourlyCents", next ?? 0)} />
        <NumericField label="Contingency (%)" value={input.contingencyPercent} onChange={next => set("contingencyPercent", next ?? 0)} />
        <NumericField label="Target contribution margin (%)" value={input.marginPercent} onChange={next => set("marginPercent", next ?? 0)} />
        <NumericField label="Shared setup cost (USD)" currency value={input.sharedSetupCents} onChange={next => set("sharedSetupCents", next ?? 0)} />
        {monthly && <>
          <NumericField label="Shared monthly cost (USD)" currency value={input.sharedMonthlyCents} onChange={next => set("sharedMonthlyCents", next ?? 0)} />
          <NumericField label="Monthly incident reserve (USD)" currency value={input.monthlyReserveCents} onChange={next => set("monthlyReserveCents", next ?? 0)} />
        </>}
      </div>
      <TextField label="SLA coverage and response assumptions" multiline value={input.slaCoverage} onChange={next => set("slaCoverage", next)} />
    </div>
    {source && <details className={card} open={stale || undefined}>
      <summary className="cursor-pointer font-bold">Intake, fit call and proposal sources</summary>
      <p className="text-sm">{stale ? "The linked source changed. Review the inputs and confirm the latest revision." :
        value.source ? "Source revision linked." : "You can use these records to inform your estimate."}</p>
      <dl className="grid gap-2 text-sm">
        {Object.entries(source.answers).map(([key, answer]) => <div key={key}><dt className="font-semibold">{key.replaceAll("_", " ")}</dt><dd className="break-words">{answer}</dd></div>)}
        {source.fitCall && Object.entries(source.fitCall).filter(([, answer]) => typeof answer === "string" && answer).map(([key, answer]) =>
          <div key={key}><dt className="font-semibold">{key.replaceAll("_", " ")}</dt><dd className="break-words">{answer}</dd></div>)}
      </dl>
      <p className="break-words text-xs">Intake {source.source.intakeId} · {new Date(source.source.updatedAt).toLocaleString()}
        {source.source.fitCall && " · Fit call revision " + source.source.fitCall.revision}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={() => onChange({...value, source: source.source})}>Link reviewed sources</button>
        {!!source.proposal?.workstreams.length && <button type="button" className="btn-ghost" onClick={() => {
          const existing = input.workstreams.filter(item => item.label);
          const imported = source.proposal!.workstreams.filter(item => !existing.some(row => row.label === item.label))
            .map(item => ({...emptyWorkstream, label: item.label, setupFeeCents: Math.round(Number(item.amount) * 100)}));
          const rows = [...input.workstreams, ...imported].slice(0, 12);
          const reference = source.source.proposal;
          const attributes = reference ? Object.fromEntries(rows.slice(input.workstreams.length).flatMap((_, index) => ["label", "setupFeeCents"]
            .map(key => ["workstreams." + (input.workstreams.length + index) + "." + key,
              {origin: "proposal" as const, reference: reference.id, revision: reference.updatedAt}]))) : {};
          onChange({...value, source: source.source, input: {...input, workstreams: rows}, provenance: {...value.provenance, ...attributes}});
        }}>Add proposal workstreams</button>}
        {value.source && <button type="button" className="btn-ghost" onClick={() => onChange({...value, source: null})}>Save as manual estimate</button>}
      </div>
    </details>}
    {catalog && <details className={card}>
      <summary className="cursor-pointer font-bold">Approved workflow sizing references</summary>
      <p className="text-sm">Add an implementation estimate. Review discovery, QA, training and support separately.</p>
      <div className={formGrid}>
        <SelectField label="Workflow reference" value={catalogId} onChange={setCatalogId} choices={[
          {value: "", label: "Select a workflow"}, ...catalog.map(row => ({value: row.id, label: row.id + " · " + row.label})),
        ]} />
        <SelectField<"low" | "high"> label="Sizing reference" value={catalogSizing} onChange={setCatalogSizing}
          choices={[{value: "low", label: "Lower end of range"}, {value: "high", label: "Upper reference"}]} />
      </div>
      {selectedCatalog && <p className="text-sm">{selectedCatalog.difficulty} · {selectedCatalog.low}–{selectedCatalog.high}{selectedCatalog.openRange ? "+" : ""} implementation hours · {selectedCatalog.guard}</p>}
      <button type="button" className="btn-ghost" disabled={!selectedCatalog || input.workstreams.length >= 12} onClick={() => {
        if (!selectedCatalog) return;
        const item: Workstream = {...emptyWorkstream, label: selectedCatalog.label, implementation: selectedCatalog[catalogSizing],
          complexity: ({S:"small", M:"medium", L:"large", XL:"custom"} as const)[selectedCatalog.difficulty],
          catalog: {id: selectedCatalog.id, version: 1, sizing: catalogSizing}};
        const replace = input.workstreams.length === 1 && JSON.stringify(input.workstreams[0]) === JSON.stringify(emptyWorkstream);
        const index = replace ? 0 : input.workstreams.length;
        const provenance = Object.fromEntries(["label", "implementation", "complexity"].map(key =>
          ["workstreams." + index + "." + key, {origin: "catalog" as const, reference: selectedCatalog.id, revision: "1"}]));
        onChange({...value, input: {...input, workstreams: replace ? [item] : [...input.workstreams, item]}, provenance: {...value.provenance, ...provenance}});
      }}>Add reference to estimate</button>
    </details>}
    {input.workstreams.map((item, index) => <fieldset className={card} key={index}>
      <legend className="px-1 font-bold">Workstream {index + 1}</legend>
      {item.catalog && <p className="text-xs">Workflow {item.catalog.id} · Catalog revision {item.catalog.version} · {item.catalog.sizing} reference</p>}
      <div className={formGrid}>
        <TextField label="Workstream name" value={item.label} onChange={next => row(index, "label", next)} />
        <SelectField label="Service" value={item.serviceId ?? ""} onChange={next => row(index, "serviceId", next || null)}
          choices={[{value: "", label: "Select a service"}, ...transformationServices.map(service => ({value: service.id, label: service.name}))]} />
        <NumericField label="Quantity" min={1} value={item.quantity} onChange={next => row(index, "quantity", next ?? 1)} />
        <SelectField label="Complexity" value={item.complexity} onChange={next => row(index, "complexity", next)}
          choices={choices(["small", "medium", "large", "custom"] as const)} />
        {hours.slice(0, monthly ? hours.length : 5).map(([field, label]) => <NumericField key={field} label={label}
          value={item[field]} onChange={next => row(index, field, next ?? 0)} />)}
        {expenses.filter(([field]) => monthly || !field.startsWith("monthly")).map(([field, label]) => <NumericField key={field} label={label}
          currency value={item[field]} onChange={next => row(index, field, field.endsWith("FeeCents") ? next : next ?? 0)} />)}
      </div>
      {input.workstreams.length > 1 && <button type="button" className="btn-ghost" onClick={() => {
        const provenance = Object.fromEntries(Object.entries(value.provenance ?? {}).flatMap(([path, origin]) => {
          const [root, row, key] = path.split(".");
          if (root !== "workstreams") return [[path, origin]];
          const position = Number(row);
          return position === index ? [] : [["workstreams." + (position > index ? position - 1 : position) + "." + key, origin]];
        }));
        onChange({...value, input: {...input, workstreams: input.workstreams.filter((_, i) => i !== index)}, provenance});
        setProvenanceField("internalHourlyCents");
      }}>Remove workstream {index + 1}</button>}
    </fieldset>)}
    {input.workstreams.length < 12 && <button type="button" className="btn-ghost" onClick={() => set("workstreams", [...input.workstreams, {...emptyWorkstream}])}>Add workstream</button>}
    <details className={card}>
      <summary className="cursor-pointer font-bold">Pricing input sources</summary>
      <p className="text-sm">Editing a field records it as a consultant assumption. Reapply a source after reviewing the revision and value.</p>
      <SelectField label="Input to document" value={provenanceField} choices={fields} onChange={setProvenanceField} />
      <SelectField<FieldProvenance["origin"]> label="Input source" value={origin?.origin ?? "manual"} onChange={setOrigin}
        choices={[{value: "manual", label: "Consultant assumption"}, {value: "ai", label: "AI recommendation"},
          ...(source ? [{value: "intake" as const, label: "Client intake"}] : []),
          ...(source?.source.fitCall ? [{value: "fit-call" as const, label: "Completed fit call"}] : []),
          ...(source?.source.proposal ? [{value: "proposal" as const, label: "Existing proposal"}] : []),
          ...(input.workstreams[fieldChoice]?.catalog ? [{value: "catalog" as const, label: "Workflow catalog"}] : []),
          ...(slaVersion ? [{value: "sla" as const, label: "Reviewed SLA"}] : []),
        ]} />
      {origin?.reference && <p className="break-words text-sm">Source {origin.reference} · Revision {origin.revision}</p>}
      {origin?.recordedAt && <p className="text-sm">Recorded {new Date(origin.recordedAt).toLocaleString()}</p>}
      {origin?.origin === "ai" && <label className="flex gap-2 text-sm"><input type="checkbox" checked={!!origin.reviewed}
        onChange={event => onChange({...value, provenance: {...value.provenance, [provenanceField]: {...origin, reviewed: event.target.checked}}})} />
        I reviewed the AI-suggested assumption and its evidence.</label>}
    </details>
    {saved && <div className={card}>
      <h3 className="font-bold">Saved estimate · Revision {saved.version}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {([["Setup", saved.calculation.setup], ["Monthly", saved.calculation.monthly],
          ["Quoted term", saved.calculation.term], ["12-month scenario", saved.calculation.firstYear]] as const).map(([label, data]) =>
          <dl className="rounded-lg border border-canvas-border p-3 text-sm" key={label}>
            <dt className="font-bold">{label}</dt>
            <dd>Fee {usd(data.feeCents)} · Cost {usd(data.costCents)}</dd>
            <dd>Contribution {usd(data.contributionCents)}{data.marginPercent !== null && " (" + data.marginPercent.toFixed(1) + "%)"}</dd>
            <dd>{data.includedHours.toLocaleString()} included hours · {usd(data.effectiveHourlyCents)} effective hourly revenue</dd>
          </dl>)}
      </div>
      <ul className="space-y-1 text-sm">{saved.calculation.rows.map((item, index) => <li key={index}>
        {item.label}: setup {usd(item.setupFeeCents)} (indicative {usd(item.indicativeSetupCents)}), monthly {usd(item.monthlyFeeCents)} (indicative {usd(item.indicativeMonthlyCents)})
      </li>)}</ul>
      {source?.proposal?.status === "draft" && <details>
        <summary className="cursor-pointer font-semibold">Copy to draft proposal</summary>
        <p className="my-2 text-sm">Set the agreed schedule for {usd(saved.calculation.term.feeCents)}. This updates the existing draft investment.</p>
        <div className="space-y-2">
          {installments.map((item, index) => <div className={formGrid} key={index}>
            <TextField label={"Installment " + (index + 1) + " label"} value={item.label} onChange={label => setInstallments(rows => rows.map((row, i) => i === index ? {...row, label} : row))} />
            <TextField label={"Installment " + (index + 1) + " amount (USD)"} value={item.amount} onChange={amount => setInstallments(rows => rows.map((row, i) => i === index ? {...row, amount} : row))} />
          </div>)}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => setInstallments(rows => [...rows, {label: "", amount: ""}])} disabled={installments.length >= 50}>Add installment</button>
            {installments.length > 1 && <button type="button" className="btn-ghost" onClick={() => setInstallments(rows => rows.slice(0, -1))}>Remove last installment</button>}
            {!!source.proposal.installments.length && <button type="button" className="btn-ghost" onClick={() => setInstallments(source.proposal!.installments)}>Load proposal schedule</button>}
            <button type="button" className="btn-primary" disabled={busy || dirty || stale} onClick={() => copyQuote(installments)}>Copy saved estimate to draft</button>
          </div>
        </div>
      </details>}
    </div>}
  </>;
}
