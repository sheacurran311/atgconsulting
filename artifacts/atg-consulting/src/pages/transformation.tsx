import { useState } from "react";
import { marketingBody } from "../../../api-server/src/lib/marketingDocument";
import { marketingPage } from "../../../api-server/src/lib/transformationMarketing";

export function TransformationPage({path}: {path: string}) {
  const page = marketingPage(path);
  if (!page) return null;
  return <>
    <div dangerouslySetInnerHTML={{__html: marketingBody(page)}} />
    {page.path === "/value-realization" && <ValueScenario />}
  </>;
}

function ValueScenario() {
  const [hours, setHours] = useState("");
  const [cost, setCost] = useState("");
  const [reduction, setReduction] = useState("");
  const [realizable, setRealizable] = useState("");
  const weekly = Number(hours);
  const hourlyCost = Number(cost);
  const percent = Number(reduction);
  const cashShare = Number(realizable);
  const hasCapacityInputs = !!hours && !!cost && !!reduction && weekly >= 0 && weekly <= 168 && hourlyCost >= 0 &&
    hourlyCost <= 1000 && percent >= 0 && percent <= 100;
  const monthlyHours = weekly * percent / 100 * 52 / 12;
  const capacity = monthlyHours * hourlyCost;
  const hasCashInputs = hasCapacityInputs && !!realizable && cashShare >= 0 && cashShare <= 100;
  const dollars = (value: number) => value.toLocaleString("en-US", {style: "currency", currency: "USD"});
  return <section className="mx-auto mb-16 max-w-wide px-4 sm:px-6 lg:px-8" aria-labelledby="scenario-title">
    <div className="max-w-3xl space-y-4 rounded-2xl border border-canvas-border bg-canvas-1 p-5 sm:p-7">
      <h2 id="scenario-title" className="text-2xl font-extrabold">Estimate the capacity a workflow could recover</h2>
      <p className="text-sm">Enter your assumptions. The scenario uses 52 weeks per year and excludes implementation and ongoing costs.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ["Hours spent each week", hours, setHours, 168], ["Loaded employee hourly cost (USD)", cost, setCost, 1000],
          ["Expected time reduction (%)", reduction, setReduction, 100], ["Share that could become cash savings (%)", realizable, setRealizable, 100],
        ] as const).map(([label, value, change, max]) => <label className="text-sm font-semibold" key={label}>
          {label}
          <input type="number" min={0} max={max} step="any" value={value} onChange={event => change(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-canvas-border bg-canvas px-3 py-2" />
        </label>)}
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-3" aria-live="polite">
        <div><dt>Projected monthly hours</dt><dd className="font-bold">{hasCapacityInputs ? monthlyHours.toFixed(1) : "Enter assumptions"}</dd></div>
        <div><dt>Projected monthly capacity value</dt><dd className="font-bold">{hasCapacityInputs ? dollars(capacity) : "Enter assumptions"}</dd></div>
        <div><dt>Possible monthly cash savings</dt><dd className="font-bold">{hasCashInputs ? dollars(capacity * cashShare / 100) : "Enter cash share"}</dd></div>
      </dl>
    </div>
  </section>;
}
