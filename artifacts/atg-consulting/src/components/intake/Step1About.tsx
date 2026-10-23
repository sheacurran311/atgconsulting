// Step 1 — About you
// Collects: name, email, role, industry, bizSize, areas
// All chips; name/email/role/industry are short text inputs.
// 'areas' (where they want help) drives filtered time-sinks in Step 2.

import Chip from "./Chip";
import type { IntakeFormData, Area, BizSize } from "@/types/intake";
import { AREA_LABELS, AREA_DESCRIPTIONS, BIZ_SIZE_LABELS } from "@/types/intake";

type Step1Fields = Pick<IntakeFormData, "name" | "email" | "role" | "industry" | "bizSize" | "areas">;

interface Props {
  data: Step1Fields;
  onChange: (updates: Partial<Step1Fields>) => void;
  errors: Partial<Record<keyof Step1Fields, string>>;
}

const AREAS: Area[] = ["executive_assistant", "marketing", "sales", "customer_support"];
const BIZ_SIZES: BizSize[] = ["solo", "2-10", "11-50", "50+"];

const inputCls =
  "w-full rounded-xl border border-navy/20 px-4 py-3 text-navy placeholder:text-navy/35 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent text-sm";

function toggleArea(current: Area[], a: Area): Area[] {
  return current.includes(a) ? current.filter((x) => x !== a) : [...current, a];
}

export default function Step1About({ data, onChange, errors }: Props) {
  return (
    <div className="space-y-6">
      {/* Name + Email */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5" htmlFor="name">
            Name <span className="text-orange" aria-hidden="true">*</span>
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={inputCls}
            placeholder="Shea Curran"
            maxLength={100}
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-err" : undefined}
          />
          {errors.name && <p id="name-err" className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5" htmlFor="email">
            Email <span className="text-orange" aria-hidden="true">*</span>
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className={inputCls}
            placeholder="shea@example.com"
            maxLength={200}
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-err" : undefined}
          />
          {errors.email && <p id="email-err" className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>
      </div>

      {/* Role + Industry */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5" htmlFor="role">
            Role / position <span className="text-orange" aria-hidden="true">*</span>
          </label>
          <input
            id="role"
            type="text"
            value={data.role}
            onChange={(e) => onChange({ role: e.target.value })}
            className={inputCls}
            placeholder="Owner, sales rep, consultant…"
            maxLength={100}
            aria-required="true"
            aria-invalid={!!errors.role}
          />
          {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-navy mb-1.5" htmlFor="industry">
            Industry <span className="text-orange" aria-hidden="true">*</span>
          </label>
          <input
            id="industry"
            type="text"
            value={data.industry}
            onChange={(e) => onChange({ industry: e.target.value })}
            className={inputCls}
            placeholder="Printing, real estate, consulting…"
            maxLength={100}
            aria-required="true"
            aria-invalid={!!errors.industry}
          />
          {errors.industry && <p className="mt-1 text-xs text-red-500">{errors.industry}</p>}
        </div>
      </div>

      {/* Business size */}
      <div>
        <p className="text-sm font-semibold text-navy mb-2" id="bizsize-label">
          Business size <span className="text-orange" aria-hidden="true">*</span>
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="bizsize-label">
          {BIZ_SIZES.map((s) => (
            <Chip
              key={s}
              label={BIZ_SIZE_LABELS[s]}
              selected={data.bizSize === s}
              onToggle={() => onChange({ bizSize: s })}
            />
          ))}
        </div>
        {errors.bizSize && <p className="mt-1 text-xs text-red-500">{errors.bizSize}</p>}
      </div>

      {/* Areas of help */}
      <div>
        <p className="text-sm font-semibold text-navy mb-1" id="areas-label">
          Where do you want help? <span className="text-orange" aria-hidden="true">*</span>
        </p>
        <p className="text-xs text-navy/50 mb-2">Pick all that apply — we&apos;ll show relevant options in the next step.</p>
        <div className="grid sm:grid-cols-2 gap-3" role="group" aria-labelledby="areas-label">
          {AREAS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onChange({ areas: toggleArea(data.areas, a) })}
              aria-pressed={data.areas.includes(a)}
              className={`flex flex-col items-start text-left p-3 rounded-xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange ${
                data.areas.includes(a)
                  ? "border-orange bg-orange/8 text-navy"
                  : "border-navy/15 bg-white hover:border-orange/40 text-navy/70"
              }`}
            >
              <span className="font-semibold text-sm">{AREA_LABELS[a]}</span>
              <span className="text-xs mt-0.5 text-navy/50">{AREA_DESCRIPTIONS[a]}</span>
            </button>
          ))}
        </div>
        {errors.areas && <p className="mt-1 text-xs text-red-500">{errors.areas}</p>}
      </div>
    </div>
  );
}
