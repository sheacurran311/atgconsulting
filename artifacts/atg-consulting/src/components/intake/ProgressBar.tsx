interface ProgressBarProps {
  step: number;
  total: number;
  labels: string[];
}

export default function ProgressBar({ step, total, labels }: ProgressBarProps) {
  const pct = ((step - 1) / (total - 1)) * 100;

  return (
    <div className="w-full" aria-label={`Step ${step} of ${total}: ${labels[step - 1]}`}>
      {/* Labels */}
      <div className="flex justify-between mb-2">
        {labels.map((label, i) => (
          <span
            key={label}
            className="font-mono text-2xs transition-colors"
            style={{
              color: i + 1 === step ? "var(--blue)" : i + 1 < step ? "var(--canvas-text-2)" : "var(--canvas-text-3)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Track */}
      <div
        className="h-px rounded-full overflow-hidden"
        style={{ background: "var(--canvas-border)" }}
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "var(--blue)",
            transition: "width 0.4s cubic-bezier(0.2,0,0,1)",
          }}
        />
      </div>

      {/* Dots */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              width: i + 1 === step ? "20px" : "6px",
              height: "6px",
              background: i + 1 <= step ? "var(--blue)" : "var(--canvas-border)",
              transition: "all 0.3s cubic-bezier(0.2,0,0,1)",
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
