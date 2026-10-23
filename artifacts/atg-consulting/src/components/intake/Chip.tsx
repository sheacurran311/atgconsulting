// Reusable toggle chip for multi-select and single-select groups in the intake form.

interface ChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function Chip({ label, selected, onToggle, disabled }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={`chip transition-all ${
        selected ? "chip-selected" : "chip-unselected"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {selected && (
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {label}
    </button>
  );
}
