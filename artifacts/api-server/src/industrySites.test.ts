import test from "node:test";
import assert from "node:assert/strict";
import { industrySites, industryPath, industryIntake } from "./lib/industrySites";
import { industryDocument } from "./lib/industryDocument";
import { preCallQuestions } from "./lib/assessmentProfile";
import { sitemapXml } from "./lib/seo";

test("every industry is discoverable, renders its own HTML, and maps to the intake",()=>{
  const origin="https://atgconsulting.io";
  const html='<html><head><title>Home</title></head><body><div id="root"></div></body></html>';
  const sitemap=sitemapXml(origin,[]);
  const options=preCallQuestions([{id:"audience",answer:"My business"}]).find(q=>q.id==="business_type")?.options;
  assert.equal(new Set(industrySites.map(s=>s.slug)).size,industrySites.length);
  for(const site of industrySites){
    const rendered=industryDocument(html,origin,site);
    assert.ok(rendered.includes("<title>Website Design for "+site.audience+" | ATG Consulting</title>"));
    assert.ok(rendered.includes('<link rel="canonical" href="'+origin+industryPath(site)+'"'));
    assert.ok(rendered.includes("<h1") && rendered.includes(site.question));
    assert.ok(sitemap.includes("<loc>"+origin+industryPath(site)+"</loc>"));
    const link=new URL(industryIntake(site),origin);
    assert.equal(link.searchParams.get("vertical"),site.slug);
    assert.equal(link.searchParams.get("service"),"website");
    assert.ok(options?.includes(site.industry));
    const questions=preCallQuestions([{id:"audience",answer:"My business"},{id:"business_type",answer:site.industry},{id:"top_problems",answer:'["Build or redesign a website"]'}]);
    assert.ok(questions.some(q=>q.text.includes(site.question)));
  }
  assert.ok(!preCallQuestions([{id:"audience",answer:"My personal and family life"}]).some(q=>q.id==="business_type"));
});
