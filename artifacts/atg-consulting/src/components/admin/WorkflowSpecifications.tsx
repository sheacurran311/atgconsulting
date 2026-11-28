import { useState } from "react";
import { transformationServices } from "@/content/transformationServices";
import type { workflowSpecifications } from "../../../../api-server/src/lib/workflowSpecifications";
import { card, SelectField, TextField } from "./EngagementFields";

export default function WorkflowSpecifications({specifications}: {specifications: typeof workflowSpecifications}) {
  const [query, setQuery] = useState("");
  const [service, setService] = useState("");
  const results = specifications.filter(spec => (!service || spec.serviceId === service) &&
    (spec.id + " " + spec.title + " " + spec.industry + " " + spec.effort).toLowerCase().includes(query.trim().toLowerCase()));
  return <details className={card}>
    <summary className="cursor-pointer font-semibold">Workflow implementation specifications</summary>
    <p className="text-sm">Review the fit, permissions, sizing, tests and acceptance before proposing a client implementation.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField label="Search specification, industry or sizing" value={query} onChange={setQuery} />
      <SelectField label="Specification service" value={service} onChange={setService} choices={[
        {value: "", label: "All services"}, ...transformationServices.map(item => ({value: item.id, label: item.name})),
      ]} />
    </div>
    <p role="status" className="text-sm">{results.length} of {specifications.length} specifications{results.length ? "" : ". Try a different search."}</p>
    {results.map(spec => <details key={spec.id} className="rounded-lg border border-canvas-border p-3 text-sm">
      <summary className="cursor-pointer font-semibold">{spec.title} · v{spec.version}</summary>
      <dl className="mt-2 grid gap-3 break-words sm:grid-cols-2">
        {([
          ["Specification", spec.id], ["Delivery status", spec.status], ["Industries", spec.industry], ["Trigger", spec.trigger], ["Inputs", spec.inputs], ["Outputs", spec.output],
          ["Processing steps", spec.steps.join(" ")], ["Dependencies and permissions", spec.dependency], ["Required review", spec.approval],
          ["Implementation sizing", spec.effort], ["Support effort", spec.support], ["Third-party expenses", spec.expenses],
          ["Exceptions and failures", spec.exception], ["Duplicate prevention", spec.duplicate], ["Acceptance", spec.acceptance],
          ["Test scenarios", spec.tests.join(" · ")], ["Rollback and recovery", spec.recovery], ["Documentation and training", spec.handoff],
          ["Monitoring", spec.monitoring], ["KPI", spec.metric], ["Existing candidates",
            [...(spec.candidates?.recipes ?? []), ...(spec.candidates?.templates ?? []), ...(spec.candidates?.modules ?? [])].map(item => item.title).join(" · ") || "Scope with consultant"],
        ] as const).map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </details>)}
  </details>;
}
