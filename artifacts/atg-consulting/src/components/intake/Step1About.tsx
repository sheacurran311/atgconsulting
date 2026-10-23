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

function toggleArea(current: Area[], a: Area): Area[] {
  return current.includes(a) ? current.filter((x) => x !== a) : [...current, a];
}

function FieldLabel({ id, children, required }: { id: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={id} className="block text-sm font-medium mb-1.5" style={{ color: "var(--canvas-text)" }}>
      {children}
      {required && <span style={{ color: "var(--accent)", marginLeft: 2 }} aria-hidden="true">*</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 font-mono text-2xs" style={{ color: "#DC2626", letterSpacing: "0.02em" }}>{msg}</p> : null;
}

export default function Step1About({ data, onChange, errors }: Props) {
  return (
    <div className="space-y-6">
      {/* Name + Email */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel id="name" required>Name</FieldLabel>
          <input id="name" type="text" autoComplete="name" value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="field-input" placeholder="Shea Curran" maxLength={100}
            aria-required="true" aria-invalid={!!errors.name} />
          <FieldError msg={errors.name} />
        </div>
        <div>
          <FieldLabel id="email" required>Email</FieldLabel>
          <input id="email" type="email" autoComplete="email" value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="field-input" placeholder="shea@example.com" maxLength={200}
            aria-required="true" aria-invalid={!!errors.email} />
          <FieldError msg={errors.email} />
        </div>
      </div>

      {/* Role + Industry */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel id="role" required>Role / position</FieldLabel>
          <input id="role" type="text" value={data.role}
            onChange={(e) => onChange({ role: e.target.value })}
            className="field-input" placeholder="Owner, sales rep, consultant…" maxLength={100}
            aria-required="true" />
          <FieldError msg={errors.role} />
        </div>
        <div>
          <FieldLabel id="industry" required>Industry</FieldLabel>
          <input id="industry" type="text" value={data.industry}
            onChange={(e) => onChange({ industry: e.target.value })}
            className="field-input" placeholder="Printing, real estate, consulting…" maxLength={100}
            aria-required="true" />
          <FieldError msg={errors.industry} />
        </div>
      </div>

      {/* Business size */}
      <div>
        <p className="text-sm font-medium mb-2" id="bizsize-label" style={{ color: "var(--canvas-text)" }}>
          Business size <span style={{ color: "var(--accent)" }} aria-hidden="true">*</span>
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="bizsize-label">
          {BIZ_SIZES.map((s) => (
            <Chip key={s} label={BIZ_SIZE_LABELS[s]} selected={data.bizSize === s}
              onToggle={() => onChange({ bizSize: s })} />
          ))}
        </div>
        <FieldError msg={errors.bizSize} />
      </div>

      {/* Areas */}
      <div>
        <p className="text-sm font-medium mb-0.5" id="areas-label" style={{ color: "var(--canvas-text)" }}>
          Where do you want help? <span style={{ color: "var(--accent)" }} aria-hidden="true">*</span>
        </p>
        <p className="text-xs mb-3" style={{ color: "var(--canvas-text-3)" }}>
          Pick all that apply — we&apos;ll show relevant options in the next step.
        </p>
        <div className="grid sm:grid-cols-2 gap-3" role="group" aria-labelledby="areas-label">
          {AREAS.map((a) => {
            const selected = data.areas.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => onChange({ areas: toggleArea(data.areas, a) })}
                aria-pressed={selected}
                className="text-left p-3 rounded-lg transition-all focus:outline-none focus-visible:ring-2"
                style={{
                  border: `1px solid ${selected ? "var(--accent)" : "var(--canvas-border)"}`,
                  background: selected ? "var(--accent-subtle-lt)" : "var(--canvas-1)",
                  boxShadow: selected ? "0 0 0 1px rgba(249,115,22,0.15)" : "none",
                }}
              >
                <span className="font-semibold text-sm block" style={{ color: "var(--canvas-text)" }}>
                  {AREA_LABELS[a]}
                </span>
                <span className="text-xs mt-0.5 block" style={{ color: "var(--canvas-text-3)" }}>
                  {AREA_DESCRIPTIONS[a]}
                </span>
              </button>
            );
          })}
        </div>
        <FieldError msg={errors.areas} />
      </div>
    </div>
  );
}
