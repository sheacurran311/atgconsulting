import { useEffect, useState } from "react";
import { adminJson } from "@/lib/adminWork";
import { card, formGrid, SelectField, TextField } from "./EngagementFields";

type Consultation = {id: string; title: string};
type Assignment = {consultationId: string; owner: "CLIENT" | "ADMIN"; dueAt: string | null; clientVisible: boolean;
  done: boolean; evidenceReference: string | null; updatedAt: string | null};
type Milestone = {sequence: number; title: string; deliverable: string; assignment: Assignment | null};
export default function EngagementMilestones({clientId, intakeId}: {clientId: string; intakeId: string}) {
  const [data, setData] = useState<{milestones: Milestone[]; consultations: Consultation[]}>();
  const [error, setError] = useState("");
  const path = "/api/admin/clients/" + encodeURIComponent(clientId) + "/discovery/" + encodeURIComponent(intakeId) + "/delivery";
  useEffect(() => {
    let active = true;
    adminJson<{milestones: Milestone[]; consultations: Consultation[]}>(path)
      .then(result => {if (active) setData(result);}).catch((err: Error) => {if (active) setError(err.message);});
    return () => {active = false;};
  }, [path]);
  return <section className={card}>
    <h3 className="font-bold">Delivery milestones</h3>
    {error && <p role="alert" className="text-sm">{error}</p>}
    {data && (data.milestones.length === 0 ? <p className="text-sm">Milestones appear here after the client accepts a proposal with a delivery plan.</p> :
      data.consultations.length === 0 ? <p className="text-sm">Create a consultation for this client before assigning a milestone.</p> :
      data.milestones.map(item => <MilestoneEditor key={item.sequence} path={path + "/" + item.sequence} item={item} consultations={data.consultations} />))}
  </section>;
}

function MilestoneEditor({path, item, consultations}: {path: string; item: Milestone; consultations: Consultation[]}) {
  const [value, setValue] = useState<Assignment>(item.assignment ?? {
    consultationId: "", owner: "ADMIN", dueAt: "", clientVisible: false, done: false, evidenceReference: "", updatedAt: null,
  });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  return <details className="space-y-3 rounded-lg border border-canvas-border p-3">
    <summary className="cursor-pointer break-words font-semibold">{item.title}{value.updatedAt && (value.done ? " · Complete" : " · Assigned")}</summary>
    <p className="break-words text-sm">{item.deliverable}</p>
    <div className={formGrid}>
      <SelectField label="Consultation" value={value.consultationId}
        choices={[{value: "", label: "Choose consultation"}, ...consultations.map(row => ({value: row.id, label: row.title}))]}
        onChange={consultationId => setValue({...value, consultationId})} />
      <SelectField label="Owner" value={value.owner} onChange={owner => setValue({...value, owner})}
        choices={[{value: "ADMIN", label: "ATG"}, {value: "CLIENT", label: "Client"}]} />
      <TextField label="Due date" type="date" value={value.dueAt?.slice(0, 10) ?? ""} onChange={dueAt => setValue({...value, dueAt})} />
      <TextField label="Private verification evidence" value={value.evidenceReference ?? ""} onChange={evidenceReference => setValue({...value, evidenceReference})} />
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={value.clientVisible}
        onChange={event => setValue({...value, clientVisible: event.target.checked})} /> Show this action in client consultations</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={value.done}
        onChange={event => setValue({...value, done: event.target.checked})} /> Mark complete</label>
    </div>
    <button type="button" className="btn-ghost" disabled={busy || !value.consultationId || !value.dueAt || (value.done && !value.evidenceReference?.trim())}
      onClick={async () => {
        setBusy(true);
        setNotice("");
        try {
          const {updatedAt, ...data} = value;
          const result = await adminJson<Assignment>(path, {
            method: "PUT", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({...data, dueAt: data.dueAt?.slice(0, 10), evidenceReference: data.evidenceReference ?? "", expectedUpdatedAt: updatedAt}),
          });
          setValue({consultationId: result.consultationId, owner: result.owner, dueAt: result.dueAt, clientVisible: result.clientVisible,
            done: result.done, evidenceReference: result.evidenceReference, updatedAt: result.updatedAt});
          setNotice("Milestone assignment saved.");
        } catch (err) {setNotice(err instanceof Error ? err.message : "Could not save the assignment.");}
        finally {setBusy(false);}
      }}>Save milestone assignment</button>
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </details>;
}
