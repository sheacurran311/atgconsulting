import { useEffect, useRef, useState } from "react";

export interface AssessmentQuestionData {
  id: string; category: string; text: string;
  type: "text" | "choice" | "multiselect" | "number"; options?: string[]; optionGroups?: Array<{ label: string; options: string[] }>; allowOther?: boolean;
}
const field = { width: "100%", padding: 16, borderRadius: 12, border: "1px solid #64646F", background: "#18181A", color: "#FAFAF9", fontSize: 16, lineHeight: 1.6 };
const shortIds = new Set(["contact_name", "contact_email", "company_name", "approver_name", "approver_email", "approver_role", "role", "pilot_owner"]);
const help: Record<string, string> = {
  contact_name: "Your first name is enough. This helps Shea personalize your review.",
  audience: "Choose one. Choose both if work and personal goals overlap. You can change this later.",
  top_problems: "Choose any that fit, or describe the result you want in your own words.",
  task_frequency: "An estimate is fine: for example, 30 minutes every weekday. This gives us a baseline for evaluating the pilot.",
  workflow_example: "Describe what triggers the task, the steps you take, and the result you want. Leave out private records.",
  success_definition: "What would a useful improvement look like? For example: a faster turnaround, fewer mistakes, or a project ready to launch.",
  data_boundaries: "Name the boundaries, not the sensitive data. This becomes part of your workflow's permissions and approval rules.",
  support_preference: "This helps us suggest a plan, guided setup, or done-for-you scope. It does not purchase or commit you to a service.",
};

