import type { AdvisoryInput, ChangeOrderInput, SlaInput, ValueReportInput } from "@/lib/engagementWorkspace";
import { card, choices, formGrid, NumericField, SelectField, TextField } from "./EngagementFields";

const slaFields = [
  ["title", "SLA name"], ["atgParty", "ATG legal entity"], ["clientParty", "Client legal entity"],
  ["contractReference", "MSA and SOW reference"], ["effectiveDate", "Effective date"], ["term", "Term and renewal"],
  ["scope", "Covered services"], ["deliverables", "Deliverables and acceptance"], ["exclusions", "Exclusions"], ["dependencies", "Dependencies"],
  ["timezone", "Support time zone"], ["coverage", "Hours, holidays and coverage"], ["channels", "Support and emergency contacts"],
  ["measurementClock", "Measurement clock and pause conditions"], ["availabilityAndMaintenance", "Availability, maintenance and backup commitments"],
  ["governance", "Security, privacy and AI governance"], ["responsibilities", "ATG and client responsibilities"],
  ["reporting", "Evidence, KPIs and reporting cadence"], ["commercialTerms", "Fees, installments and expense terms"],
  ["changeAuthorization", "Written approval and change-order process"], ["escalation", "Escalation and dispute process"],
  ["terminationAndHandoff", "Termination, ownership and handoff"],
] as const;

const priorities = ["P1", "P2", "P3", "P4"] as const;
const targetFields = [["definition", "Definition"], ["response", "Initial response"], ["updates", "Update cadence"], ["restoration", "Restoration objective"]] as const;
export const defaultSla: SlaInput = {
  title: "", atgParty: "", clientParty: "", contractReference: "", effectiveDate: "", term: "", scope: "",
  deliverables: "", exclusions: "", dependencies: "", timezone: "", coverage: "", channels: "",
  severity: {
    P1: {definition: "Critical covered service unavailable without a reasonable workaround", response: "", updates: "", restoration: ""},
    P2: {definition: "Material degradation with limited workaround", response: "", updates: "", restoration: ""},
    P3: {definition: "Limited defect with a workaround", response: "", updates: "", restoration: ""},
    P4: {definition: "Routine request or advice", response: "", updates: "", restoration: ""},
  },
  measurementClock: "", availabilityAndMaintenance: "", governance: "", responsibilities: "", reporting: "",
  commercialTerms: "", includedHours: 0, additionalHourlyCents: 10000,
  changeAuthorization: "Additional work requires written authorization and an agreed change order before delivery.",
  escalation: "", terminationAndHandoff: "",
};

export function SlaEditor({value, onChange}: {value: SlaInput; onChange: (value: SlaInput) => void}) {
  return <div className={card}>
    <p className="text-sm">Customize the schedule and record “not applicable” for commitments excluded by agreement. Publication shares the proposed terms. An executed copy requires the reference to the signed agreement.</p>
    <div className={formGrid}>
      {slaFields.map(([key, label], index) => <TextField key={key} label={label} value={value[key]}
        type={key === "effectiveDate" ? "date" : "text"} multiline={index > 4 && key !== "timezone"}
        onChange={next => onChange({...value, [key]: next})} />)}
      <NumericField label="Included hours (per agreed term)" value={value.includedHours} onChange={next => onChange({...value, includedHours: next ?? 0})} />
      <NumericField label="Additional-work hourly rate (USD)" currency min={100}
        value={value.additionalHourlyCents} onChange={next => onChange({...value, additionalHourlyCents: next ?? 0})} />
    </div>
    {priorities.map(priority => <fieldset key={priority} className="rounded-lg border border-canvas-border p-3">
      <legend className="px-1 font-semibold">{priority} service targets</legend>
      <div className={formGrid}>{targetFields.map(([key, label]) => <TextField key={key} label={priority + " " + label} value={value.severity[priority][key]}
        onChange={next => onChange({...value, severity: {...value.severity, [priority]: {...value.severity[priority], [key]: next}}})} />)}</div>
    </fieldset>)}
  </div>;
}

export const defaultAdvisory: AdvisoryInput = {
  title: "", objectives: "", meetingCadence: "", decisionOwner: "", scope: "", exclusions: "",
  includedHours: 0, hoursUsed: 0, period: "", nextReview: "", roadmap: [], decisions: [], vendors: [],
};

const advisoryText = [["title", "Advisory engagement"], ["objectives", "Objectives"], ["meetingCadence", "Meeting cadence"],
  ["decisionOwner", "Decision owner"], ["scope", "Advisory scope"], ["exclusions", "Implementation and other exclusions"]] as const;

