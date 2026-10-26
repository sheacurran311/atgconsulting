/** Shared day-dashboard labels and checks. Mirrors the API planner keys. */

export const DAY_BLOCK_KEYS = [
  "morning_email",
  "client_work",
  "followups",
  "admin",
  "deep_work",
  "lunch",
  "personal",
] as const;

export type DayBlockKey = (typeof DAY_BLOCK_KEYS)[number];

export const DAY_BLOCK_LABELS: Record<DayBlockKey, string> = {
  morning_email: "Morning email",
  client_work: "Client or job work",
  followups: "Follow-ups",
  admin: "Admin",
  deep_work: "Deep work",
  lunch: "Lunch",
  personal: "Personal or family",
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Phoenix", label: "Arizona" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "Europe/London", label: "London" },
  { value: "UTC", label: "UTC" },
];

export interface DayAnswers {
  timezone: string;
  workDays: number[];
  startMin: number;
  endMin: number;
  typicalDay: DayBlockKey[];
  typicalNote: string;
  dayScope: "individual" | "team";
  teamNote: string;
}

export function isDayBlockKey(value: string): value is DayBlockKey {
  return (DAY_BLOCK_KEYS as readonly string[]).includes(value);
}

export function defaultTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && TIMEZONES.some((item) => item.value === zone)) return zone;
    if (zone) return zone;
  } catch {
    /* fall through */
  }
  return "America/Denver";
}

export function defaultDayAnswers(): DayAnswers {
  return {
    timezone: defaultTimezone(),
    workDays: [1, 2, 3, 4, 5],
    startMin: 480,
    endMin: 1020,
    typicalDay: ["morning_email", "client_work", "followups"],
    typicalNote: "",
    dayScope: "individual",
    teamNote: "",
  };
}

export function dayAnswersError(value: DayAnswers, bizSize: string | null): string | null {
  if (!value.timezone.trim()) return "Pick a timezone.";
  if (value.workDays.length === 0) return "Pick at least one work day.";
  if (value.endMin <= value.startMin) return "Work needs to end after it starts.";
  if (value.typicalDay.length === 0) return "Pick at least one part of a typical day.";
  if (bizSize === "2-10" && value.dayScope !== "individual" && value.dayScope !== "team") {
    return "Say whether this is your day or the team's.";
  }
  return null;
}

export function formatMinutes(min: number): string {
  const clamped = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatWorkDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.join(",") === "1,2,3,4,5") return "Mon–Fri";
  return sorted.map((day) => WEEKDAY_LABELS[day] ?? "").filter(Boolean).join(", ");
}

export function formatDayHeading(date: string, timezone: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  }).format(noon);
}

export function timeOptions(current: number): number[] {
  const options: number[] = [];
  for (let minute = 300; minute <= 1260; minute += 30) options.push(minute);
  if (!options.includes(current)) options.push(current);
  return options.sort((a, b) => a - b);
}

export const ACCOUNT_KIND_LABELS: Record<string, string> = {
  email: "Email",
  calendar: "Calendar",
  other: "Other",
};

export const ACCOUNT_PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  apple: "Apple",
  other: "Other",
};
