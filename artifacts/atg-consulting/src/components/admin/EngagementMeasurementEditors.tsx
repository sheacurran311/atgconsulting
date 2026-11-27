import type { MeasurementConfig, MeasurementPlanInput, OpportunityReview, ReadinessReview } from "@/lib/engagementWorkspace";
import { card, formGrid, NumericField, SelectField, TextField } from "./EngagementFields";

const dimensions = ["infrastructure", "data", "process", "adoption", "governance", "team"] as const;
const criteria = {impact: "Business impact (30%)", roi: "ROI potential (25%)", feasibility: "Implementation feasibility (20%)",
  urgency: "Business urgency (15%)", confidence: "Evidence confidence (10%)"} as const;
const blank = () => ({score: null, evidence: ""});
const scoreChoices = [{value: "", label: "Unknown"}, ...[0, 1, 2, 3, 4].map(value => ({value: String(value), label: String(value)}))];

export const emptyReadiness = (period: string): ReadinessReview => ({
  period, title: "AI readiness assessment", summary: "", recommendations: [],
  scores: {infrastructure: blank(), data: blank(), process: blank(), adoption: blank(), governance: blank(), team: blank()},
});
export const emptyOpportunity = (reference: string): OpportunityReview => ({
  reference, title: "", validatedFacts: "", assumptions: "", missingInformation: "", recommendation: "", adjustmentReason: "",
  scores: {serviceId: "", impact: blank(), roi: blank(), feasibility: blank(), urgency: blank(), confidence: blank()},
});

function Score({label, description, value, change}: {label: string; description?: string;
  value: {score: number | null; evidence: string}; change: (value: {score: number | null; evidence: string}) => void}) {
  return <fieldset className={card}>
    <legend className="font-semibold">{label}</legend>
    {description && <p className="text-sm">{description}</p>}
    <SelectField label={label + " score"} value={value.score === null ? "" : String(value.score)} choices={scoreChoices}
      onChange={input => change({...value, score: input === "" ? null : Number(input)})} />
    <TextField multiline label={label + " evidence"} value={value.evidence} onChange={evidence => change({...value, evidence})} />
  </fieldset>;
}

export function ReadinessEditor({value, change, config}: {value: ReadinessReview; change: (value: ReadinessReview) => void; config: MeasurementConfig}) {
  const known = dimensions.filter(key => value.scores[key].score !== null).length;
  return <div className="space-y-4">
    <div className={card}>
      <TextField label="Assessment title" value={value.title} onChange={title => change({...value, title})} />
      <p role="status">{known} of 6 dimensions assessed. The overall score requires evidence for all six.</p>
      <details><summary className="cursor-pointer font-semibold">Scoring rubric</summary>
        <ol start={0} className="ml-5 list-decimal text-sm">{config.readinessLevels.map(level => <li key={level}>{level}</li>)}</ol>
      </details>
    </div>
    <div className={formGrid}>{dimensions.map(key =>
      <Score key={key} label={config.readinessRubric[key][0]} description={config.readinessRubric[key][1]}
        value={value.scores[key]} change={score => change({...value, scores: {...value.scores, [key]: score}})} />
    )}</div>
    <div className={card}>
      <TextField label="Client-visible assessment summary" multiline value={value.summary} onChange={summary => change({...value, summary})} />
      {value.recommendations.map((recommendation, index) => <div className={formGrid} key={index}>
        <SelectField label="Recommendation dimension" value={recommendation.dimension}
          choices={dimensions.map(key => ({value: key, label: config.readinessRubric[key][0]}))}
          onChange={dimension => change({...value, recommendations: value.recommendations.map((item, i) => i === index ? {...item, dimension} : item)})} />
        <TextField label="Recommended action" value={recommendation.action} onChange={action =>
          change({...value, recommendations: value.recommendations.map((item, i) => i === index ? {...item, action} : item)})} />
        <button type="button" className="btn-ghost self-start" onClick={() =>
          change({...value, recommendations: value.recommendations.filter((_, i) => i !== index)})}>Remove recommendation {index + 1}</button>
      </div>)}
      <button type="button" className="btn-ghost" disabled={value.recommendations.length >= 12} onClick={() =>
        change({...value, recommendations: [...value.recommendations, {dimension: "infrastructure", action: ""}]})}>Add recommendation</button>
    </div>
  </div>;
}

