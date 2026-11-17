/**
 * SEO monitoring analysis for customer-authorized GSC and GA4 metrics.
 * Pure calculations; no OAuth, network fetch, storage or publish side effects.
 * Source metrics have different definitions and must never be merged into one score.
 */
export interface GscPeriod {
  start: string;
  end: string;
  clicks: number;
  impressions: number;
  ctr: number; // proportion, 0-1
  averagePosition: number; // lower is better
}
export interface Ga4Period {
  start: string;
  end: string;
  organicSessions: number;
  keyEvents: number;
}
export interface SeoSnapshot {
  searchConsole: GscPeriod;
  analytics?: Ga4Period;
}
export interface SeoFinding {
  id: string;
  severity: "high" | "review" | "info";
  metric: "clicks" | "impressions" | "ctr" | "averagePosition" | "organicSessions" | "keyEvents";
  current: number;
  previous: number;
  changePct: number | null;
  explanation: string;
  nextStep: string;
  source: "GSC" | "GA4";
}
function finiteNonnegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`Invalid metric: ${name}`);
}
export function validateSeoSnapshot(snapshot: SeoSnapshot): void {
  const gsc = snapshot.searchConsole;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gsc.start) || !/^\d{4}-\d{2}-\d{2}$/.test(gsc.end) || gsc.start > gsc.end)
    throw new RangeError("Invalid Search Console observation window");
  for (const key of ["clicks", "impressions", "averagePosition"] as const) finiteNonnegative(gsc[key],`GSC ${key}`);
  if (!Number.isFinite(gsc.ctr) || gsc.ctr < 0 || gsc.ctr > 1) throw new RangeError("Invalid GSC CTR");
  if (snapshot.analytics) {
    const ga4=snapshot.analytics;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ga4.start) || !/^\d{4}-\d{2}-\d{2}$/.test(ga4.end) || ga4.start>ga4.end)
      throw new RangeError("Invalid GA4 observation window");
    finiteNonnegative(ga4.organicSessions,"GA4 organic sessions");
    finiteNonnegative(ga4.keyEvents,"GA4 key events");
  }
}
/** Percentage change. null means no valid percentage baseline, not an infinite increase. */
export function percentChange(current:number,previous:number):number|null {
  finiteNonnegative(current,"current"); finiteNonnegative(previous,"previous");
  return previous === 0 ? null : Math.round(((current-previous)/previous)*1000)/10;
}
function makeFinding(id:string,metric:SeoFinding["metric"],source:SeoFinding["source"],current:number,previous:number,severity:SeoFinding["severity"],explanation:string,nextStep:string):SeoFinding {
  return {id,metric,source,current,previous,severity,changePct:percentChange(current,previous),explanation,nextStep};
}
/**
 * Same-length source-aligned windows are required by caller, e.g. previous 28d
 * versus current 28d. Thresholds are initial review signals, not guarantees.
 */
export function detectSeoFindings(previous:SeoSnapshot,current:SeoSnapshot):SeoFinding[] {
  validateSeoSnapshot(previous); validateSeoSnapshot(current);
  const p=previous.searchConsole,c=current.searchConsole;
  const findings:SeoFinding[]=[];
  const clickChange=percentChange(c.clicks,p.clicks);
  if (p.clicks>=30 && clickChange!==null && clickChange<=-20) {
    findings.push(makeFinding("gsc-click-decline","clicks","GSC",c.clicks,p.clicks,"high",
      "Google organic search clicks fell by at least 20% relative to the comparison window.",
      "Review query and landing-page changes, dates, seasonality and search demand before proposing fixes."));
  }
  const impressionChange=percentChange(c.impressions,p.impressions);
  if (p.impressions>=100 && impressionChange!==null && impressionChange<=-25) {
    findings.push(makeFinding("gsc-impression-decline","impressions","GSC",c.impressions,p.impressions,"review",
      "Google Search impressions declined materially.",
      "Review indexing, query mix and search demand; correlate with clicks and position."));
  }
  if (p.impressions>=100 && c.impressions>=100 && c.ctr < p.ctr * 0.75 && p.ctr >= .01) {
    findings.push(makeFinding("gsc-ctr-decline","ctr","GSC",c.ctr,p.ctr,"review",
      "Search click-through rate dropped; a change in query mix may explain the shift.",
      "Inspect query and page CTR before altering titles or descriptions."));
  }
  if (p.clicks>=30 && c.clicks>=30 && c.averagePosition-p.averagePosition >= 3) {
    findings.push(makeFinding("gsc-position-decline","averagePosition","GSC",c.averagePosition,p.averagePosition,"review",
      "Average reported Search position worsened by at least three positions.",
      "Inspect per-query rankings; the aggregate average is influenced by query mix."));
  }
  if (previous.analytics && current.analytics) {
    const a=previous.analytics,b=current.analytics;
    const gaChange=percentChange(b.organicSessions,a.organicSessions);
    if(a.organicSessions>=30 && gaChange!==null && gaChange<=-20) {
      findings.push(makeFinding("ga4-organic-session-decline","organicSessions","GA4",b.organicSessions,a.organicSessions,"review",
        "GA4 organic sessions decreased. These are not directly comparable to GSC clicks.",
        "Check acquisition definitions, consent effects, tagging changes and landing pages."));
    }
    const keyChange=percentChange(b.keyEvents,a.keyEvents);
    if(a.keyEvents>=10 && keyChange!==null && keyChange<=-25) {
      findings.push(makeFinding("ga4-key-event-decline","keyEvents","GA4",b.keyEvents,a.keyEvents,"review",
        "GA4 key events attributed to the selected reporting scope declined.",
        "Verify event definitions, attribution and sample size before attributing causality."));
    }
  }
  return findings;
}
