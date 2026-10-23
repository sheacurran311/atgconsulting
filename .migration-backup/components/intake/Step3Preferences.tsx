// Step 3 — Preferences
// Collects: hoursLost (slider), preferredHelp (radio chips), freeText (optional textarea)
//
// Personalization mapping:
//   hoursLost     → ROI framing ("you could reclaim ~X hours/week")
//   preferredHelp → tier recommendation and CTA copy in the LLM response
//   freeText      → extra context for the LLM (sanitised, max 280 chars)

import Chip from "./Chip";
import type { IntakeFormData, PreferredHelp } from "@/types/intake";
import { PREFERRED_HELP_LABELS } from "@/types/intake";

type Step3Fields = Pick<IntakeFormData, "hoursLost" | "preferredHelp" | "freeText">;

interface Props {
  data: Step3Fields;
  onChange: (updates: Partial<Step3Fields>) => void;
  errors: Partial<Record<keyof Step3Fields, string>>;
}

const HELP_OPTIONS: PreferredHelp[] = ["self_serve", "guided", "done_for_you", "not_sure"];

export default function Step3Preferences({ data, onChange, errors }: Props) {
  const hours = data.hoursLost;

  return (
    <div className="space-y-7">
      {/* Hours lost – slider */}
      <div>
        <label className="block text-sm font-semibold text-navy mb-1" htmlFor="hoursLost">
          Hours per week lost to repetitive work{" "}
          <span className="text-orange" aria-hidden="true">*</span>
        </label>
        <p className="text-xs text-navy/50 mb-3">Drag the slider or tap to adjust.</p>

        <div className="flex items-center gap-4">
          <input
            id="hoursLost"
            type="range"
            min={1}
            max={40}
            step={1}
            value={hours}
            onChange={(e) => onChange({ hoursLost: Number(e.target.value) })}
            className="flex-1 accent-orange"
            aria-valuemin={1}
            aria-valuemax={40}
            aria-valuenow={hours}
            aria-valuetext={`${hours} hours per week`}
          />
          <span className="w-20 text-right text-2xl font-extrabold text-orange tabular-nums">
            {hours}h
          </span>
        </div>

        <div className="flex justify-between text-xs text-navy/35 mt-1 px-0.5">
          <span>1 hr</span>
          <span>10 hrs</span>
          <span>20 hrs</span>
          <span>30 hrs</span>
          <span>40+ hrs</span>
        </div>

        {errors.hoursLost && <p className="mt-1 text-xs text-red-500">{errors.hoursLost}</p>}
      </div>

      {/* Preferred help */}
      <div>
        <p className="text-sm font-semibold text-navy mb-1" id="help-label">
          Preferred way to get help <span className="text-orange" aria-hidden="true">*</span>
        </p>
        <p className="text-xs text-navy/50 mb-2">We&apos;ll factor this into your recommendation.</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="help-label">
          {HELP_OPTIONS.map((h) => (
            <Chip
              key={h}
              label={PREFERRED_HELP_LABELS[h]}
              selected={data.preferredHelp === h}
              onToggle={() => onChange({ preferredHelp: h })}
            />
          ))}
        </div>
        {errors.preferredHelp && <p className="mt-1 text-xs text-red-500">{errors.preferredHelp}</p>}
      </div>

      {/* Free text – optional */}
      <div>
        <label className="block text-sm font-semibold text-navy mb-1.5" htmlFor="freeText">
          Anything else we should know?{" "}
          <span className="text-navy/40 font-normal">(optional)</span>
        </label>
        <textarea
          id="freeText"
          rows={3}
          value={data.freeText ?? ""}
          onChange={(e) => onChange({ freeText: e.target.value })}
          maxLength={280}
          placeholder="Specific tools you're locked into, budget constraints, timeline, anything…"
          className="w-full rounded-xl border border-navy/20 px-4 py-3 text-navy placeholder:text-navy/35 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent text-sm resize-none"
        />
        <p className="mt-1 text-xs text-navy/35 text-right">
          {(data.freeText ?? "").length}/280
        </p>
        {errors.freeText && <p className="mt-1 text-xs text-red-500">{errors.freeText}</p>}
      </div>
    </div>
  );
}