export function AdvisoryEditor({value, onChange}: {value: AdvisoryInput; onChange: (value: AdvisoryInput) => void}) {
  const set = <K extends keyof AdvisoryInput>(key: K, next: AdvisoryInput[K]) => onChange({...value, [key]: next});
  return <div className={card}>
    <div className={formGrid}>
      {advisoryText.map(([key, label]) => <TextField key={key} label={label} value={value[key]} onChange={next => set(key, next)} />)}
      <TextField label="Next review" type="date" value={value.nextReview} onChange={next => set("nextReview", next)} />
      <NumericField label="Included advisory hours" value={value.includedHours} onChange={next => set("includedHours", next ?? 0)} />
      <NumericField label="Advisory hours used" value={value.hoursUsed} onChange={next => set("hoursUsed", next ?? 0)} />
    </div>
    <AdvisoryRows title="Roadmap" add={() => set("roadmap", [...value.roadmap, {item: "", owner: "", due: "", status: "planned"}])} count={value.roadmap.length}>
      {value.roadmap.map((entry, index) => {
        const change = (next: typeof entry) => set("roadmap", value.roadmap.map((row, i) => i === index ? next : row));
        return <div className={formGrid} key={index}>
          <TextField label="Milestone" value={entry.item} onChange={item => change({...entry, item})} />
          <TextField label="Milestone owner" value={entry.owner} onChange={owner => change({...entry, owner})} />
          <TextField label="Due date" type="date" value={entry.due} onChange={due => change({...entry, due})} />
          <SelectField label="Milestone status" value={entry.status} choices={choices(["planned", "in progress", "done", "blocked"] as const)} onChange={status => change({...entry, status})} />
          <Remove label="milestone" index={index} remove={() => set("roadmap", value.roadmap.filter((_, i) => i !== index))} />
        </div>;
      })}
    </AdvisoryRows>
    <AdvisoryRows title="Decision log" add={() => set("decisions", [...value.decisions, {decision: "", owner: "", date: ""}])} count={value.decisions.length}>
      {value.decisions.map((entry, index) => {
        const change = (next: typeof entry) => set("decisions", value.decisions.map((row, i) => i === index ? next : row));
        return <div className={formGrid} key={index}>
          <TextField label="Decision" value={entry.decision} onChange={decision => change({...entry, decision})} />
          <TextField label="Decision owner" value={entry.owner} onChange={owner => change({...entry, owner})} />
          <TextField label="Decision date" type="date" value={entry.date} onChange={date => change({...entry, date})} />
          <Remove label="decision" index={index} remove={() => set("decisions", value.decisions.filter((_, i) => i !== index))} />
        </div>;
      })}
    </AdvisoryRows>
    <AdvisoryRows title="Vendor inventory" add={() => set("vendors", [...value.vendors, {name: "", purpose: "", owner: "", reviewDate: ""}])} count={value.vendors.length}>
      {value.vendors.map((entry, index) => {
        const change = (next: typeof entry) => set("vendors", value.vendors.map((row, i) => i === index ? next : row));
        return <div className={formGrid} key={index}>
          <TextField label="Vendor" value={entry.name} onChange={name => change({...entry, name})} />
          <TextField label="Authorized purpose" value={entry.purpose} onChange={purpose => change({...entry, purpose})} />
          <TextField label="Vendor owner" value={entry.owner} onChange={owner => change({...entry, owner})} />
          <TextField label="Vendor review date" type="date" value={entry.reviewDate} onChange={reviewDate => change({...entry, reviewDate})} />
          <Remove label="vendor" index={index} remove={() => set("vendors", value.vendors.filter((_, i) => i !== index))} />
        </div>;
      })}
    </AdvisoryRows>
  </div>;
}

function AdvisoryRows({title, count, add, children}: {title: string; count: number; add: () => void; children: React.ReactNode}) {
  return <section className="space-y-3 rounded-lg border border-canvas-border p-3">
    <h3 className="font-semibold">{title}</h3>{children}
    <button type="button" className="btn-ghost" onClick={add} disabled={count >= 25}>Add {title === "Roadmap" ? "milestone" : title === "Decision log" ? "decision" : "vendor"}</button>
  </section>;
}
function Remove({label, index, remove}: {label: string; index: number; remove: () => void}) {
  return <button type="button" className="btn-ghost w-fit" onClick={remove}>Remove {label} {index + 1}</button>;
}

