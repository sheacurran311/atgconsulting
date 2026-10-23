import Chip from "./Chip";
import type { IntakeFormData, Area, Tool, TimeSink } from "@/types/intake";
import { AI_COMFORT_LABELS, TOOL_LABELS, TIME_SINK_LABELS, AREA_TIME_SINKS } from "@/types/intake";

type Step2Fields = Pick<IntakeFormData, "aiComfort" | "tools" | "timeSinks" | "automateFirst">;

interface Props {
  data: Step2Fields;
  areas: Area[];
  onChange: (updates: Partial<Step2Fields>) => void;
  errors: Partial<Record<keyof Step2Fields, string>>;
}

const TOOLS: Tool[] = ["chatgpt", "claude", "gemini", "grok", "copilot", "zapier_make", "crm", "none", "other"];

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function relevantTimeSinks(areas: Area[]): TimeSink[] {
  const seen = new Set<TimeSink>();
  const canonical: TimeSink[] = ["email","prospecting","followups","research","proposals","scheduling","social_content","admin","personal_logistics"];
  areas.forEach((a) => AREA_TIME_SINKS[a].forEach((s) => seen.add(s)));
  return seen.size === 0 ? canonical : canonical.filter((s) => seen.has(s));
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 font-mono text-2xs" style={{ color: "#DC2626" }}>{msg}</p> : null;
}

export default function Step2Workflows({ data, areas, onChange, errors }: Props) {
  const visibleSinks = relevantTimeSinks(areas);

  return (
    <div className="space-y-7">
      {/* AI comfort level — radio ladder */}
      <div>
        <p className="text-sm font-medium mb-0.5" id="comfort-label" style={{ color: "var(--canvas-text)" }}>
          AI comfort level <span style={{ color: "var(--accent)" }} aria-hidden="true">*</span>
        </p>
        <p className="text-xs mb-3" style={{ color: "var(--canvas-text-3)" }}>
          Pick the one that best describes you right now.
        </p>
        <div className="space-y-2" role="radiogroup" aria-labelledby="comfort-label">
          {AI_COMFORT_LABELS.map((label, i) => {
            const selected = data.aiComfort === i;
            return (
              <label
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                style={{
                  border: `1px solid ${selected ? "var(--accent)" : "var(--canvas-border)"}`,
                  background: selected ? "var(--accent-subtle-lt)" : "var(--canvas-1)",
                }}
              >
                <input
                  type="radio" name="aiComfort" value={i}
                  checked={selected} onChange={() => onChange({ aiComfort: i })}
                  className="sr-only"
                />
                <span
                  className="font-mono text-xs font-bold w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  style={{
                    background: selected ? "var(--accent-btn)" : "var(--canvas-2)",
                    color: selected ? "#fff" : "var(--canvas-text-3)",
                  }}
                >
                  {i}
                </span>
                <span className="text-sm" style={{ color: selected ? "var(--canvas-text)" : "var(--canvas-text-2)", fontWeight: selected ? 600 : 400 }}>
                  {label}
                </span>
              </label>
            );
          })}
        </div>
        <FieldError msg={errors.aiComfort} />
      </div>

      {/* Tools */}
      <div>
        <p className="text-sm font-medium mb-0.5" id="tools-label" style={{ color: "var(--canvas-text)" }}>
          Tools you use today <span style={{ color: "var(--accent)" }} aria-hidden="true">*</span>
        </p>
        <p className="text-xs mb-2" style={{ color: "var(--canvas-text-3)" }}>Pick all that apply.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="tools-label">
          {TOOLS.map((t) => (
            <Chip key={t} label={TOOL_LABELS[t]} selected={data.tools.includes(t)}
              onToggle={() => onChange({ tools: toggleItem(data.tools, t) })} />
          ))}
        </div>
        <FieldError msg={errors.tools} />
      </div>

      {/* Time sinks */}
      <div>
        <p className="text-sm font-medium mb-0.5" id="sinks-label" style={{ color: "var(--canvas-text)" }}>
          Biggest time sinks <span style={{ color: "var(--accent)" }} aria-hidden="true">*</span>
        </p>
        <p className="text-xs mb-2" style={{ color: "var(--canvas-text-3)" }}>
          Showing tasks relevant to the areas you selected.
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="sinks-label">
          {visibleSinks.map((s) => (
            <Chip key={s} label={TIME_SINK_LABELS[s]} selected={data.timeSinks.includes(s)}
              onToggle={() => onChange({ timeSinks: toggleItem(data.timeSinks, s) })} />
          ))}
        </div>
        <FieldError msg={errors.timeSinks} />
      </div>

      {/* Automate first (optional) */}
      <div>
        <label htmlFor="automateFirst" className="block text-sm font-medium mb-1.5" style={{ color: "var(--canvas-text)" }}>
          If you could automate one thing today, what would it be?{" "}
          <span className="font-normal" style={{ color: "var(--canvas-text-3)" }}>(optional)</span>
        </label>
        <input
          id="automateFirst" type="text"
          value={data.automateFirst ?? ""}
          onChange={(e) => onChange({ automateFirst: e.target.value })}
          maxLength={120} placeholder="e.g. finding new leads every week"
          className="field-input"
        />
        <div className="flex justify-end mt-1">
          <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.04em" }}>
            {(data.automateFirst ?? "").length}/120
          </span>
        </div>
      </div>
    </div>
  );
}
