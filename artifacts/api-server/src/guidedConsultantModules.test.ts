import test from "node:test";
import assert from "node:assert/strict";
import { guidedConsultantModules } from "./lib/guidedConsultantModules";
test("Guided modules have unique IDs and actionable acceptance criteria", () => {
  assert.equal(new Set(guidedConsultantModules.map(m=>m.id)).size,guidedConsultantModules.length);
  assert.ok(guidedConsultantModules.length>=5);
  for(const m of guidedConsultantModules){
    assert.ok(m.discovery.length>=3);
    assert.ok(m.implementation.length>=3);
    assert.ok(m.acceptance.length>0 && m.monitoring.length>0);
    assert.ok(m.skills.length>0);
  }
});
test("no client OAuth except read-only SEO Google properties",()=>{
  const text=JSON.stringify(guidedConsultantModules).toLowerCase();
  assert.ok(text.includes("ga4"));
  assert.ok(text.includes("search console"));
  assert.ok(!text.includes("gmail oauth"));
});
