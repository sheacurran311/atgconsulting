import { useEffect, useState } from "react";
import { adminJson } from "@/lib/adminWork";
import { card } from "./EngagementFields";

type Payment = {liveMode: boolean; authorizedAt: string | null; invoiceId: string | null; paidAt: string | null; refundedCents: number};
type Billing = {
  accepted: boolean; liveEnabled: boolean;
  installments: {stage: number; label: string; amount: string; payment: Payment | null}[];
};

export default function EngagementBilling({clientId, intakeId}: {clientId: string; intakeId: string}) {
  const [billing, setBilling] = useState<Billing>();
  const [error, setError] = useState("");
  const [pending, setPending] = useState<number>();
  const [stage, setStage] = useState<number>();
  const url = "/api/admin/clients/" + encodeURIComponent(clientId) + "/discovery/" + encodeURIComponent(intakeId) + "/billing";
  useEffect(() => {
    let active = true;
    adminJson<Billing>(url).then(result => {if (active) setBilling(result);})
      .catch((err: Error) => {if (active) setError(err.message);});
    return () => {active = false;};
  }, [url]);

  async function authorize(stage: number) {
    setError("");
    setPending(stage);
    try {
      await adminJson(url + "/" + stage + "/authorize", {
        method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({confirm: true}),
      });
      setBilling(await adminJson<Billing>(url));
      setStage(undefined);
    } catch (err) {setError(err instanceof Error ? err.message : "Could not verify authorization.");}
    finally {setPending(undefined);}
  }
  return <section className={card}>
    <h3 className="font-bold">Proposal installments</h3>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {!billing ? !error && <p role="status" className="text-sm">Loading installments…</p> : !billing.accepted ?
      <p className="text-sm">Approved installments appear here after the client accepts the proposal.</p> : <>
      <p className="text-sm">{billing.liveEnabled ? "Enable individual installments after checking the agreed schedule and amount. Clients open Checkout from their proposal." :
        "Live Stripe payments are disabled. Use the agreed manual invoice process."}</p>
      <ul className="space-y-2">{billing.installments.map(item => <li key={item.stage} className="space-y-2 rounded-lg border border-canvas-border p-3 text-sm">
        <p className="break-words font-semibold">{item.label} · USD {item.amount}</p>
        {item.payment && <p>
          {item.payment.liveMode ? "Live" : "Sandbox"} · {item.payment.refundedCents ? "Refund recorded" : item.payment.paidAt ? "Paid" : "Awaiting payment"}
          {item.payment.invoiceId && <span className="break-all"> · Stripe invoice {item.payment.invoiceId}</span>}
        </p>}
        {billing.liveEnabled && !item.payment && (stage === item.stage ? <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={pending !== undefined} onClick={() => void authorize(item.stage)}>Confirm one-time Checkout</button>
          <button type="button" className="btn-ghost" disabled={pending !== undefined} onClick={() => setStage(undefined)}>Cancel</button>
        </div> : <button type="button" className="btn-ghost" onClick={() => setStage(item.stage)}>Review installment for Stripe</button>)}
      </li>)}</ul>
    </>}
  </section>;
}
