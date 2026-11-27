import { useState } from "react";
import { adminJson } from "@/lib/adminWork";
import { usd } from "@/lib/engagementWorkspace";
import { card, formGrid, NumericField } from "./EngagementFields";

type Metrics = {
  asOf: string; completeProposalCoverage: boolean; pipeline: Record<string, number>;
  funnel: {completedIntakes: number; completedFitCalls: number; upcomingConsultations: number; heldConsultations: number; suppressedIdentities: number};
  proposals: {draft: number; approvedAwaitingAcceptance: number; accepted: number; indicativeDraftCents: number; offeredCents: number; contractedCents: number};
  collection: {stripeRecords: number; stripeNetCents: number; clientLedgerRecords: number; clientLedgerNetCents: number};
  delivery: {openMilestones: number; overdueMilestones: number; activeClients: number; acceptedActive: number; modeledAcceptedActive: number;
    estimatedSetupHours: number; estimatedRecurringHours: number; includedAdvisoryHours: number; modeledRecurringFeeCents: number; modeledRecurringContributionCents: number};
};

export default function OwnerMetrics() {
  const [metrics, setMetrics] = useState<Metrics>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<number | null>(null);
  const [overhead, setOverhead] = useState<number | null>(null);
  const [setup, setSetup] = useState<number | null>(null);
  const [reserve, setReserve] = useState<number | null>(null);

  async function load() {
    setLoading(true); setError("");
    try {setMetrics(await adminJson<Metrics>("/api/admin/owner-metrics"));}
    catch (err) {setError(err instanceof Error ? err.message : "Could not load business operations.");}
    finally {setLoading(false);}
  }

  const usable = available !== null && overhead !== null && setup !== null && reserve !== null && metrics
    ? available - overhead - setup - reserve - metrics.delivery.estimatedRecurringHours : null;
  return <section className={card} aria-label="Business operations and founder capacity">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-bold">Business operations</h2>
      <button type="button" className="btn-secondary" disabled={loading} onClick={() => void load()}>{metrics ? "Refresh metrics" : "Load operations metrics"}</button>
    </div>
    {loading && <p role="status">Loading operations metrics…</p>}
    {error && <p role="alert">{error}</p>}
    {metrics && <>
      <p className="text-sm">Recorded totals through {new Date(metrics.asOf).toLocaleString()}. Prospect stages are a current snapshot.</p>
      {!metrics.completeProposalCoverage && <p role="status">Proposal totals cover the most recent records. Export for a complete commercial history.</p>}
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {([
          ["Completed intakes", metrics.funnel.completedIntakes], ["Completed fit calls", metrics.funnel.completedFitCalls],
          ["Consultations held", metrics.funnel.heldConsultations], ["Consultations in next 30 days", metrics.funnel.upcomingConsultations],
          ["Permanently suppressed contact identities", metrics.funnel.suppressedIdentities],
          ["Draft proposals", metrics.proposals.draft], ["Approved awaiting acceptance", metrics.proposals.approvedAwaitingAcceptance],
          ["Accepted proposals", metrics.proposals.accepted], ["Draft quoted value (indicative)", usd(metrics.proposals.indicativeDraftCents)],
          ["Approved offered value", usd(metrics.proposals.offeredCents)], ["Accepted proposal value", usd(metrics.proposals.contractedCents)],
          ["Confirmed live Stripe receipts, net of refunds", usd(metrics.collection.stripeRecords ? metrics.collection.stripeNetCents : null)],
          ["Reviewed client payment ledger (separate source)", usd(metrics.collection.clientLedgerRecords ? metrics.collection.clientLedgerNetCents : null)],
          ["Active clients", metrics.delivery.activeClients], ["Open assigned milestones", metrics.delivery.openMilestones],
          ["Overdue assigned milestones", metrics.delivery.overdueMilestones],
          ["Modeled active recurring fees per month", usd(metrics.delivery.modeledAcceptedActive ? metrics.delivery.modeledRecurringFeeCents : null)],
          ["Modeled active monthly contribution", usd(metrics.delivery.modeledAcceptedActive ? metrics.delivery.modeledRecurringContributionCents : null)],
          ["Modeled advisory hours per month", metrics.delivery.includedAdvisoryHours],
        ] as const).map(([label, value]) => <div key={label}><dt className="text-sm font-medium">{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <p className="text-sm">The two receipt sources can overlap. Reconcile them to accounting before totaling cash or open invoices. Recurring and capacity estimates cover {metrics.delivery.modeledAcceptedActive} of {metrics.delivery.acceptedActive} accepted proposals for active clients.</p>
      <details className="space-y-3">
        <summary className="cursor-pointer font-semibold">Prospect stages</summary>
        {Object.keys(metrics.pipeline).length ? <dl className="grid gap-2 sm:grid-cols-3">{Object.entries(metrics.pipeline).map(([stage, count]) =>
          <div key={stage}><dt>{stage.replaceAll("_", " ").toLowerCase()}</dt><dd>{count}</dd></div>)}</dl> : <p>No prospect records yet.</p>}
      </details>
      <section className={card}>
        <h3 className="font-semibold">Monthly founder capacity scenario</h3>
        <p className="text-sm">Modeled recurring commitments account for {metrics.delivery.estimatedRecurringHours} hours per month.
          Accepted estimates contain {metrics.delivery.estimatedSetupHours} total setup hours. Enter the remaining setup hours you intend to deliver this month.</p>
        <div className={formGrid}>
          <NumericField label="Available founder hours" value={available} onChange={setAvailable} />
          <NumericField label="Planned implementation hours this month" value={setup} onChange={setSetup} />
          <NumericField label="Sales, discovery and administration hours" value={overhead} onChange={setOverhead} />
          <NumericField label="Incident reserve hours" value={reserve} onChange={setReserve} />
        </div>
        <p role="status">{usable === null ? "Complete the scenario to see available capacity."
          : usable < 0 ? "Scenario exceeds capacity by " + Math.abs(usable).toFixed(1) + " hours."
          : usable.toFixed(1) + " hours available after recorded and planned commitments."}</p>
      </section>
    </>}
  </section>;
}
