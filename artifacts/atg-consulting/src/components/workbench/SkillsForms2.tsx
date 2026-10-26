/**
 * Phase 2 Workbench skill forms — Guided-tier workflows.
 * Same pattern as SkillsForms.tsx. Client approval always required.
 */
import { useState } from "react";
import { skills2Api, type OutputItem } from "@/lib/api";

type Skill2Key = "money-snapshot" | "booking-flow" | "quote-proposal" | "prospect-research";

interface Props { skillKey: Skill2Key; onOutput: (item: OutputItem) => void; onClose: () => void }

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: "var(--canvas-text)" }}>{label}</label>
      {hint && <p className="text-xs mb-1.5" style={{ color: "var(--canvas-text-3)" }}>{hint}</p>}
      {children}
    </div>
  );
}

function FormActions({ onClose, onSubmit, loading, error, label = "Generate draft" }: { onClose: () => void; onSubmit: () => void; loading: boolean; error: string | null; label?: string }) {
  return (
    <>
      {error && <p className="text-xs" style={{ color: "#DC2626" }}>{error}</p>}
      <div className="flex gap-3 pt-1">
        <button onClick={onSubmit} disabled={loading} className="btn-primary text-sm" style={{ minWidth: "140px" }}>{loading ? "Working…" : label}</button>
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
      </div>
      <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>Output appears in Today inbox for your review. Nothing is sent automatically.</p>
    </>
  );
}

// ── 5. Money snapshot ─────────────────────────────────────────────────────────
function MoneySnapshotForm({ onOutput, onClose }: Omit<Props, "skillKey">) {
  const [f, setF] = useState({ data: "", weekEnding: new Date().toISOString().slice(0,10), businessName: "" });
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (!f.data.trim()) { setError("Paste your CSV or financial summary."); return; }
    setLoading(true); setError(null);
    try { const { output } = await skills2Api.moneySnapshot(f); onOutput(output); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed."); } finally { setLoading(false); }
  }
  return (
    <div className="space-y-4">
      <div><p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>MONEY SNAPSHOT · GUIDED</p>
        <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>Weekly financial summary</h3>
        <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>Paste CSV transactions or a P&L summary. Outputs a plain-English summary, cash flags, and questions for your accountant. No bank integrations.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Week ending"><input type="date" value={f.weekEnding} onChange={(e) => setF({ ...f, weekEnding: e.target.value })} className="field-input text-sm" /></Field>
        <Field label="Business name"><input value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} maxLength={100} className="field-input text-sm" placeholder="Optional" /></Field>
      </div>
      <Field label="Financial data" hint="Paste CSV rows (date, description, amount) or a plain-text P&L summary">
        <textarea value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} rows={8} maxLength={20000} className="field-input resize-none font-mono text-xs" placeholder="2026-10-20, Client invoice, 2500.00&#10;2026-10-21, Office supplies, -85.50" />
      </Field>
      <FormActions onClose={onClose} onSubmit={submit} loading={loading} error={error} label="Generate snapshot" />
    </div>
  );
}

// ── 6. Booking flow ───────────────────────────────────────────────────────────
function BookingFlowForm({ onOutput, onClose }: Omit<Props, "skillKey">) {
  const [f, setF] = useState({ businessName: "", serviceTypes: "", platform: "Calendly", channels: "SMS, Email" });
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (!f.businessName || !f.serviceTypes) { setError("Business name and service types are required."); return; }
    setLoading(true); setError(null);
    try { const { output } = await skills2Api.bookingFlow(f); onOutput(output); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed."); } finally { setLoading(false); }
  }
  return (
    <div className="space-y-4">
      <div><p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>BOOKING FLOW · GUIDED</p>
        <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>Booking copy and message sequences</h3>
        <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>Generates booking page copy, confirmation/reminder/no-show/rebook sequences, and a setup checklist for your scheduler.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Business name"><input value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} maxLength={100} className="field-input text-sm" placeholder="Sunny Plumbing" /></Field>
        <Field label="Scheduler platform"><input value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} maxLength={100} className="field-input text-sm" placeholder="Calendly, Google, Square…" /></Field>
      </div>
      <Field label="Service types"><input value={f.serviceTypes} onChange={(e) => setF({ ...f, serviceTypes: e.target.value })} maxLength={300} className="field-input text-sm" placeholder="Plumbing repair, drain cleaning, emergency call-out" /></Field>
      <Field label="Channels for messages"><input value={f.channels} onChange={(e) => setF({ ...f, channels: e.target.value })} maxLength={200} className="field-input text-sm" /></Field>
      <FormActions onClose={onClose} onSubmit={submit} loading={loading} error={error} />
    </div>
  );
}

