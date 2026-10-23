import { useState } from "react";
import { useLocation } from "wouter";
import ProgressBar from "./ProgressBar";
import Step1About from "./Step1About";
import Step2Workflows from "./Step2Workflows";
import Step3Preferences from "./Step3Preferences";
import type { IntakeFormData, BizSize, PreferredHelp } from "@/types/intake";

// ── Default form state ──────────────────────────────────────────────────────

const DEFAULT_DATA: IntakeFormData = {
  name: "",
  email: "",
  role: "",
  industry: "",
  bizSize: "solo" as BizSize,
  areas: [],
  aiComfort: 1,
  tools: [],
  timeSinks: [],
  automateFirst: "",
  hoursLost: 10,
  preferredHelp: "not_sure" as PreferredHelp,
  freeText: "",
  honeypot: "", // never rendered visibly; bots fill it in
};

const STEP_LABELS = ["About you", "Your workflows", "Preferences"];
const TOTAL_STEPS = 3;

// ── Validation ──────────────────────────────────────────────────────────────

type FieldErrors = Partial<Record<keyof IntakeFormData, string>>;

function validateStep(step: number, data: IntakeFormData): FieldErrors {
  const errs: FieldErrors = {};
  if (step === 1) {
    if (!data.name.trim()) errs.name = "Name is required.";
    if (!data.email.trim()) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = "Enter a valid email.";
    if (!data.role.trim()) errs.role = "Role is required.";
    if (!data.industry.trim()) errs.industry = "Industry is required.";
    if (!data.bizSize) errs.bizSize = "Select a business size.";
    if (data.areas.length === 0) errs.areas = "Select at least one area.";
  }
  if (step === 2) {
    if (data.tools.length === 0) errs.tools = "Select at least one tool (or 'None yet').";
    if (data.timeSinks.length === 0) errs.timeSinks = "Select at least one time sink.";
  }
  if (step === 3) {
    if (!data.preferredHelp) errs.preferredHelp = "Select your preferred way to get help.";
  }
  return errs;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function IntakeForm() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<IntakeFormData>(DEFAULT_DATA);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update(updates: Partial<IntakeFormData>) {
    setData((prev) => ({ ...prev, ...updates }));
    // Clear relevant errors on change
    const updatedKeys = Object.keys(updates) as (keyof IntakeFormData)[];
    setErrors((prev) => {
      const next = { ...prev };
      updatedKeys.forEach((k) => delete next[k]);
      return next;
    });
  }

  function handleNext() {
    const errs = validateStep(step, data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setErrors({});
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    const errs = validateStep(3, data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setSubmitError((json as { error?: string }).error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      // Redirect to the plan result page
      const { intakeId } = json as { intakeId: string };
      setLocation(`/start/result/${intakeId}`);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <ProgressBar step={step} total={TOTAL_STEPS} labels={STEP_LABELS} />
      </div>

      {/* Step heading */}
      <div className="mb-6">
        <p className="font-mono text-xs font-medium mb-1" style={{ color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Step {step} of {TOTAL_STEPS}
        </p>
        <h2 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.025em" }}>
          {STEP_LABELS[step - 1]}
        </h2>
      </div>

      {/* Honeypot – visually hidden, filled only by bots */}
      <div aria-hidden="true" className="hidden" tabIndex={-1}>
        <input
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          value={data.honeypot}
          onChange={(e) => update({ honeypot: e.target.value })}
        />
      </div>

      {/* Step content */}
      {step === 1 && (
        <Step1About
          data={data}
          onChange={update}
          errors={errors}
        />
      )}
      {step === 2 && (
        <Step2Workflows
          data={data}
          areas={data.areas}
          onChange={update}
          errors={errors}
        />
      )}
      {step === 3 && (
        <Step3Preferences
          data={data}
          onChange={update}
          errors={errors}
        />
      )}

      {/* Submit error */}
      {submitError && (
        <div className="mt-4 p-4 rounded-lg text-sm" role="alert"
          style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626" }}>
          {submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between gap-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="btn-ghost"
            disabled={submitting}
          >
            ← Back
          </button>
        ) : (
          <span />
        )}

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleNext}
            className="btn-primary"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary min-w-[160px]"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Building your plan…
              </span>
            ) : (
              "Get my plan →"
            )}
          </button>
        )}
      </div>

      {/* Time estimate */}
      <p className="mt-4 text-center font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.04em" }}>
        {step === 1
          ? "~2 MIN TOTAL · MOSTLY TAPS · NO SIGN-UP"
          : step === 2
          ? "ALMOST THERE — ONE MORE STEP"
          : "LAST STEP — YOUR SNAPSHOT IS MOMENTS AWAY"}
      </p>
    </div>
  );
}
