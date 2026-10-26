/**
 * Phase 3 Workbench skill forms — Done-for-you tier.
 */
import { useState } from "react";
import { skills3Api, type OutputItem } from "@/lib/api";

type Skill3Key = "faq-support" | "agent-pipeline";

interface Props { skillKey: Skill3Key; onOutput: (item: OutputItem) => void; onClose: () => void }

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: "var(--canvas-text)" }}>{label}</label>
      {hint && <p className="text-xs mb-1.5" style={{ color: "var(--canvas-text-3)" }}>{hint}</p>}
      {children}
    </div>
  );
}

function FormActions({ onClose, onSubmit, loading, error, label = "Generate" }: { onClose: () => void; onSubmit: () => void; loading: boolean; error: string | null; label?: string }) {
  return (
    <>
      {error && <p className="text-xs" style={{ color: "#DC2626" }}>{error}</p>}
      <div className="flex gap-3 pt-1">
        <button onClick={onSubmit} disabled={loading} className="btn-primary text-sm" style={{ minWidth: "140px" }}>{loading ? "Working…" : label}</button>
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
      </div>
      <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>Output appears in Today inbox. Nothing is sent automatically.</p>
    </>
  );
}

// ── 9. FAQ + support replies ──────────────────────────────────────────────────
function FaqSupportForm({ onOutput, onClose }: Omit<Props, "skillKey">) {
  const [f, setF] = useState({ faqSource: "", customerQuestion: "" });
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (!f.faqSource.trim()) { setError("Paste your FAQ source text."); return; }
    setLoading(true); setError(null);
    try { const { output } = await skills3Api.faqSupport({ faqSource: f.faqSource, customerQuestion: f.customerQuestion || undefined }); onOutput(output); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed."); } finally { setLoading(false); }
  }
  return (
    <div className="space-y-4">
      <div><p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>FAQ & SUPPORT · DONE-FOR-YOU</p>
        <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>Customer FAQ and support replies</h3>
        <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>Build a FAQ from your business info, then draft replies to customer questions. Low-confidence answers are flagged for review.</p>
      </div>
      <Field label="FAQ source" hint="Paste your service descriptions, existing FAQs, terms, or any business info">
        <textarea value={f.faqSource} onChange={(e) => setF({ ...f, faqSource: e.target.value })} rows={7} maxLength={10000} className="field-input resize-none text-sm" placeholder="We are a residential plumbing company serving Denver…" />
      </Field>
      <Field label="Customer question" hint="Optional: paste a specific question to get a draft reply">
        <input value={f.customerQuestion} onChange={(e) => setF({ ...f, customerQuestion: e.target.value })} maxLength={500} className="field-input text-sm" placeholder="Do you offer emergency call-outs on weekends?" />
      </Field>
      <FormActions onClose={onClose} onSubmit={submit} loading={loading} error={error} label="Build FAQ" />
    </div>
  );
}

// ── 10. Agent pipeline ────────────────────────────────────────────────────────
function AgentPipelineForm({ onOutput, onClose }: Omit<Props, "skillKey">) {
  const [chainId, setChainId] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [previousOutput, setPreviousOutput] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ nextStep: number | null; totalSteps: number } | null>(null);

  async function submit() {
    if (!chainId.trim() || !currentInput.trim()) { setError("Chain ID and input are required."); return; }
    setLoading(true); setError(null);
    try {
      const result = await skills3Api.pipelineRun({ chainId, stepIndex, currentInput, previousOutput: previousOutput || undefined });
      onOutput(result.output);
      setLastResult({ nextStep: result.nextStep, totalSteps: result.totalSteps });
      if (result.nextStep !== null) {
        setStepIndex(result.nextStep);
        setPreviousOutput(JSON.stringify((result.result as { stepOutput?: unknown }).stepOutput ?? ""));
        setCurrentInput("");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Failed."); } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div><p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>AGENT PIPELINE · DONE-FOR-YOU</p>
        <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>Multi-step agent pipeline</h3>
        <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>Run each step of your configured pipeline. Each step's output feeds the next. Admin configures the pipeline chain.</p>
      </div>
      <Field label="Pipeline chain ID" hint="Get this from Shea — she configures chains per client">
        <input value={chainId} onChange={(e) => setChainId(e.target.value)} className="field-input text-sm font-mono" placeholder="cuid…" />
      </Field>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs" style={{ color: "var(--canvas-text-3)" }}>Step {stepIndex + 1}{lastResult ? ` of ${lastResult.totalSteps}` : ""}</span>
        {lastResult?.nextStep === null && <span className="font-mono text-xs" style={{ color: "#16A34A" }}>✓ Pipeline complete</span>}
      </div>
      <Field label="Input for this step"><textarea value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} rows={4} maxLength={5000} className="field-input resize-none text-sm" placeholder="The topic or data for this step…" /></Field>
      {previousOutput && <Field label="Previous step output (auto-filled)"><textarea value={previousOutput} onChange={(e) => setPreviousOutput(e.target.value)} rows={3} maxLength={5000} className="field-input resize-none text-xs font-mono" /></Field>}
      <FormActions onClose={onClose} onSubmit={submit} loading={loading} error={error} label={lastResult?.nextStep !== null ? `Run step ${stepIndex + 1}` : "Finish pipeline"} />
    </div>
  );
}

const FORM3_MAP: Record<Skill3Key, React.ComponentType<Omit<Props, "skillKey">>> = {
  "faq-support":    FaqSupportForm,
  "agent-pipeline": AgentPipelineForm,
};

export default function SkillForm3({ skillKey, onOutput, onClose }: Props) {
  const Form = FORM3_MAP[skillKey];
  return (
    <div className="rounded-xl p-6" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <Form onOutput={onOutput} onClose={onClose} />
    </div>
  );
}