// ── 7. Quote / proposal ───────────────────────────────────────────────────────
function QuoteProposalForm({ onOutput, onClose }: Omit<Props, "skillKey">) {
  const [f, setF] = useState({ clientName: "", businessName: "", servicesAndPricing: "", scopeDescription: "", termsNotes: "" });
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const [outputId, setOutputId] = useState<string | null>(null);
  async function submit() {
    if (!f.clientName || !f.servicesAndPricing || !f.scopeDescription) { setError("Client name, services/pricing, and scope are required."); return; }
    setLoading(true); setError(null);
    try { const { output } = await skills2Api.quoteProposal(f); onOutput(output); setOutputId(output.id); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed."); } finally { setLoading(false); }
  }
  return (
    <div className="space-y-4">
      <div><p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>QUOTE / PROPOSAL · GUIDED</p>
        <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>Proposal or quote draft</h3>
        <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>Enter the services and pricing you've agreed. Output is a proposal draft you review before sending. Export as printable HTML.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Client / company name"><input value={f.clientName} onChange={(e) => setF({ ...f, clientName: e.target.value })} maxLength={150} className="field-input text-sm" placeholder="Henderson Property Group" /></Field>
        <Field label="Your business name"><input value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} maxLength={100} className="field-input text-sm" /></Field>
      </div>
      <Field label="Services and pricing" hint="List each item with your own price. Include only figures you've agreed to.">
        <textarea value={f.servicesAndPricing} onChange={(e) => setF({ ...f, servicesAndPricing: e.target.value })} rows={5} maxLength={3000} className="field-input resize-none text-sm" placeholder="Flat-roof repair — materials and labour: $3,800&#10;Gutter clearing: $250" />
      </Field>
      <Field label="Scope of work"><textarea value={f.scopeDescription} onChange={(e) => setF({ ...f, scopeDescription: e.target.value })} rows={4} maxLength={2000} className="field-input resize-none text-sm" placeholder="Replace 40sqm of flat-roof membrane at 4820 Mesa Drive. Clear all gutters. Work completed within 3 business days of deposit." /></Field>
      <Field label="Payment / terms notes" hint="Optional"><textarea value={f.termsNotes} onChange={(e) => setF({ ...f, termsNotes: e.target.value })} rows={2} maxLength={1000} className="field-input resize-none text-sm" placeholder="50% deposit, balance on completion" /></Field>
      {outputId && <p className="text-xs" style={{ color: "var(--blue)" }}>→ <a href={skills2Api.proposalHtmlUrl(outputId)} target="_blank" rel="noopener noreferrer" className="underline">Open printable HTML</a></p>}
      <FormActions onClose={onClose} onSubmit={submit} loading={loading} error={error} label="Generate proposal" />
    </div>
  );
}

// ── 8. Prospect research ──────────────────────────────────────────────────────
function ProspectResearchForm({ onOutput, onClose }: Omit<Props, "skillKey">) {
  const [f, setF] = useState({ icp: "", prospects: "", businessName: "" });
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (!f.icp || !f.prospects) { setError("ICP and at least one prospect are required."); return; }
    setLoading(true); setError(null);
    try { const { output } = await skills2Api.prospectResearch(f); onOutput(output); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed."); } finally { setLoading(false); }
  }
  return (
    <div className="space-y-4">
      <div><p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>PROSPECT RESEARCH · GUIDED</p>
        <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>Prospect research and outreach drafts</h3>
        <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>Public pages are fetched server-side. Output: research summary + personalised email draft per prospect. CAN-SPAM compliance note included.</p>
      </div>
      <Field label="Ideal customer profile" hint="Describe your best-fit customer in 2-4 sentences"><textarea value={f.icp} onChange={(e) => setF({ ...f, icp: e.target.value })} rows={3} maxLength={500} className="field-input resize-none text-sm" placeholder="Small-format print shops in Colorado with 5-50 employees…" /></Field>
      <Field label="Your business name"><input value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} maxLength={100} className="field-input text-sm" /></Field>
      <Field label="Prospects" hint="One per line: company name or URL (max 5). Only public pages are fetched.">
        <textarea value={f.prospects} onChange={(e) => setF({ ...f, prospects: e.target.value })} rows={5} maxLength={5000} className="field-input resize-none text-sm font-mono" placeholder="Copper Tap Brewing&#10;https://summitcycle.com&#10;Parkside Fitness" />
      </Field>
      <FormActions onClose={onClose} onSubmit={submit} loading={loading} error={error} label="Research prospects" />
    </div>
  );
}

const FORM2_MAP: Record<Skill2Key, React.ComponentType<Omit<Props, "skillKey">>> = {
  "money-snapshot":    MoneySnapshotForm,
  "booking-flow":      BookingFlowForm,
  "quote-proposal":    QuoteProposalForm,
  "prospect-research": ProspectResearchForm,
};

export default function SkillForm2({ skillKey, onOutput, onClose }: Props) {
  const Form = FORM2_MAP[skillKey];
  return (
    <div className="rounded-xl p-6" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <Form onOutput={onOutput} onClose={onClose} />
    </div>
  );
}
