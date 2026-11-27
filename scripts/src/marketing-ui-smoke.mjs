import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { marketingPage, marketingPaths } from "../../artifacts/api-server/src/lib/transformationMarketing.ts";
import { industryIntake, industryPath, industrySites } from "../../artifacts/api-server/src/lib/industrySites.ts";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../artifacts/atg-consulting");
const fromFrontend = createRequire(path.join(frontend, "package.json"));
const {preview} = await import(pathToFileURL(fromFrontend.resolve("vite")).href);
process.env.PORT ??= "4511";
process.env.BASE_PATH ??= "/";
const server = await preview({configFile: path.join(frontend, "vite.config.ts"), preview: {host: "127.0.0.1", port: 4511, strictPort: true}});
const origin = server.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await chromium.launch({headless: true, ...(process.env.ATG_CHROMIUM_EXECUTABLE
  ? {executablePath: process.env.ATG_CHROMIUM_EXECUTABLE, args: ["--no-sandbox", "--disable-dev-shm-usage"]} : {})});
try {
  assert.equal(marketingPaths.length, 23);
  const targets = [...marketingPaths.map(url => ({url, cta: marketingPage(url).intake})),
    ...industrySites.map(site => ({url: industryPath(site), cta: industryIntake(site)}))];
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({viewport: {width, height: 900}, javaScriptEnabled: false, reducedMotion: "reduce"});
    const sitemapResponse = await page.request.get(origin + "/sitemap.xml");
    assert.equal(sitemapResponse.status(), 200);
    const sitemap = await sitemapResponse.text();
    const robots = await (await page.request.get(origin + "/robots.txt")).text();
    assert.match(robots, /Sitemap: .+\/sitemap\.xml/);
    const titles = new Set();
    const descriptions = new Set();
    for (const {url, cta} of targets) {
      const response = await page.goto(origin + url, {waitUntil: "domcontentloaded"});
      assert.equal(response.status(), 200, url);
      assert.equal(await page.locator("main h1").count(), 1, url);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      assert.equal(new URL(canonical).pathname, url);
      assert.ok(sitemap.includes("<loc>" + canonical + "</loc>"), url);
      assert.equal(await page.locator('meta[property="og:url"]').getAttribute("content"), canonical);
      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      assert.ok(title && description && !titles.has(title) && !descriptions.has(description), url);
      titles.add(title);
      descriptions.add(description);
      const data = JSON.parse(await page.locator('script[type="application/ld+json"]').last().textContent());
      assert.equal(data.url, canonical);
      const href = await page.locator("main a[href^='/intake']").first().getAttribute("href");
      assert.equal(href, cta);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, url + " overflow at " + width);
      if (width === 390) {
        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement instanceof HTMLAnchorElement), true, url + " first focus");
      }
    }
    for (const prefix of ["/services", "/seo-aeo", "/website-design"]) {
      assert.equal((await page.goto(origin + prefix + "/atg-qa-missing")).status(), 404);
    }
    await page.close();
  }
  console.log("PASS: 23 transformation marketing routes plus " + industrySites.length +
    " website-design routes at 390px, 768px, and 1440px with JavaScript disabled. Checked metadata, structured data, sitemap, intake hrefs, keyboard focus, overflow and route-family 404s.");
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
