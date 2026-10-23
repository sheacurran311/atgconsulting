import { Link } from "wouter";
import { hasOperator } from "@/lib/tiers";

export default function EmptyWorkbench({ tier, onDraft }: { tier: string; onDraft: () => void }) {
  const operator = hasOperator(tier);
  return (
    <div className="rounded-xl p-8 text-center" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
      <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>NOTHING HAS RUN YET</p>
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--canvas-text)" }}>Nothing has run yet.</p>
      <p className="text-xs mb-4" style={{ color: "var(--canvas-text-3)" }}>
        {operator
          ? "Draft your first follow-up — Shea will help tune it from there."
          : "Draft a follow-up when you are ready. Nothing is sent until you copy it yourself."}
      </p>
      <button type="button" onClick={onDraft} className="btn-primary text-sm" style={{ padding: "8px 14px" }}>
        Draft a follow-up
      </button>
      {!operator && (
        <p className="text-xs mt-4">
          <Link to="/app/consultations" className="underline" style={{ color: "var(--blue)" }}>
            Want Shea to set this up for you?
          </Link>
        </p>
      )}
    </div>
  );
}