type Metric = ValueReportInput["kpis"][number];
type Evidence = NonNullable<Metric["baselineEvidence"]>;
type FinancialEvidence = ValueReportInput["realized"][number]["evidence"];
const blankEvidence: Evidence = {classification: "system export", reference: "", capturedOn: "", method: ""};
const blankFinancial: FinancialEvidence = {...blankEvidence, classification: "financial record"};
const blankMetric: Metric = {
  name: "", unit: "count", direction: "increase", owner: "", baseline: null, projected: null, observed: null, baselineStart: "",
  baselineEnd: "", observationStart: "", observationEnd: "", baselineEvidence: null, observationEvidence: null, attribution: "unassessed",
  dependencies: "", comparable: false,
};
export function newValueReport(period: string): ValueReportInput {
  return {
    period, summary: "", nextSteps: "", limitations: "", kpis: [{...blankMetric}], projectedCapacityHours: null, projectedCashCents: null,
    realized: [], actualCostCents: null, actualCostEvidence: null,
  };
}

function EvidenceEditor({title, value, onChange, financial}: {
  title: string; value: Evidence; onChange: (value: Evidence) => void; financial?: boolean;
}) {
  return <fieldset className="space-y-2 rounded-lg border border-canvas-border p-3">
    <legend className="px-1 font-semibold">{title}</legend>
    <div className={formGrid}>
      {!financial && <SelectField label={title + " classification"} value={value.classification}
        choices={choices(["system export", "financial record", "controlled sample", "client confirmation", "estimate"] as const)}
        onChange={classification => onChange({...value, classification})} />}
      <TextField label={title + " reference"} value={value.reference} onChange={reference => onChange({...value, reference})} />
      <TextField label={title + " captured date"} type="date" value={value.capturedOn} onChange={capturedOn => onChange({...value, capturedOn})} />
      <TextField label={title + " measurement method"} value={value.method} onChange={method => onChange({...value, method})} />
    </div>
  </fieldset>;
}

