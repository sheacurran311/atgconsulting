import { z } from "zod";
import { detectSeoFindings } from "./seoMonitoring";

const date = z.string().date();
const count = z.number().int().nonnegative().max(1_000_000_000);
const measure = z.number().finite().nonnegative().max(1_000_000_000);
const text = z.string().trim().min(1).max(500);
const window = {start: date, end: date};
export const gscPeriod = z.object({...window, clicks: count, impressions: count,
  ctr: z.number().min(0).max(1), averagePosition: measure,
}).strict();
export const gaPeriod = z.object({...window, organicSessions: count, keyEvents: measure}).strict();
export const seoSnapshot = z.object({searchConsole: gscPeriod, analytics: gaPeriod.optional()}).strict();
const source = z.object({property: text, baselineReference: text, currentReference: text}).strict();
const citation = z.string().trim().max(400).url().refine(input => /^https?:\/\//i.test(input));

export const SeoEvidenceInput = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  gsc: source,
  ga4: source.nullable(),
  previous: seoSnapshot,
  current: seoSnapshot,
  notes: z.string().trim().min(1).max(2000),
  actions: z.array(z.object({action: text, owner: text, due: date, status: z.enum(["proposed", "approved", "verified"]),
    evidence: z.string().trim().max(500),
  }).strict()).max(15),
  aeo: z.array(z.object({
    queryReference: z.string().trim().regex(/^[A-Z0-9][A-Z0-9-]{0,39}$/).optional(),
    queryVersion: z.number().int().positive().optional(),
    model: text.optional(),
    limitations: text.optional(),
    question: text, platform: text, sampledOn: date, locationContext: text, observedMention: z.boolean(), citations: z.array(citation).max(10),
  }).strict()).max(25),
}).strict().superRefine((input, ctx) => {
  const issue = (message: string) => ctx.addIssue({code: "custom", message});
  if (!!input.ga4 !== (!!input.previous.analytics && !!input.current.analytics) ||
      !!input.previous.analytics !== !!input.current.analytics) issue("GA4 requires its own authorized source and two windows.");
  for (const [prior, current] of [[input.previous.searchConsole, input.current.searchConsole], [input.previous.analytics, input.current.analytics]] as const) {
    if (!prior || !current) continue;
    if (prior.start > prior.end || current.start > current.end || prior.end >= current.start) issue("SEO observation windows must be chronological and non-overlapping.");
    if (!current.end.startsWith(input.period)) issue("The current window must end during the report month.");
  }
  if ([input.previous.searchConsole, input.current.searchConsole].some(item => item.clicks > item.impressions)) issue("Search clicks cannot exceed impressions in the same aggregate.");
  for (const row of input.aeo) {
    if (!!row.queryReference !== !!row.queryVersion) issue("A tracked query requires both a reference and version.");
    if (row.queryReference && !row.limitations) issue("Record the collection limitations for each tracked query.");
  }
  if (input.actions.some(action => action.status === "verified" && !action.evidence)) issue("Verified actions require evidence.");
  try {detectSeoFindings(input.previous, input.current);}
  catch {issue("Use valid calendar dates and equal-length windows for each source.");}
});
export type SeoEvidenceInput = z.infer<typeof SeoEvidenceInput>;
export const summarizeSeo = (input: SeoEvidenceInput) => detectSeoFindings(input.previous, input.current);


type AeoSample = SeoEvidenceInput["aeo"][number];
export function aeoIdentity(row: AeoSample) {
  return row.queryReference ? JSON.stringify([row.queryReference, row.queryVersion]) : null;
}
export function aeoScope(row: AeoSample) {
  return JSON.stringify([row.question, row.platform, row.model ?? "", row.locationContext].map(value => value.trim().toLowerCase()));
}
export function conflictingAeoVersions(samples: AeoSample[]) {
  const versions = new Map<string, string>();
  return samples.some(sample => {
    const identity = aeoIdentity(sample);
    if (!identity) return false;
    const scope = aeoScope(sample);
    const prior = versions.get(identity);
    if (prior !== undefined && prior !== scope) return true;
    versions.set(identity, scope);
    return false;
  });
}
