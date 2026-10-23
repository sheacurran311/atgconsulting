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
      className={selected ? "chip-selected" : "chip-unselected"}
      style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
    >
      {selected && (
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {label}
    </button>
  );
}