export function ValueEditor({value, onChange}: {value: ValueReportInput; onChange: (value: ValueReportInput) => void}) {
  const set = <K extends keyof ValueReportInput>(key: K, next: ValueReportInput[K]) => onChange({...value, [key]: next});
  return <>
    <div className={card}>
      <div className={formGrid}>
        <TextField label="Monthly summary" value={value.summary} multiline onChange={next => set("summary", next)} />
        <TextField label="Next actions" value={value.nextSteps} multiline onChange={next => set("nextSteps", next)} />
        <TextField label="Limitations and assumptions" value={value.limitations} multiline onChange={next => set("limitations", next)} />
        <NumericField label="Projected capacity recovered (hours)" value={value.projectedCapacityHours} onChange={next => set("projectedCapacityHours", next)} />
        <NumericField label="Projected cash benefit (USD)" currency value={value.projectedCashCents} onChange={next => set("projectedCashCents", next)} />
        <NumericField label="Actual costs (USD)" currency value={value.actualCostCents}
          onChange={next => onChange({...value, actualCostCents: next, actualCostEvidence: next === null ? null : value.actualCostEvidence ?? blankFinancial})} />
      </div>
      {value.actualCostEvidence && <EvidenceEditor title="Actual cost evidence" financial value={value.actualCostEvidence}
        onChange={item => set("actualCostEvidence", {...item, classification: "financial record"})} />}
    </div>
    {value.kpis.map((metric, index) => {
      const change = <K extends keyof Metric>(key: K, next: Metric[K]) => set("kpis", value.kpis.map((row, i) => i === index ? {...row, [key]: next} : row));
      return <fieldset key={index} className={card}>
        <legend className="px-1 font-bold">KPI {index + 1}</legend>
        <div className={formGrid}>
          <TextField label="KPI name" value={metric.name} onChange={next => change("name", next)} />
          <TextField label="KPI owner" value={metric.owner} onChange={next => change("owner", next)} />
          <SelectField label="Unit" value={metric.unit} choices={choices(["hours", "count", "percent", "USD", "minutes"] as const)} onChange={next => change("unit", next)} />
          <SelectField label="Desired direction" value={metric.direction} choices={choices(["increase", "decrease"] as const)} onChange={next => change("direction", next)} />
          <NumericField label="Baseline value" value={metric.baseline} onChange={next => change("baseline", next)} />
          <NumericField label="Projected value" value={metric.projected} onChange={next => change("projected", next)} />
          <NumericField label="Observed value" value={metric.observed} onChange={next => change("observed", next)} />
          <SelectField label="Attribution confidence" value={metric.attribution}
            choices={choices(["unassessed", "low", "medium", "high"] as const)} onChange={next => change("attribution", next)} />
          {([["baselineStart", "Baseline start"], ["baselineEnd", "Baseline end"], ["observationStart", "Observation start"],
            ["observationEnd", "Observation end"]] as const).map(([key, label]) =>
            <TextField key={key} label={label} type="date" value={metric[key]} onChange={next => change(key, next)} />)}
          <TextField label="Dependencies and attribution rationale" value={metric.dependencies} multiline onChange={next => change("dependencies", next)} />
        </div>
        {(metric.baseline !== null || metric.baselineEvidence) && <EvidenceEditor title="Baseline evidence" value={metric.baselineEvidence ?? blankEvidence}
          onChange={next => change("baselineEvidence", next)} />}
        {(metric.observed !== null || metric.observationEvidence) && <EvidenceEditor title="Observation evidence" value={metric.observationEvidence ?? blankEvidence}
          onChange={next => change("observationEvidence", next)} />}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={metric.comparable}
          onChange={event => change("comparable", event.target.checked)} /> Periods and measurement methods are comparable</label>
        {value.kpis.length > 1 && <Remove label="KPI" index={index} remove={() => set("kpis", value.kpis.filter((_, i) => i !== index))} />}
      </fieldset>;
    })}
    <button type="button" className="btn-ghost" disabled={value.kpis.length >= 20} onClick={() => set("kpis", [...value.kpis, {...blankMetric}])}>Add KPI</button>
    {value.realized.map((entry, index) => {
      const change = (next: typeof entry) => set("realized", value.realized.map((row, i) => i === index ? next : row));
      return <fieldset key={index} className={card}>
        <legend className="px-1 font-bold">Realized cash item {index + 1}</legend>
        <div className={formGrid}>
          <TextField label="Financial outcome" value={entry.label} onChange={label => change({...entry, label})} />
          <NumericField label="Realized amount (USD)" currency value={entry.amountCents} onChange={next => change({...entry, amountCents: next ?? 0})} />
        </div>
        <EvidenceEditor title="Realized cash evidence" financial value={entry.evidence} onChange={next => change({...entry, evidence: {...next, classification: "financial record"}})} />
        <Remove label="cash item" index={index} remove={() => set("realized", value.realized.filter((_, i) => i !== index))} />
      </fieldset>;
    })}
    <button type="button" className="btn-ghost" disabled={value.realized.length >= 20}
      onClick={() => set("realized", [...value.realized, {label: "", amountCents: 0, evidence: {...blankFinancial}}])}>Add realized cash item</button>
  </>;
}


export function newChangeOrder(reference: string): ChangeOrderInput {
  return {reference, title: "", scope: "", reason: "", timeline: "", acceptance: "",
    includedHours: 0, additionalHourlyCents: 10000, additionalFeeCents: 0, commercialTerms: ""};
}

export function ChangeOrderEditor({value, onChange, locked}: {value: ChangeOrderInput; onChange: (value: ChangeOrderInput) => void; locked: boolean}) {
  const fields = [["title", "Title"], ["scope", "Additional scope"], ["reason", "Reason for change"],
    ["timeline", "Schedule impact"], ["acceptance", "Acceptance criteria"], ["commercialTerms", "Payment terms and dependencies"]] as const;
  return <fieldset className={card} disabled={locked}>
    <legend className="px-1 font-bold">{value.reference}</legend>
    <p className="text-sm">{locked ? "The client accepted this revision." : "Publish reviewed terms for the client to accept. An accepted change order remains separate from the original proposal and invoice."}</p>
    <div className={formGrid}>
      {fields.map(([field, label]) => <TextField key={field} label={label} value={value[field]}
        onChange={next => onChange({...value, [field]: next})} multiline={field !== "title"} />)}
      <NumericField label="Hours covered by change" value={value.includedHours} onChange={next => onChange({...value, includedHours: next ?? 0})} />
      <NumericField label="Additional-work hourly rate (USD)" currency min={100} value={value.additionalHourlyCents}
        onChange={next => onChange({...value, additionalHourlyCents: next ?? 0})} />
      <NumericField label="Total additional fee (USD)" currency value={value.additionalFeeCents}
        onChange={next => onChange({...value, additionalFeeCents: next ?? 0})} />
    </div>
  </fieldset>;
}
