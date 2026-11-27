import type { ReactNode } from "react";

const fieldClass = "block w-full min-w-0 rounded-lg border border-canvas-border bg-canvas-1 px-3 py-2 text-sm text-canvas-text";

export function Field({label, children}: {label: string; children: ReactNode}) {
  return <label className="block min-w-0 text-sm font-medium"><span className="mb-1 block">{label}</span>{children}</label>;
}

export function TextField({label, value, onChange, multiline, type = "text"}: {
  label: string; value: string; onChange: (value: string) => void; multiline?: boolean; type?: string;
}) {
  return <Field label={label}>{multiline
    ? <textarea className={fieldClass} rows={3} value={value} onChange={event => onChange(event.target.value)} />
    : <input className={fieldClass} type={type} value={value} onChange={event => onChange(event.target.value)} />}
  </Field>;
}

export function NumericField({label, value, onChange, currency, min = 0}: {
  label: string; value: number | null; onChange: (value: number | null) => void; currency?: boolean; min?: number;
}) {
  return <Field label={label}><input className={fieldClass} type="number" min={min} step={currency ? "0.01" : "any"}
    value={value === null ? "" : currency ? value / 100 : value} onChange={event => {
      const number = event.target.valueAsNumber;
      onChange(Number.isFinite(number) ? (currency ? Math.round(number * 100) : number) : null);
    }} /></Field>;
}

export function SelectField<T extends string>({label, value, choices, onChange}: {
  label: string; value: T; choices: {value: T; label: string}[]; onChange: (value: T) => void;
}) {
  return <Field label={label}><select className={fieldClass} value={value}
    onChange={event => {const choice = choices.find(item => item.value === event.target.value); if (choice) onChange(choice.value);}}>
    {choices.map(choice => <option value={choice.value} key={choice.value}>{choice.label}</option>)}
  </select></Field>;
}

export function choices<T extends string>(values: readonly T[]) {
  return values.map(value => ({value, label: value.charAt(0).toUpperCase() + value.slice(1)}));
}

export const formGrid = "grid min-w-0 gap-3 sm:grid-cols-2";
export const card = "min-w-0 space-y-4 rounded-2xl border border-canvas-border bg-canvas-1 p-4 sm:p-5";
