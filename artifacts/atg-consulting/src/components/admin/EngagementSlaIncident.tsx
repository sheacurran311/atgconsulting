import type { SlaIncident, SlaInput } from "@/lib/engagementWorkspace";
import { card, formGrid, NumericField, SelectField, TextField } from "./EngagementFields";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const severity = ["P1", "P2", "P3", "P4"] as const;
const targets = () => ({responseMinutes: 0, restorationMinutes: 0});
const clock = (minutes: number) => String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
const minutes = (stamp: string) => {
  const [hour, minute] = stamp.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
};

export function SlaCoverageEditor({calendar, change}: {calendar: SlaInput["calendar"]; change: (value: SlaInput["calendar"]) => void}) {
  if (!calendar) return <div className={card}>
    <p className="text-sm">Add structured coverage only after agreeing on the clock, local holidays, and time targets. The written terms remain part of the SLA.</p>
    <button type="button" className="btn-ghost" onClick={() => change({intervals: [], excludedDates: [],
      targets: {P1: targets(), P2: targets(), P3: targets(), P4: targets()}})}>Configure covered-hours clock</button>
  </div>;
  return <div className={card}>
    <h3 className="font-bold">Covered-hours clock</h3>
    <p className="text-sm">Enter times in the SLA time zone. To cover all day, use 00:00 to 24:00. Split overnight coverage at midnight.</p>
    {calendar.intervals.map((interval, i) => {
      const assign = (patch: Partial<typeof interval>) => change({...calendar, intervals: calendar.intervals.map((row, index) => index === i ? {...row, ...patch} : row)});
      return <div key={i} className="grid gap-2 sm:grid-cols-4">
        <SelectField label="Covered weekday" value={interval.day} choices={days.map(value => ({value, label: value}))} onChange={day => assign({day})} />
        <TextField label="Starts (HH:MM)" value={clock(interval.startMinute)} onChange={value => {
          if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) assign({startMinute: minutes(value)});
        }} type="time" />
        <TextField label="Ends (HH:MM)" value={interval.endMinute === 1440 ? "" : clock(interval.endMinute)} onChange={value => {
          if (!value || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) assign({endMinute: value ? minutes(value) : 1440});
        }} type="time" />
        <button type="button" className="btn-ghost" onClick={() =>
          change({...calendar, intervals: calendar.intervals.filter((_, index) => i !== index)})}>Remove window</button>
      </div>;
    })}
    <p className="text-sm">A blank end time represents midnight (24:00).</p>
    <button type="button" className="btn-ghost" disabled={calendar.intervals.length >= 28} onClick={() =>
      change({...calendar, intervals: [...calendar.intervals, {day: "Mon", startMinute: 540, endMinute: 1020}]})}>Add coverage window</button>
    <TextField label="Excluded holidays (one YYYY-MM-DD per line)" multiline value={calendar.excludedDates.join("\n")}
      onChange={value => change({...calendar, excludedDates: value.split("\n")})} />
    {severity.map(level => <fieldset className={formGrid} key={level}><legend>{level} targets in covered minutes</legend>
      {(["responseMinutes", "restorationMinutes"] as const).map(key => <NumericField key={key} label={key === "responseMinutes" ? "Initial response target" : "Restoration target"}
        value={calendar.targets[level][key]} onChange={number => change({...calendar, targets: {...calendar.targets, [level]: {...calendar.targets[level], [key]: number ?? 0}}})} />)}
    </fieldset>)}
    <button type="button" className="btn-ghost" onClick={() => change(undefined)}>Remove structured clock from draft</button>
  </div>;
}

export const newSlaIncident = (reference: string, slaVersion: number): SlaIncident => ({
  reference, slaVersion, title: "", severity: "P3", reportedAt: "", acknowledgedAt: null, respondedAt: null,
  restoredAt: null, resolvedAt: null, pauses: [], escalations: "", exceptions: "", evidence: "",
});

export function EngagementSlaIncident({value, change, versions, recorded}: {
  value: SlaIncident; change: (value: SlaIncident) => void; versions: number[]; recorded: boolean;
}) {
  const assign = (patch: Partial<SlaIncident>) => change({...value, ...patch});
  return <div className={card}>
    <p className="text-sm">Use timestamps with an explicit offset, such as 2026-11-26T09:30:00-07:00. Published timing uses the executed agreement’s covered hours and recorded authorized pauses.</p>
    <div className={formGrid}>
      <TextField label="Incident title" value={value.title} onChange={title => assign({title})} />
      <SelectField label="Severity" value={value.severity} choices={severity.map(value => ({value, label: value}))} onChange={severity => assign({severity})} />
      {recorded ? <p>Executed SLA revision {value.slaVersion}</p> : <SelectField label="Executed SLA revision"
        value={value.slaVersion ? String(value.slaVersion) : ""} choices={[{value: "", label: "Select executed revision"},
          ...versions.map(version => ({value: String(version), label: "Revision " + version}))]} onChange={version => assign({slaVersion: Number(version)})} />}
      {(["reportedAt", "acknowledgedAt", "respondedAt", "restoredAt", "resolvedAt"] as const).map((key, i) => <TextField key={key}
        label={["Reported at", "Acknowledged at", "Initial response at", "Restored at", "Resolved at"][i]} value={value[key] ?? ""}
        onChange={stamp => assign({[key]: key === "reportedAt" ? stamp : stamp || null})} />)}
      {(["evidence", "exceptions", "escalations"] as const).map((key, i) => <TextField key={key} multiline
        label={["Evidence reference", "Client-visible exceptions", "Escalation record"][i]} value={value[key]} onChange={text => assign({[key]: text})} />)}
    </div>
    {value.pauses.map((pause, i) => <fieldset key={i} className={formGrid}><legend>Authorized pause {i + 1}</legend>
      {(["from", "to", "reason", "authorizationReference"] as const).map((key, idx) => <TextField key={key} label={["Starts at", "Ends at", "Dependency or pause reason", "Authorization reference"][idx]}
        value={pause[key]} onChange={text => assign({pauses: value.pauses.map((item, j) => i === j ? {...item, [key]: text} : item)})} />)}
      <button type="button" className="btn-ghost" onClick={() => assign({pauses: value.pauses.filter((_, index) => index !== i)})}>Remove pause</button>
    </fieldset>)}
    <button type="button" className="btn-ghost" disabled={value.pauses.length >= 16} onClick={() =>
      assign({pauses: [...value.pauses, {from: "", to: "", reason: "", authorizationReference: ""}]})}>Add authorized pause</button>
  </div>;
}
