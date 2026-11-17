import test from "node:test";
import assert from "node:assert/strict";
import { detectSeoFindings, percentChange, type SeoSnapshot } from "./lib/seoMonitoring";

const previous:SeoSnapshot={
  searchConsole:{start:"2026-10-01",end:"2026-10-28",clicks:100,impressions:1000,ctr:.1,averagePosition:8},
  analytics:{start:"2026-10-01",end:"2026-10-28",organicSessions:100,keyEvents:20},
};
const current:SeoSnapshot={
  searchConsole:{start:"2026-10-29",end:"2026-11-25",clicks:60,impressions:750,ctr:.08,averagePosition:12},
  analytics:{start:"2026-10-29",end:"2026-11-25",organicSessions:70,keyEvents:10},
};
test("detects source-specific SEO alerts without merging GA4 with GSC",()=>{
  const findings=detectSeoFindings(previous,current);
  assert.ok(findings.some(x=>x.id==="gsc-click-decline"&&x.source==="GSC"));
  assert.ok(findings.some(x=>x.id==="ga4-organic-session-decline"&&x.source==="GA4"));
  assert.equal(findings.find(x=>x.id==="gsc-click-decline")?.changePct,-40);
});
test("low-volume metrics do not cause noisy alerts",()=>{
  const low:SeoSnapshot={searchConsole:{...previous.searchConsole,clicks:4,impressions:20,ctr:.2,averagePosition:10}};
  const newLow:SeoSnapshot={searchConsole:{...low.searchConsole,clicks:1,impressions:5,ctr:.2,averagePosition:12}};
  assert.deepEqual(detectSeoFindings(low,newLow),[]);
});
test("missing GA4 data is not synthesized",()=>{
  const a:SeoSnapshot={searchConsole:previous.searchConsole};
  const b:SeoSnapshot={searchConsole:current.searchConsole};
  assert.ok(detectSeoFindings(a,b).every(x=>x.source==="GSC"));
});
test("zero baseline is not presented as infinite growth",()=>{
  assert.equal(percentChange(100,0),null);
  assert.throws(()=>percentChange(-1,1),RangeError);
});
test("invalid source metrics are rejected",()=>{
  assert.throws(()=>detectSeoFindings(previous,{...current,searchConsole:{...current.searchConsole,ctr:1.5}}),RangeError);
});

test("comparison periods must be equal-length and valid calendar dates",()=>{
  assert.throws(()=>detectSeoFindings(previous,{
    ...current,searchConsole:{...current.searchConsole,end:"2026-11-24"}
  }),/equal-length/);
  assert.throws(()=>detectSeoFindings(previous,{
    ...current,searchConsole:{...current.searchConsole,start:"2026-02-30"}
  }),/observation window|ISO date/);
  assert.throws(()=>detectSeoFindings(previous,{
    ...current,analytics:{...current.analytics!,end:"2026-11-24"}
  }),/equal-length/);
});
