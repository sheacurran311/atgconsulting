import type { FinancialEntryInput } from "@/lib/engagementWorkspace";
import { card, formGrid, NumericField, SelectField, TextField } from "./EngagementFields";

export function newFinancialEntry(reference: string, period: string): FinancialEntryInput {
  return {reference, financialPeriod: period, title: "", workstream: "", category: "expense-reduction", grossCents: 0,
    incrementalCents: 0, incrementalCostRecord: "", attributableCents: 0, attributionMethod: "",
    attributionConfidence: "low", comparability: "", sourceSystem: "", sourceRecord: "", evidenceClass: "Document verified",
    capturedOn: "", evidenceMethod: "", permissions: "", limitations: "", adjustmentReason: ""};
}

export function EngagementFinancialEditor({entry, onChange, existing}: {
  entry: FinancialEntryInput; onChange: (next: FinancialEntryInput) => void; existing: boolean;
}) {
  const assign = (change: Partial<FinancialEntryInput>) => onChange({...entry, ...change});
  const cost = entry.category === "engagement-payment" || entry.category === "operating-expense";
  return <div className={card}>
    <p className="text-sm">Record verified payments, incremental expenses, and attributable benefits. Use stable evidence IDs across the engagement. Keep supporting documents in their authorized systems.</p>
    <div className={formGrid}>
      <TextField label="Entry title" value={entry.title} onChange={title => assign({title})} />
      <TextField label="Workstream" value={entry.workstream} onChange={workstream => assign({workstream})} />
      {existing ? <p className="text-sm">Source · {entry.sourceSystem} · {entry.sourceRecord}<br />Period · {entry.financialPeriod} · {entry.category}</p> : <>
        <SelectField label="Entry category" value={entry.category} onChange={category => assign({category, incrementalCents: 0, incrementalCostRecord: "",
          attributableCents: category === "engagement-payment" || category === "operating-expense" ? entry.grossCents : 0})}
          choices={[{value: "engagement-payment", label: "Actual engagement payment"}, {value: "operating-expense", label: "Incremental operating expense"},
            {value: "expense-reduction", label: "Expense reduction"}, {value: "incremental-revenue", label: "Observed incremental revenue"}]} />
        <TextField label="Financial period" type="month" value={entry.financialPeriod} onChange={financialPeriod => assign({financialPeriod})} />
        <TextField label="Source system" value={entry.sourceSystem} onChange={sourceSystem => assign({sourceSystem})} />
        <TextField label="Source account or ledger namespace (optional)" value={entry.sourceAccount ?? ""} onChange={sourceAccount => assign({sourceAccount: sourceAccount.trim() ? sourceAccount : undefined})} />
        <TextField label="Stable source record ID" value={entry.sourceRecord} onChange={sourceRecord => assign({sourceRecord})} />
      </>}
      <NumericField label="Documented gross financial change (USD)" min={-1e9} currency value={entry.grossCents}
        onChange={grossCents => assign({grossCents: grossCents ?? 0, ...(cost ? {attributableCents: grossCents ?? 0} : {})})} />
      {entry.category === "incremental-revenue" && <>
        <NumericField label="Direct costs associated with this revenue (USD)" min={-1e9} currency value={entry.incrementalCents}
          onChange={incrementalCents => assign({incrementalCents: incrementalCents ?? 0})} />
        <TextField label="Evidence ID for direct costs" value={entry.incrementalCostRecord} onChange={incrementalCostRecord => assign({incrementalCostRecord})} />
      </>}
      {!cost && <>
        <NumericField label="Verified attributable financial benefit (USD)" min={-1e9} currency value={entry.attributableCents}
          onChange={attributableCents => assign({attributableCents: attributableCents ?? 0})} />
        <SelectField label="Attribution confidence" value={entry.attributionConfidence} onChange={attributionConfidence => assign({attributionConfidence})}
          choices={[{value: "low", label: "Low · observed only"}, {value: "medium", label: "Medium"}, {value: "high", label: "High"}]} />
      </>}
      <SelectField label="Evidence classification" value={entry.evidenceClass} onChange={evidenceClass => assign({evidenceClass})}
        choices={[{value: "Document verified", label: "Document verified"}, {value: "System verified", label: "System verified"}]} />
      <TextField label="Evidence capture date" type="date" value={entry.capturedOn} onChange={capturedOn => assign({capturedOn})} />
      {(["evidenceMethod", "permissions", "attributionMethod", "comparability", "limitations", "adjustmentReason"] as const).map((key, index) =>
        <TextField key={key} label={["Collection method", "Evidence permissions", "Attribution or payment verification method",
          "Comparability and confounders", "Known limitations", "Reason for correction or reversal"][index]}
          value={entry[key]} multiline onChange={value => assign({[key]: value})} />)}
    </div>
  </div>;
}
