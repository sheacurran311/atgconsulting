/**
 * Work hours, typical day, and (for a small team) whose day this is.
 * Used by intake and by the dashboard setup.
 */
import {
  DAY_BLOCK_KEYS,
  DAY_BLOCK_LABELS,
  TIMEZONES,
  WEEKDAY_LABELS,
  formatMinutes,
  timeOptions,
  type DayAnswers,
  type DayBlockKey,
} from "@/lib/day";

export function DayFields({
  value,
  bizSize,
  onChange,
}: {
  value: DayAnswers;
  bizSize: string | null;
  onChange: (next: DayAnswers) => void;
}) {
  const zones = TIMEZONES.some((zone) => zone.value === value.timezone)
    ? TIMEZONES
    : [{ value: value.timezone, label: value.timezone }, ...TIMEZONES];
  const smallTeam = bizSize === "2-10";

  function toggleDay(day: number) {
    const workDays = value.workDays.includes(day)
      ? value.workDays.filter((item) => item !== day)
      : [...value.workDays, day];
    onChange({ ...value, workDays });
  }

  function toggleBlock(key: DayBlockKey) {
    const typicalDay = value.typicalDay.includes(key)
      ? value.typicalDay.filter((item) => item !== key)
      : [...value.typicalDay, key];
    onChange({ ...value, typicalDay });
  }

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="block text-sm font-medium mb-1.5" style={{ color: "var(--canvas-text)" }}>Timezone</span>
        <select
          className="field-input text-sm"
          value={value.timezone}
          onChange={(e) => onChange({ ...value, timezone: e.target.value })}
        >
          {zones.map((zone) => (
            <option key={zone.value} value={zone.value}>{zone.label}</option>
          ))}
        </select>
      </label>

      <div>
        <p className="text-sm font-medium mb-1.5" style={{ color: "var(--canvas-text)" }}>Days you usually work</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, day) => {
            const selected = value.workDays.includes(day);
            return (
              <button
                key={label}
                type="button"
                className={selected ? "chip-selected" : "chip-unselected"}
                aria-pressed={selected}
                onClick={() => toggleDay(day)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-medium mb-1.5" style={{ color: "var(--canvas-text)" }}>Start</span>
          <select
            className="field-input text-sm"
            value={value.startMin}
            onChange={(e) => onChange({ ...value, startMin: Number(e.target.value) })}
          >
            {timeOptions(value.startMin).map((minute) => (
              <option key={minute} value={minute}>{formatMinutes(minute)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1.5" style={{ color: "var(--canvas-text)" }}>Stop</span>
          <select
            className="field-input text-sm"
            value={value.endMin}
            onChange={(e) => onChange({ ...value, endMin: Number(e.target.value) })}
          >
            {timeOptions(value.endMin).map((minute) => (
              <option key={minute} value={minute}>{formatMinutes(minute)}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--canvas-text)" }}>A typical day, in order</p>
        <p className="text-xs mb-2" style={{ color: "var(--canvas-text-3)" }}>
          Click to add. The number is the order. Click again to remove.
        </p>
        <div className="flex flex-wrap gap-2">
          {DAY_BLOCK_KEYS.map((key) => {
            const order = value.typicalDay.indexOf(key);
            const selected = order >= 0;
            return (
              <button
                key={key}
                type="button"
                className={selected ? "chip-selected" : "chip-unselected"}
                aria-pressed={selected}
                onClick={() => toggleBlock(key)}
              >
                {selected ? `${order + 1}. ` : ""}{DAY_BLOCK_LABELS[key]}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="block text-sm font-medium mb-1.5" style={{ color: "var(--canvas-text)" }}>
          Anything else a typical day includes? <span style={{ color: "var(--canvas-text-3)", fontWeight: 400 }}>(optional)</span>
        </span>
        <textarea
          className="field-input resize-none text-sm"
          rows={2}
          maxLength={280}
          value={value.typicalNote}
          onChange={(e) => onChange({ ...value, typicalNote: e.target.value })}
          placeholder="School pickup at 3, or jobs that always run long."
        />
      </label>

      {smallTeam && (
        <div>
          <p className="text-sm font-medium mb-1.5" style={{ color: "var(--canvas-text)" }}>Whose day is this?</p>
          <div className="space-y-2">
            {([
              ["individual", "Mine — this is my day"],
              ["team", "The team's shared day"],
            ] as const).map(([scope, label]) => {
              const selected = value.dayScope === scope;
              return (
                <button
                  key={scope}
                  type="button"
                  onClick={() => onChange({ ...value, dayScope: scope })}
                  className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium"
                  style={{
                    border: `1px solid ${selected ? "var(--blue)" : "var(--canvas-border)"}`,
                    background: selected ? "rgba(59,107,255,0.06)" : "var(--canvas-1)",
                    color: "var(--canvas-text)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {value.dayScope === "team" && (
            <label className="block mt-3">
              <span className="block text-sm font-medium mb-1.5" style={{ color: "var(--canvas-text)" }}>
                Who else should the plan account for? <span style={{ color: "var(--canvas-text-3)", fontWeight: 400 }}>(optional)</span>
              </span>
              <input
                className="field-input text-sm"
                maxLength={200}
                value={value.teamNote}
                onChange={(e) => onChange({ ...value, teamNote: e.target.value })}
                placeholder="Front desk covers the phones until noon"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
