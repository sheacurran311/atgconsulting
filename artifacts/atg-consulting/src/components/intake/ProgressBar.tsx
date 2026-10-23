interface ProgressBarProps {
  step: number;   // 1-based current step
  total: number;
  labels: string[];
}

export default function ProgressBar({ step, total, labels }: ProgressBarProps) {
  return (
    <div className="w-full" aria-label={`Step ${step} of ${total}: ${labels[step - 1]}`}>
      {/* Step labels */}
      <div className="flex justify-between mb-2">
        {labels.map((label, i) => (
          <span
            key={label}
            className={`text-xs font-semibold transition-colors ${
              i + 1 === step
                ? "text-orange"
                : i + 1 < step
                ? "text-navy"
                : "text-navy/30"
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Track */}
      <div className="h-1.5 bg-navy/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange rounded-full transition-all duration-500"
          style={{ width: `${((step - 1) / (total - 1)) * 100}%` }}
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={total}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-between mt-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i + 1 <= step ? "bg-orange" : "bg-navy/15"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
