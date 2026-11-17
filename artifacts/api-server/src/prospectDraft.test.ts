import test from "node:test";
import assert from "node:assert/strict";
import { draftFallback } from "./lib/prospectDraft";
test("fallback prospect outreach requires verified source evidence",()=>{
  assert.throws(()=>draftFallback({businessName:"Example",verifiedEvidence:[]}),/Verified source/);
  assert.throws(()=>draftFallback({businessName:"Example",verifiedEvidence:[{claim:"Unverified fact",sourceUrl:"https://example.org",observedAt:"2026-11-17T00:00:00Z",verified:false}]}),/Verified source/);
});
test("fallback is human review copy, not an external send",()=>{
  const draft=draftFallback({businessName:"Example",verifiedEvidence:[{claim:"The business offers scheduled consultations.",sourceUrl:"https://example.org",observedAt:"2026-11-17T00:00:00Z",verified:true}]});
  assert.match(draft,/Example/);
  assert.match(draft,/scheduled consultations/);
  assert.doesNotMatch(draft,/I sent|has been sent/);
});
