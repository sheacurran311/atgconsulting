import test from "node:test";
import assert from "node:assert/strict";
import { marketingDocument } from "./lib/marketingDocument";
import { marketingPage, marketingPaths, seoIndustries, servicePages } from "./lib/transformationMarketing";
import { sitemapXml } from "./lib/seo";
import { industrySites } from "./lib/industrySites";
import { transformationServices } from "./lib/transformationServices";

test("all approved services have unique crawlable pages and intake deep links", () => {
  assert.equal(servicePages.length, 12);
  assert.equal(new Set(marketingPaths).size, marketingPaths.length);
  const base = "https://atg.example.invalid";
  const sitemap = sitemapXml(base, []);
  for (const service of transformationServices) {
    const path = "/services/" + service.id;
    const page = marketingPage(path);
    assert.ok(page);
    const html = marketingDocument('<html><head><title>ATG</title></head><body><div id="root"></div></body></html>', base, page);
    assert.ok(html.includes('rel="canonical" href="' + base + path + '"'));
    assert.ok(html.includes('href="/intake?audience=business&amp;service=' + service.id + '"'));
    assert.ok(sitemap.includes(base + path));
  }
  assert.equal(seoIndustries.length, industrySites.length);
  assert.ok(seoIndustries.find(page => page.path.endsWith("/orthopedic-surgeons"))?.intake.includes("vertical=orthopedic-surgeons"));
  assert.equal(marketingPage("/services/no-match"), undefined);
});