export function OpportunityEditor({value, change, config, lockedService}: {value: OpportunityReview; change: (value: OpportunityReview) => void;
  config: MeasurementConfig; lockedService: boolean}) {
  return <div className="space-y-4">
    <div className={card}>
      <TextField label="Opportunity title" value={value.title} onChange={title => change({...value, title})} />
      {lockedService ? <p className="text-sm">Service · {config.services.find(service => service.id === value.scores.serviceId)?.name}</p>
        : <SelectField label="Opportunity service" value={value.scores.serviceId}
          choices={[{value: "", label: "Select service"}, ...config.services.map(service => ({value: service.id, label: service.name}))]}
          onChange={serviceId => change({...value, scores: {...value.scores, serviceId}})} />}
      <div className={formGrid}>{(["validatedFacts", "assumptions", "missingInformation", "recommendation", "adjustmentReason"] as const).map((key, i) =>
        <TextField key={key} label={["Validated facts", "Assumptions to test", "Missing information", "Recommended next action", "Reason for adjusted scores"][i]}
          value={value[key]} multiline onChange={input => change({...value, [key]: input})} />)}</div>
    </div>
    <div className={formGrid}>{(Object.keys(criteria) as (keyof typeof criteria)[]).map(key =>
      <Score key={key} label={criteria[key]} value={value.scores[key]} change={score => change({...value, scores: {...value.scores, [key]: score}})} />)}</div>
    <p className="text-sm">Use 0 when evidence supports the lowest rating and 4 when it supports the strongest rating. Leave the score unknown when evidence is missing.</p>
  </div>;
}

type Metric = MeasurementPlanInput["metrics"][number];
type Forecast = NonNullable<MeasurementPlanInput["forecast"]>;
const metric = (kpiId: string): Metric => ({
  kpiId, workstream: "", owner: "", source: "", evidence: "", comparableWorkload: "", baseline: null, target: null,
  baselineStart: "", baselineEnd: "", collectionPlan: "", evidenceClass: "Not yet measurable", attribution: "", limitations: "", dependencies: "",
});
export const emptyMeasurement = (): MeasurementPlanInput => ({
  title: "Value Measurement Plan", objectives: "", cadence: "", evaluationOn: "", registryVersion: 1, calculationVersion: 1,
  metrics: [], forecast: null,
});
const evidenceOptions = ["System verified", "Document verified", "Client reported", "Estimated", "Not yet measurable"] as const;
const scenarios = ["conservative", "expected", "optimistic"] as const;
const emptyScenario = () => ({reductionPercent: 0, adoptionPercent: 0, effectivenessPercent: 0, realizablePercent: 0,
  incrementalMonthlyRevenueCents: 0, contributionMarginPercent: 0, attributionPercent: 0, rampMonths: 0});
const newForecast = (): Forecast => ({monthlyWorkload: null, minutesPerUnit: null, hourlyCostCents: null,
  implementationFeeCents: 0, recurringFeeCents: 0, monthlyExpenseCents: 0, months: 12,
  conservative: emptyScenario(), expected: emptyScenario(), optimistic: emptyScenario()});

function ForecastEditor({value, change}: {value: Forecast; change: (value: Forecast) => void}) {
  const shared = [
    ["monthlyWorkload", "Monthly workload", false], ["minutesPerUnit", "Minutes per unit", false],
    ["hourlyCostCents", "Client loaded hourly employee cost (USD)", true], ["implementationFeeCents", "Implementation fee (USD)", true],
    ["recurringFeeCents", "Monthly fee (USD)", true], ["monthlyExpenseCents", "Incremental monthly operating cost (USD)", true],
    ["months", "Engagement term in months", false],
  ] as const;
  const inputs = [
    ["reductionPercent", "Workload reduction (%)"], ["adoptionPercent", "Adoption (%)"], ["effectivenessPercent", "Effectiveness (%)"],
    ["realizablePercent", "Financially realizable share of capacity (%)"], ["incrementalMonthlyRevenueCents", "Incremental monthly revenue (USD)"],
    ["contributionMarginPercent", "Client contribution margin on incremental revenue (%)"], ["attributionPercent", "Assumed attributable share (%)"],
    ["rampMonths", "Ramp-up months"],
  ] as const;
  return <div className="space-y-3">
    <div className={formGrid}>{shared.map(([key, label, currency]) => <NumericField key={key} label={label} currency={currency} value={value[key]}
      min={key === "months" ? 1 : 0}
      onChange={number => change({...value, [key]: key === "monthlyWorkload" || key === "minutesPerUnit" || key === "hourlyCostCents" ? number : number ?? (key === "months" ? 1 : 0)})} />)}</div>
    {scenarios.map(scenario => <details key={scenario} className={card}>
      <summary className="cursor-pointer font-semibold capitalize">{scenario} assumptions</summary>
      <div className={formGrid}>{inputs.map(([key, label]) => <NumericField key={key} label={label} value={value[scenario][key]}
        currency={key === "incrementalMonthlyRevenueCents"}
        onChange={number => change({...value, [scenario]: {...value[scenario], [key]: number ?? 0}})} />)}</div>
    </details>)}
  </div>;
}

