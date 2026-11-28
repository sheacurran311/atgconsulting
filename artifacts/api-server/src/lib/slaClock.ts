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
    if (elapsed < 0) issue("Incident milestones cannot precede the report.");
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

const MINUTE = 60_000;
const MAX_HISTORY = 3660 * 1440 * MINUTE;

export function slaTiming(record: SlaIncident, calendar: SlaCalendar | undefined, timezone: string, asOf?: string) {
  if (!calendar || !validTimezone(timezone)) return null;
  const format = new Intl.DateTimeFormat("en-CA", {timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
  const start = Date.parse(record.reportedAt);
  const cutoff = asOf ? Date.parse(asOf) : null;
  if (cutoff !== null && (!Number.isFinite(cutoff) || cutoff < start)) return null;
  const events = [
    ["acknowledgment", record.acknowledgedAt], ["response", record.respondedAt],
    ["restoration", record.restoredAt], ["resolution", record.resolvedAt],
    ["elapsedCoveredMinutes", asOf ?? null],
  ] as const;
  const measured: Record<typeof events[number][0], number | null> = {
    acknowledgment: null, response: null, restoration: null, resolution: null, elapsedCoveredMinutes: null,
  };
  const allCheckpoints = events.flatMap(([key, value]) => value ? [{key, at: Date.parse(value)}] : [])
    .filter(event => cutoff === null || event.at <= cutoff);
  const checkpoints = allCheckpoints.filter(event => event.at - start <= MAX_HISTORY).sort((a, b) => a.at - b.at);
  const complete = checkpoints.length === allCheckpoints.length;
  const pauses = record.pauses.map(pause => ({from: Date.parse(pause.from), to: Date.parse(pause.to)})).sort((a, b) => a.from - b.from);
  const excluded = new Set(calendar.excludedDates);
  const targets = calendar.targets[record.severity];
  const windows = new Map<string, Array<{start: number; end: number}>>();
  for (const day of weekday.options) {
    const merged: Array<{start: number; end: number}> = [];
    for (const window of calendar.intervals.filter(item => item.day === day).sort((a, b) => a.startMinute - b.startMinute)) {
      const previous = merged.at(-1);
      if (previous && window.startMinute <= previous.end) previous.end = Math.max(previous.end, window.endMinute);
      else merged.push({start: window.startMinute, end: window.endMinute});
    }
    windows.set(day, merged);
  }
  function local(at: number) {
    const parts = Object.fromEntries(format.formatToParts(at).map(part => [part.type, part.value]));
    return {date: parts.year + "-" + parts.month + "-" + parts.day, day: parts.weekday!,
      minute: Number(parts.hour) * 60 + Number(parts.minute)};
  }
  let covered = 0;
  let next = 0;
  let responseDeadline: string | null = null;
  let restorationDeadline: string | null = null;
  function credit(from: number, to: number) {
    if (to <= from) return;
    const total = covered + to - from;
    if (!responseDeadline && total >= targets.responseMinutes * MINUTE) {
      responseDeadline = new Date(from + Math.max(0, targets.responseMinutes * MINUTE - covered)).toISOString();
    }
    if (!restorationDeadline && total >= targets.restorationMinutes * MINUTE) {
      restorationDeadline = new Date(from + Math.max(0, targets.restorationMinutes * MINUTE - covered)).toISOString();
    }
    covered = total;
  }
  for (let at = start; next < checkpoints.length;) {
    const eventAt = checkpoints[next]!.at;
    if (at === eventAt) { measured[checkpoints[next]!.key] = covered / MINUTE; next++; continue; }
    const here = local(at);
    const minuteStart = Math.floor(at / MINUTE) * MINUTE;
    let end = Math.min(eventAt, minuteStart + (60 - here.minute % 60) * MINUTE);
    const last = local(end - 1);
    if (last.date !== here.date || last.minute !== here.minute + Math.floor((end - 1 - minuteStart) / MINUTE)) {
      end = Math.min(end, minuteStart + MINUTE);
    }
    if (!excluded.has(here.date)) {
      for (const window of windows.get(here.day) ?? []) {
        let from = Math.max(at, minuteStart + (window.start - here.minute) * MINUTE);
        const to = Math.min(end, minuteStart + (window.end - here.minute) * MINUTE);
        for (const pause of pauses) {
          if (pause.from >= to || pause.to <= from) continue;
          credit(from, pause.from);
          from = Math.max(from, pause.to);
        }
        credit(from, to);
      }
    }
    at = end;
  }
  const state = (minutes: number | null, target: number) => minutes !== null ? minutes <= target ? "met" : "breached"
    : measured.elapsedCoveredMinutes === null ? "unknown" : measured.elapsedCoveredMinutes > target ? "breached" : "open";
  return {...measured, ...targets, timezone, version: 2 as const, asOf: asOf ?? null, complete,
    responseDeadline, restorationDeadline, responseStatus: state(measured.response, targets.responseMinutes),
    restorationStatus: state(measured.restoration, targets.restorationMinutes),
    metResponse: measured.response === null ? null : measured.response <= targets.responseMinutes,
    metRestoration: measured.restoration === null ? null : measured.restoration <= targets.restorationMinutes};
}