export default function AssessmentQuestion({ question: q, value, onChange, busy, error, index, total, onBack, onContinue, chips = [] }: {
  question: AssessmentQuestionData; value: string; onChange: (s: string) => void;
  busy: boolean; error: string | null; index: number; total: number;
  onBack?: () => void; onContinue: (answer?: string) => void; chips?: string[];
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [q.id]);
  // Arrays are serialized as JSON so commas inside an option remain unambiguous.
  let selected: string[] = [];
  if (q.type === "multiselect") {
    try { const p = JSON.parse(value); if (Array.isArray(p)) selected = p.filter((v) => typeof v === "string"); }
    catch { selected = (q.options ?? []).filter((o) => value.includes(o)); }
  }
  const [customOpen, setCustomOpen] = useState(false);
  useEffect(() => setCustomOpen(false), [q.id]);
  const options = q.options ?? [];
  const custom = q.type === "choice" ? (options.includes(value) ? "" : value) : selected.filter((v) => !options.includes(v)).join("; ");
  const setCustom = (v: string) => onChange(q.type === "choice" ? v : JSON.stringify([...selected.filter((o) => options.includes(o)), ...(v ? [v] : [])]));
  const toggle = (option: string) => onChange(JSON.stringify(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option]));
  const short = shortIds.has(q.id) || q.type === "number";
  const empty = q.type === "multiselect" ? selected.length === 0 : !value.trim();
  const optionGroups = q.optionGroups ?? [{ label: "", options }];
  return <form onSubmit={(e) => { e.preventDefault(); if (!busy) onContinue(); }} style={{ color: "#FAFAF9" }} aria-busy={busy}>
    <div className="flex items-center justify-between mb-3 text-sm"><span>ATG consultation</span><span>Question {index + 1} of {total}</span></div>
    <progress aria-label="Assessment progress" value={index} max={total} style={{ width: "100%", accentColor: "#6E94FF", height: 8 }} />
    <h2 ref={heading} tabIndex={-1} id="assessment-question" className="text-2xl font-bold mt-6 mb-3" style={{ outline: "none", lineHeight: 1.3 }}>{q.text}</h2>
    <p id="assessment-help" className="text-sm mb-5" style={{ color: "#C6C6CB", lineHeight: 1.65 }}>{help[q.id] ?? (q.type === "multiselect" ? "Select all that apply, then choose Continue." : q.type === "choice" ? "Select one answer, then choose Continue." : "Use your own words. If you are unsure, say so — we can clarify during the review.")}</p>
    {(q.type === "choice" || q.type === "multiselect") && <fieldset aria-labelledby="assessment-question" aria-describedby="assessment-help" disabled={busy} className="space-y-3">
      {optionGroups.map((group) => <div key={group.label} className="space-y-3">
        {group.label && <h3 className="font-semibold pt-3" style={{ color: "#C7D6FF" }}>{group.label}</h3>}
        {group.options.map((option) => {
        const checked = q.type === "choice" ? value === option : selected.includes(option);
        return <label key={option} className="flex items-start gap-3" style={{ padding: 16, minHeight: 56, borderRadius: 12, border: `2px solid ${checked ? "#87A6FF" : "#45454F"}`, background: checked ? "#1E315A" : "#18181A", cursor: busy ? "wait" : "pointer" }}>
          <input type={q.type === "choice" ? "radio" : "checkbox"} name={q.id} value={option} checked={checked} onChange={() => q.type === "choice" ? onChange(option) : toggle(option)} style={{ marginTop: 3, width: 20, height: 20, flexShrink: 0, accentColor: "#87A6FF" }} />
          <span>{option}</span>
        </label>;
      })}</div>)}
      {q.allowOther && <div><button type="button" className="underline" aria-expanded={customOpen || !!custom} onClick={() => { if (customOpen || custom) setCustom(""); setCustomOpen(!(customOpen || custom)); }}>{customOpen || custom ? "Remove my own option" : "Describe something else"}</button>
        {(customOpen || custom) && <input style={field} aria-label="Your own option" maxLength={240} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={q.id === "top_problems" ? "Separate extra tasks with commas or semicolons" : "Your own option"} />}</div>}
    </fieldset>}
    {(q.type === "text" || q.type === "number") && <>
      {short ? <input aria-labelledby="assessment-question" aria-describedby="assessment-help" disabled={busy} type={q.id.includes("email") ? "email" : q.type === "number" ? "number" : "text"} autoComplete={q.id === "contact_name" ? "given-name" : q.id === "contact_email" ? "email" : "off"} maxLength={q.id.includes("name") ? 100 : 4000} value={value} onChange={(e) => onChange(e.target.value)} style={field} placeholder={q.id === "contact_name" ? "Your name" : "Your answer"} />
        : <textarea aria-labelledby="assessment-question" aria-describedby="assessment-help" disabled={busy} rows={5} maxLength={4000} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...field, resize: "vertical" }} placeholder={q.id === "top_problems" ? "What are you trying to accomplish?" : "Describe your situation…"} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !busy) { e.preventDefault(); onContinue(); } }} />}
      {!short && <p className="text-xs mt-2" style={{ color: "#B8B8C0" }}>{value.length}/4000 characters · Ctrl/⌘ + Enter to continue</p>}
      {q.id === "top_problems" && chips.length > 0 && <div className="mt-4"><p className="text-sm mb-2">Ideas to get started (tap to add):</p><div className="flex flex-wrap gap-2">{chips.map((chip) => <button key={chip} type="button" disabled={busy} onClick={() => { if (!value.includes(chip)) onChange(value ? `${value}\n${chip}` : chip); }} style={{ padding: "8px 12px", border: "1px solid #64646F", borderRadius: 20, background: "#232325", color: "#FAFAF9" }}>{chip}</button>)}</div></div>}
    </>}
    {error && <p role="alert" className="mt-4" style={{ color: "#FFB2B2" }}>{error}</p>}
    <div className="flex gap-3 mt-6">
      {onBack && <button type="button" disabled={busy} onClick={onBack} className="btn-secondary-white" style={{ minHeight: 52 }}>← Back</button>}
      <button type="submit" disabled={busy || empty} className="btn-primary" style={{ minHeight: 52, flex: 1, opacity: busy || empty ? 0.6 : 1 }}>{busy ? "Saving your answer…" : "Continue →"}</button>
    </div>
    {!["contact_name", "contact_email", "audience", "top_problems"].includes(q.id) && <button type="button" disabled={busy} onClick={() => onContinue("(skipped)")} className="text-sm mt-4 underline" style={{ color: "#C6C6CB" }}>I’m not sure — discuss this with Shea</button>}
    <p role="status" className="text-xs mt-5" style={{ color: "#B8B8C0" }}>Answers save when you continue. You can go back and review them before submitting.</p>
  </form>;
}
