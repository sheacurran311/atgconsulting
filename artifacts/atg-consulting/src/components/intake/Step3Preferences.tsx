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

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 font-mono text-2xs" style={{ color: "#DC2626" }}>{msg}</p> : null;
}

export default function Step3Preferences({ data, onChange, errors }: Props) {
  return (
    <div className="space-y-7">
      {/* Hours slider */}
      <div>
        <label htmlFor="hoursLost" className="block text-sm font-medium mb-1.5" style={{ color: "var(--canvas-text)" }}>
          Hours per week lost to repetitive work <span style={{ color: "var(--blue)" }} aria-hidden="true">*</span>
        </label>
        <p className="text-xs mb-4" style={{ color: "var(--canvas-text-3)" }}>Drag the slider to adjust.</p>

        <div className="flex items-center gap-4">
          <input
            id="hoursLost" type="range" min={1} max={40} step={1}
            value={data.hoursLost}
            onChange={(e) => onChange({ hoursLost: Number(e.target.value) })}
            className="flex-1 cursor-pointer"
            style={{ accentColor: "var(--blue)" }}
            aria-valuemin={1} aria-valuemax={40} aria-valuenow={data.hoursLost}
            aria-valuetext={`${data.hoursLost} hours per week`}
          />
          <span
            className="font-mono font-bold text-2xl w-16 text-right flex-shrink-0"
            style={{ color: "var(--blue)", letterSpacing: "-0.02em" }}
          >
            {data.hoursLost}h
          </span>
        </div>

        <div className="flex justify-between mt-1.5 px-0.5">
          {["1hr", "10hrs", "20hrs", "30hrs", "40hrs"].map((l) => (
            <span key={l} className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>{l}</span>
          ))}
        </div>
        <FieldError msg={errors.hoursLost} />
      </div>

      {/* Preferred help */}
      <div>
        <p className="text-sm font-medium mb-0.5" id="help-label" style={{ color: "var(--canvas-text)" }}>
          Preferred way to get help <span style={{ color: "var(--blue)" }} aria-hidden="true">*</span>
        </p>
        <p className="text-xs mb-2" style={{ color: "var(--canvas-text-3)" }}>We&apos;ll factor this into your recommendation.</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="help-label">
          {HELP_OPTIONS.map((h) => (
            <Chip key={h} label={PREFERRED_HELP_LABELS[h]} selected={data.preferredHelp === h}
              onToggle={() => onChange({ preferredHelp: h })} />
          ))}
        </div>
        <FieldError msg={errors.preferredHelp} />
      </div>

      {/* Free text */}
      <div>
        <label htmlFor="freeText" className="block text-sm font-medium mb-1.5" style={{ color: "var(--canvas-text)" }}>
          Anything else we should know?{" "}
          <span className="font-normal" style={{ color: "var(--canvas-text-3)" }}>(optional)</span>
        </label>
        <textarea
          id="freeText" rows={3}
          value={data.freeText ?? ""}
          onChange={(e) => onChange({ freeText: e.target.value })}
          maxLength={280}
          placeholder="Specific tools you're locked into, budget constraints, timeline, anything…"
          className="field-input resize-none"
        />
        <div className="flex justify-end mt-1">
          <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>
            {(data.freeText ?? "").length}/280
          </span>
        </div>
        <FieldError msg={errors.freeText} />
      </div>
    </div>
  );
}
