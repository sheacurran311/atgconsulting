import { z } from "zod";
import { assessmentReference } from "./engagementMeasurement";

const weekday = z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
const minute = z.number().int().min(0).max(1440);
const durations = z.object({responseMinutes: z.number().int().nonnegative().max(129600),
  restorationMinutes: z.number().int().nonnegative().max(129600)}).strict();

export const SlaCalendar = z.object({
  intervals: z.array(z.object({day: weekday, startMinute: minute.max(1439), endMinute: minute}).strict()
    .refine(value => value.endMinute > value.startMinute, "Coverage must end after it starts. Split overnight windows at midnight.")).min(1).max(28),
  excludedDates: z.array(z.string().date()).max(100),
  targets: z.object({P1: durations, P2: durations, P3: durations, P4: durations}).strict(),
}).strict();
export type SlaCalendar = z.infer<typeof SlaCalendar>;

const dateTime = z.string().datetime({offset: true});
const note = z.string().trim().min(1).max(1500);
export const SlaIncident = z.object({
  reference: assessmentReference,
  title: z.string().trim().min(1).max(200),
  slaVersion: z.number().int().positive(),
  severity: z.enum(["P1", "P2", "P3", "P4"]),
  reportedAt: dateTime,
  acknowledgedAt: dateTime.nullable(),
  respondedAt: dateTime.nullable(),
  restoredAt: dateTime.nullable(),
  resolvedAt: dateTime.nullable(),
  pauses: z.array(z.object({from: dateTime, to: dateTime, reason: note, authorizationReference: note}).strict()).max(16),
  escalations: z.string().trim().max(1500),
  exceptions: z.string().trim().max(1500),
  evidence: note,
}).strict().superRefine((record, ctx) => {
  const reported = Date.parse(record.reportedAt);
  const issue = (message: string) => ctx.addIssue({code: "custom", message});
  for (const timestamp of [record.acknowledgedAt, record.respondedAt, record.restoredAt, record.resolvedAt]) {
    if (!timestamp) continue;
    const elapsed = Date.parse(timestamp) - reported;
    if (elapsed < 0 || elapsed > 90 * 86400_000) issue("Incident milestones must fall within 90 days after the report.");
  }
  if (record.restoredAt && record.resolvedAt && Date.parse(record.restoredAt) > Date.parse(record.resolvedAt)) {
    issue("Resolution must follow restoration when both timestamps are known.");
  }
  const pauses = record.pauses.map(pause => ({from: Date.parse(pause.from), to: Date.parse(pause.to)})).sort((a, b) => a.from - b.from);
  if (pauses.some((pause, i) => pause.from < reported || pause.to <= pause.from || (i > 0 && pause.from < pauses[i - 1]!.to))) {
    issue("Authorized pauses must be nonoverlapping and start after the incident was reported.");
  }
});
export type SlaIncident = z.infer<typeof SlaIncident>;

export function validTimezone(zone: string) {
  try { new Intl.DateTimeFormat("en-US", {timeZone: zone}); return true; }
  catch { return false; }
}

export function slaTiming(record: SlaIncident, calendar: SlaCalendar | undefined, timezone: string) {
  if (!calendar || !validTimezone(timezone)) return null;
  const format = new Intl.DateTimeFormat("en-CA", {timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
  const start = Date.parse(record.reportedAt);
  const events = [
    ["acknowledgment", record.acknowledgedAt], ["response", record.respondedAt],
    ["restoration", record.restoredAt], ["resolution", record.resolvedAt],
  ] as const;
  const measured = {acknowledgment: null, response: null, restoration: null, resolution: null} as Record<typeof events[number][0], number | null>;
  const checkpoints = events.flatMap(([key, value]) => value ? [{key, at: Date.parse(value)}] : [])
    .sort((a, b) => a.at - b.at);
  const pauses = record.pauses.map(pause => ({from: Date.parse(pause.from), to: Date.parse(pause.to)}));
  const excluded = new Set(calendar.excludedDates);
  let covered = 0;
  let next = 0;
  for (let at = start; next < checkpoints.length;) {
    const eventAt = checkpoints[next]!.at;
    if (at === eventAt) { measured[checkpoints[next]!.key] = covered / 60_000; next++; continue; }
    const end = Math.min(eventAt, (Math.floor(at / 60_000) + 1) * 60_000);
    const parts = Object.fromEntries(format.formatToParts(new Date(at)).map((part) => [part.type, part.value]));
    const localDate = parts.year + "-" + parts.month + "-" + parts.day;
    const minuteOfDay = Number(parts.hour) * 60 + Number(parts.minute);
    if (!excluded.has(localDate) && calendar.intervals.some(window => window.day === parts.weekday &&
      minuteOfDay >= window.startMinute && minuteOfDay < window.endMinute)) {
      const paused = pauses.reduce((total, pause) => total + Math.max(0, Math.min(end, pause.to) - Math.max(at, pause.from)), 0);
      covered += end - at - paused;
    }
    at = end;
  }
  const targets = calendar.targets[record.severity];
  return {...measured, ...targets, timezone, version: 1 as const,
    metResponse: measured.response === null ? null : measured.response <= targets.responseMinutes,
    metRestoration: measured.restoration === null ? null : measured.restoration <= targets.restorationMinutes};
}