export function MeasurementEditor({value, change, config}: {value: MeasurementPlanInput; change: (value: MeasurementPlanInput) => void; config: MeasurementConfig}) {
  return <div className="space-y-3">
    <div className={card}>
      <div className={formGrid}>
        <TextField label="Plan title" value={value.title} onChange={title => change({...value, title})} />
        <TextField label="Reporting cadence" value={value.cadence} onChange={cadence => change({...value, cadence})} />
        <TextField label="Initial evaluation date" type="date" value={value.evaluationOn} onChange={evaluationOn => change({...value, evaluationOn})} />
        <TextField label="Business objectives" multiline value={value.objectives} onChange={objectives => change({...value, objectives})} />
      </div>
    </div>
    {value.metrics.map((row, index) => {
      const definition = config.registry.find(item => item.id === row.kpiId);
      const assign = (patch: Partial<Metric>) => change({...value, metrics: value.metrics.map((item, i) => i === index ? {...item, ...patch} : item)});
      return <fieldset key={index} className={card}>
        <legend className="font-bold">KPI {index + 1}</legend>
        <SelectField label="KPI definition" value={row.kpiId} onChange={kpiId => assign({kpiId})}
          choices={[{value: "", label: "Select a KPI"}, ...config.registry.map(item => ({
            value: item.id, label: (config.services.find(service => service.id === item.serviceId)?.name ?? item.serviceId) + " · " + item.name}))]} />
        {definition && <details className="space-y-2 text-sm">
          <summary className="cursor-pointer font-semibold">Definition and evidence guidance</summary>
          <p>{definition.formula} · {definition.unit} · Desired direction {definition.direction}</p>
          <p>Denominator · {definition.denominator}</p><p>{definition.evidence}. {definition.method}</p>
          <p>{definition.limitation} {definition.attribution} {definition.reporting}</p>
        </details>}
        <div className={formGrid}>
          {(["workstream", "owner", "source", "evidence", "comparableWorkload", "collectionPlan", "attribution", "limitations", "dependencies"] as const)
            .map((key, i) => <TextField key={key} label={["Workstream", "Measurement owner", "Source system", "Evidence requirements", "Comparable workload",
              "Collection plan for unknown baseline", "Attribution method", "Limitations", "Dependencies"][i]}
              value={row[key]} onChange={input => assign({[key]: input})} />)}
          <NumericField label="Baseline (blank if unknown)" min={-1e12} value={row.baseline} onChange={baseline => assign({baseline})} />
          <NumericField label="Target (blank if unknown)" min={-1e12} value={row.target} onChange={target => assign({target})} />
          <TextField label="Baseline period start" type="date" value={row.baselineStart} onChange={baselineStart => assign({baselineStart})} />
          <TextField label="Baseline period end" type="date" value={row.baselineEnd} onChange={baselineEnd => assign({baselineEnd})} />
          <SelectField label="Evidence classification" value={row.evidenceClass} choices={evidenceOptions.map(value => ({value, label: value}))}
            onChange={evidenceClass => assign({evidenceClass})} />
        </div>
        <button type="button" className="btn-ghost" onClick={() => change({...value, metrics: value.metrics.filter((_, i) => i !== index)})}>Remove KPI {index + 1}</button>
      </fieldset>;
    })}
    <button type="button" className="btn-ghost" disabled={value.metrics.length >= 20} onClick={() =>
      change({...value, metrics: [...value.metrics, metric("")]})}>Add KPI</button>
    <section className={card}>
      <h3 className="font-bold">Three-scenario forecast</h3>
      {value.forecast ? <ForecastEditor value={value.forecast} change={forecast => change({...value, forecast})} />
        : <button type="button" className="btn-ghost" onClick={() => change({...value, forecast: newForecast()})}>Add forecast assumptions</button>}
      {value.forecast && <button type="button" className="btn-ghost" onClick={() => change({...value, forecast: null})}>Clear forecast from draft</button>}
    </section>
  </div>;
}
