import { Link } from "wouter";
import { hasOperator } from "@/lib/tiers";

export default function EmptyWorkbench({ tier, message }: { tier: string; message: string }) {
  const operator = hasOperator(tier);
  return (
    <div className="rounded-xl p-8 text-center" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
      <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>NOTHING HERE YET</p>
      <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>{message}</p>
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
