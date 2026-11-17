import test from "node:test";
import assert from "node:assert/strict";
import { atgBusinessSkills, skillsForAudience } from "./lib/businessSkillRegistry";
test("curated business Skills have unique official source paths",()=>{
  assert.equal(new Set(atgBusinessSkills.map(x=>x.id)).size,atgBusinessSkills.length);
  assert.ok(atgBusinessSkills.length>=20);
  for(const item of atgBusinessSkills){
    assert.equal(item.source,`https://github.com/coreyhaines31/marketingskills/blob/main/skills/${item.id}/SKILL.md`);
    assert.ok(item.consultantAction && item.evidenceRequired && item.humanApproval);
  }
});
test("Free Tools do not expose the complete internal consultant library",()=>{
  const free=skillsForAudience("free").map(x=>x.id);
  assert.ok(free.includes("seo-audit") && free.includes("free-tools"));
  assert.ok(!free.includes("prospecting") && !free.includes("cold-email"));
  assert.ok(skillsForAudience("guided").length>free.length);
});
test("no development Skills are promoted to client service audiences",()=>{
  assert.ok(atgBusinessSkills.every(x=>!["react","typescript","frontend-design","playwright","superpowers"].includes(x.id)));
});
