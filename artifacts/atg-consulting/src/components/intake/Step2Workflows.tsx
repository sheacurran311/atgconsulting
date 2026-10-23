// Step 2 — Your workflows
// Collects: aiComfort, tools, timeSinks (filtered by areas), automateFirst (optional short text)
//
// Personalization mapping:
//   aiComfort   → explanation depth in LLM response (0=plain English, 4=can be technical)
//   tools       → LLM builds on tools they already know
//   timeSinks   → LLM addresses highest-ranked pain points first
//   automateFirst → LLM validates and expands on their instinct in the "quick win" section

import Chip from "./Chip";
import type { IntakeFormData, Area, Tool, TimeSink } from "@/types/intake";
import {
  AI_COMFORT_LABELS,
  TOOL_LABELS,
  TIME_SINK_LABELS,
  AREA_TIME_SINKS,
} from "@/types/intake";

type Step2Fields = Pick<IntakeFormData, "aiComfort" | "tools" | "timeSinks" | "automateFirst">;
type Step1Areas = Pick<IntakeFormData, "areas">;

interface Props {
  data: Step2Fields;
  areas: Step1Areas["areas"]; // passed from step 1 to filter time-sinks
  onChange: (updates: Partial<Step2Fields>) => void;
  errors: Partial<Record<keyof Step2Fields, string>>;
}

const TOOLS: Tool[] = ["chatgpt", "claude", "gemini", "grok", "copilot", "zapier_make", "crm", "none", "other"];

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

/** Returns unique time-sinks for the selected areas, preserving a canonical order */
function relevantTimeSinks(areas: Area[]): TimeSink[] {
  const seen = new Set<TimeSink>();
  const canonical: TimeSink[] = [
    "email", "prospecting", "followups", "research", "proposals",
    "scheduling", "social_content", "admin", "personal_logistics",
  ];
  areas.forEach((a) => AREA_TIME_SINKS[a].forEach((s) => seen.add(s)));
  // If no areas selected yet, show all
  return seen.size === 0 ? canonical : canonical.filter((s) => seen.has(s));
}

export default function Step2Workflows({ data, areas, onChange, errors }: Props) {
  const visibleSinks = relevantTimeSinks(areas);

  return (
    <div className="space-y-7">
      {/* AI comfort level */}
      <div>
        <p className="text-sm font-semibold text-navy mb-1" id="comfort-label">
          AI comfort level <span className="text-orange" aria-hidden="true">*</span>
        </p>
        <p className="text-xs text-navy/50 mb-3">Pick the one that best describes you right now.</p>
        <div className="space-y-2" role="radiogroup" aria-labelledby="comfort-label">
          {AI_COMFORT_LABELS.map((label, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                data.aiComfort === i
                  ? "border-orange bg-orange/8"
                  : "border-navy/15 hover:border-orange/40"
              }`}
            >
              <input
                type="radio"
                name="aiComfort"
                value={i}
                checked={data.aiComfort === i}
                onChange={() => onChange({ aiComfort: i })}
                className="sr-only"
              />
              <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  data.aiComfort === i ? "bg-orange text-white" : "bg-navy/8 text-navy/50"
                }`}
              >
                {i}
              </span>
              <span className={`text-sm ${data.aiComfort === i ? "font-semibold text-navy" : "text-navy/65"}`}>
                {label}
              </span>
            </label>
          ))}
        </div>
        {errors.aiComfort && <p className="mt-1 text-xs text-red-500">{errors.aiComfort}</p>}
      </div>

      {/* Tools */}
      <div>
        <p className="text-sm font-semibold text-navy mb-1" id="tools-label">
          Tools you use today <span className="text-orange" aria-hidden="true">*</span>
        </p>
        <p className="text-xs text-navy/50 mb-2">Pick all that apply.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="tools-label">
          {TOOLS.map((t) => (
            <Chip
              key={t}
              label={TOOL_LABELS[t]}
              selected={data.tools.includes(t)}
              onToggle={() => onChange({ tools: toggleItem(data.tools, t) })}
            />
          ))}
        </div>
        {errors.tools && <p className="mt-1 text-xs text-red-500">{errors.tools}</p>}
      </div>

      {/* Time sinks – filtered by areas */}
      <div>
        <p className="text-sm font-semibold text-navy mb-1" id="sinks-label">
          Biggest time sinks <span className="text-orange" aria-hidden="true">*</span>
        </p>
        <p className="text-xs text-navy/50 mb-2">
          Showing tasks relevant to the areas you selected.
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="sinks-label">
          {visibleSinks.map((s) => (
            <Chip
              key={s}
              label={TIME_SINK_LABELS[s]}
              selected={data.timeSinks.includes(s)}
              onToggle={() => onChange({ timeSinks: toggleItem(data.timeSinks, s) })}
            />
          ))}
        </div>
        {errors.timeSinks && <p className="mt-1 text-xs text-red-500">{errors.timeSinks}</p>}
      </div>

      {/* Automate first (optional) */}
      <div>
        <label className="block text-sm font-semibold text-navy mb-1.5" htmlFor="automateFirst">
          If you could automate one thing today, what would it be?{" "}
          <span className="text-navy/40 font-normal">(optional)</span>
        </label>
        <input
          id="automateFirst"
          type="text"
          value={data.automateFirst ?? ""}
          onChange={(e) => onChange({ automateFirst: e.target.value })}
          maxLength={120}
          placeholder="e.g. finding new leads every week"
          className="w-full rounded-xl border border-navy/20 px-4 py-3 text-navy placeholder:text-navy/35 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent text-sm"
        />
        <p className="mt-1 text-xs text-navy/35 text-right">
          {(data.automateFirst ?? "").length}/120
        </p>
      </div>
    </div>
  );
}
