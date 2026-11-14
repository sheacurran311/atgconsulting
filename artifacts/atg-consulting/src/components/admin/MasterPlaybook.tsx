import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function MasterPlaybook() {
  const [steps, setSteps] = useState<Array<{ stage: string; action: string }>>([]);
  const [error, setError] = useState(false);
  useEffect(() => { api.admin.masterPlaybook().then(setSteps).catch(() => setError(true)); }, []);
  return <details className="rounded-xl border p-4 my-4">
    <summary className="cursor-pointer font-semibold">Master playbook · fit call through handoff</summary>
    {error && <p role="alert">Could not load the master playbook. Refresh to retry.</p>}
    {steps.map((step) => <div key={step.stage} className="mt-4"><strong>{step.stage}</strong><p className="text-sm">{step.action}</p></div>)}
  </details>;
}
