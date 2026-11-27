import { useState } from "react";

const paths = {
  before: {label: "General inquiry", summary: "The same form handles every service. A team member reads the message, looks up the area and requests any missing details.",
    capture: "Name, phone and a message", review: "A team member determines the service and asks for missing information.",
    measure: "Time a sample of inquiries and how many need another call."},
  after: {label: "Service-specific inquiry", summary: "A service page brings a visitor into a relevant form. A shared queue records the ZIP, service and review status.",
    capture: "Requested service, ZIP and preferred contact", review: "The assigned person confirms the request and approves any follow-up.",
    measure: "Compare handling time, reassignment and qualified requests over equivalent periods."},
} as const;

export default function WorkflowDemonstration() {
  const [mode, setMode] = useState<keyof typeof paths>("before");
  const [service, setService] = useState("routine");
  const [area, setArea] = useState("covered");
  const [reviewed, setReviewed] = useState(false);
  const path = paths[mode];
  return <section className="mx-auto max-w-wide px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="inquiry-demo">
    <h2 className="section-heading mb-3" id="inquiry-demo">Try a better inquiry handoff</h2>
    <p className="mb-5 max-w-2xl">Use the sample controls to compare how a service business could handle an inquiry. The examples and outcomes are illustrative.</p>
    <div className="flex flex-wrap gap-2">
      {(["before", "after"] as const).map(view => <button type="button" className={mode === view ? "btn-primary" : "btn-ghost"} key={view}
        aria-pressed={mode === view} onClick={() => {setMode(view); setReviewed(false);}}>{view === "before" ? "Before" : "After"}</button>)}
    </div>
    <div className="mt-4 space-y-4 rounded-xl border border-canvas-border bg-canvas-1 p-5">
      <h3 className="font-bold">{path.label}</h3>
      <p>{path.summary}</p>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div><dt className="font-semibold">Capture</dt><dd>{path.capture}</dd></div>
        <div><dt className="font-semibold">Review</dt><dd>{path.review}</dd></div>
        <div><dt className="font-semibold">Measure</dt><dd>{path.measure}</dd></div>
      </dl>
      {mode === "after" && <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">Sample request<select className="field-input mt-1 w-full" value={service}
            onChange={event => {setService(event.target.value); setReviewed(false);}}>
            <option value="routine">Scheduled maintenance</option><option value="urgent">Urgent service</option>
          </select></label>
          <label className="block text-sm">Sample service area<select className="field-input mt-1 w-full" value={area}
            onChange={event => {setArea(event.target.value); setReviewed(false);}}>
            <option value="covered">Inside the service area</option><option value="outside">Outside the service area</option>
          </select></label>
        </div>
        <p role="status">{service === "urgent" ? "Route to the staffed phone line." : area === "outside" ? "Flag for manual coverage review."
          : reviewed ? "Sample follow-up approved for the queue." : "Maintenance request ready for human review."}</p>
        {service === "routine" && area === "covered" && <button type="button" className="btn-ghost" disabled={reviewed}
          onClick={() => setReviewed(true)}>Approve sample follow-up</button>}
      </div>}
      <p className="text-sm">For search, compare Search Console clicks with consented conversion measures from the site. Track any observed answer-engine citation separately.</p>
      <a className="btn-primary inline-flex" href="/services/workflow-engineering">Explore workflow engineering</a>
    </div>
  </section>;
}
