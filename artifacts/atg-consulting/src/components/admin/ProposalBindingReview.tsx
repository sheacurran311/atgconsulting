import { useEffect, useState } from "react";
import { adminJson } from "@/lib/adminWork";
import { card, NumericField, SelectField } from "./EngagementFields";

type Options = {
  measurement: {version: number; title: string} | null;
  sla: {version: number; status: string} | null;
  opportunities: {reference: string; version: number; title: string}[];
};
export type Selection = {additionalHourlyCents: number; measurementVersion: number; slaVersion: number | null; opportunityRefs: {reference: string; version: number}[]};

export default function ProposalBindingReview({intakeId, clientId, onApprove, busy, eligible}: {
  intakeId: string; clientId: string | null; onApprove: (selection: Selection) => void; busy: boolean; eligible: boolean;
}) {
  const [rate, setRate] = useState<number | null>(10000);
  const [options, setOptions] = useState<Options>();
  const [selection, setSelection] = useState<{plan: string; sla: string; opportunities: string[]}>({plan: "", sla: "", opportunities: []});
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    if (clientId) adminJson<Options>(`/api/admin/discovery/${encodeURIComponent(intakeId)}/proposal/binding-options`)
      .then(result => {if (active) setOptions(result);})
      .catch((err: Error) => {if (active) setError(err.message);});
    return () => {active = false;};
  }, [intakeId, clientId, reload]);
  const ready = !!options?.measurement && !!selection.plan && !!selection.sla && rate !== null && rate >= 10000 && eligible;
  return <section className={card} aria-label="Proposal approval">
    <h3 className="font-bold">Review and approve proposal</h3>
    {!clientId ? <p className="text-sm">Convert or link this intake to a client to prepare the measurement plan.</p> : <>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : !options && <p role="status">Loading commercial revisions…</p>}
      {options && !options.measurement && <p className="text-sm">Publish an approved Value Measurement Plan from the engagement workspace.</p>}
      {options?.measurement && <SelectField label="Measurement plan for this proposal" value={selection.plan}
        onChange={plan => setSelection({...selection, plan})} choices={[
          {value: "", label: "Select reviewed plan"}, {value: String(options.measurement.version), label: options.measurement.title + " · Revision " + options.measurement.version},
        ]} />}
      {options && <NumericField label="Additional-work hourly rate in proposal (USD)" value={rate} min={100} currency onChange={setRate} />}
      {options && <SelectField label="SLA for this proposal" value={selection.sla} onChange={sla => setSelection({...selection, sla})}
        choices={[{value: "", label: "Review SLA selection"}, options.sla ? {value: String(options.sla.version), label: "Revision " + options.sla.version + " · " + options.sla.status}
          : {value: "none", label: "No SLA accompanies this proposal"}]} />}
      {options && options.opportunities.length > 0 && <fieldset className="space-y-2 text-sm">
        <legend className="font-semibold">Reviewed opportunities included in scope</legend>
        {options.opportunities.map(item => <label key={item.reference} className="flex items-start gap-2">
          <input type="checkbox" checked={selection.opportunities.includes(item.reference)} onChange={event =>
            setSelection({...selection, opportunities: event.target.checked ? [...selection.opportunities, item.reference] : selection.opportunities.filter(ref => ref !== item.reference)})} />
          {item.title} · {item.reference} · revision {item.version}
        </label>)}
      </fieldset>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={busy || !ready} onClick={() =>
          onApprove({additionalHourlyCents: rate ?? 0, measurementVersion: Number(selection.plan), slaVersion: selection.sla === "none" ? null : Number(selection.sla),
            opportunityRefs: options?.opportunities.filter(item => selection.opportunities.includes(item.reference))
              .map(({reference, version}) => ({reference, version})) ?? []})}>{busy ? "Approving…" : "Approve proposal and selected revisions"}</button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => {
          setOptions(undefined); setError(""); setSelection({plan: "", sla: "", opportunities: []}); setReload(current => current + 1);
        }}>Refresh commercial revisions</button>
      </div>
    </>}
  </section>;
}
