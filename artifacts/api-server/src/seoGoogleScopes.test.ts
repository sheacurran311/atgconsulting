import test from "node:test";
import assert from "node:assert/strict";
import { approvedSeoScopes, SEO_GOOGLE_SCOPES } from "./lib/seoGoogleScopes";
test("Google OAuth scope allowlist is strictly read-only SEO",()=>{
  assert.deepEqual(approvedSeoScopes("GUIDED",["searchConsole","analytics"]),[
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/analytics.readonly",
  ]);
  assert.equal(Object.values(SEO_GOOGLE_SCOPES).length,2);
});
test("Free Tools and arbitrary OAuth targets are prohibited",()=>{
  assert.throws(()=>approvedSeoScopes("NONE",["searchConsole"]));
  assert.throws(()=>approvedSeoScopes("SELF_SERVE",["analytics"]));
  assert.throws(()=>approvedSeoScopes("GUIDED",["gmail" as never]));
});
