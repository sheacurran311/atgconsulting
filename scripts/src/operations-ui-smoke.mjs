// Isolated component/browser tests. All requests are intercepted; no server,
// Clerk session, real customer data, or external API is needed.
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { buildOperatingPlan } from "../../artifacts/api-server/src/lib/operatingPlan.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const front = path.join(root, "artifacts/atg-consulting");
const requireFront = createRequire(path.join(front, "package.json"));
const requireApi = createRequire(path.join(root, "artifacts/api-server/package.json"));
const { build } = requireApi("esbuild");
const postcss = requireFront("postcss");
const tailwind = requireFront("tailwindcss");
const configModule = { exports: {} };
vm.runInNewContext(await readFile(path.join(front, "tailwind.config.js"), "utf8"), { module: configModule, require: requireFront });
const config = configModule.exports;
config.content = [path.join(front, "src/**/*.{ts,tsx}").replaceAll("\\", "/")];
const cssInput = (await readFile(path.join(front, "src/index.css"), "utf8")).replace(/^@import.*;$/gm, "");
const css = (await postcss([tailwind(config)]).process(cssInput, { from: undefined })).css;
const bundle = await build({
  stdin: { contents: `import React from 'react'; import { createRoot } from 'react-dom/client'; import Home from './src/components/OperationsHome'; import Guide from './src/components/app/OperatingGuide'; import Intake from './src/pages/intake'; const view = new URLSearchParams(location.search).get('view'); createRoot(document.getElementById('root')).render(view === 'intake' ? <Intake /> : view === 'admin' ? <div style={{padding:24}}><Guide clientId="client-a" /></div> : view === 'guide' ? <div style={{padding:24}}><Guide /></div> : <Home />);`, resolveDir: front, loader: "tsx" },
  bundle: true, write: false, format: "iife", jsx: "automatic", alias: { "@": path.join(front, "src") }, define: { "import.meta.env": JSON.stringify({ BASE_URL: "/" }), "process.env.NODE_ENV": '"production"' },
});
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${bundle.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script></body></html>`;
const out = path.join(root, ".test-output"); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const content = buildOperatingPlan(JSON.stringify([{ id: "audience", answer: "Both business and personal life" }, { id: "top_problems", answer: "Coordinate school schedules and sales follow-up" }]));
let record = { id: "plan-a", version: 1, content: JSON.stringify(content), internalNotes: "Private operator notes", publishedContent: JSON.stringify(content), publishedVersion: 1, publishedAt: new Date().toISOString(), acceptedVersion: null, acceptedAt: null, events: [] };
const requests = [];
let failNext = false;
await page.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (url.pathname.startsWith("/api/")) {
    const method = route.request().method(); const body = route.request().postDataJSON(); requests.push({ path: url.pathname, method, body });
    if (url.pathname.endsWith("/discovery/start")) return route.fulfill({ json: { sessionId: "test-intake", answers: [{ id: "contact_email", category: "contact", question: "Email", answer: body.contactEmail }], questions: [{ id: "contact_name", category: "contact", text: "What's your name?", type: "text" }], totalAsked: 1, done: false } });
    if (url.pathname.endsWith("/discovery/next")) {
      if (failNext) { failNext = false; return route.fulfill({ status: 429, json: { error: "Please wait. Your answer is safe." } }); }
      return route.fulfill({ json: { answers: body.answers, questions: [], totalAsked: 2, done: true } });
    }
    if (url.pathname.endsWith("/accept")) { record.acceptedVersion = body.version; record.acceptedAt = new Date().toISOString(); return route.fulfill({ json: { ok: true } }); }
    if (url.pathname.endsWith("/events") && method === "POST") { record.events.push({ id: "event-a", ...body, createdAt: new Date().toISOString(), resolvedAt: null }); return route.fulfill({ status: 201, json: { ok: true } }); }
    if (method === "PUT") { record.content = JSON.stringify(body.content); record.version++; return route.fulfill({ json: { ok: true } }); }
    if (url.pathname.endsWith("/publish")) { record.publishedContent = record.content; record.publishedVersion = record.version; return route.fulfill({ json: { ok: true } }); }
    const result = url.pathname.startsWith("/api/admin") ? record : { ...record, content: undefined, internalNotes: undefined };
    return route.fulfill({ json: { plan: result } });
  }
  if (url.pathname.endsWith(".svg")) { try { return route.fulfill({ contentType: "image/svg+xml", body: await readFile(path.join(front, "public", url.pathname), "utf8") }); } catch { return route.fulfill({ status: 404, body: "" }); } }
  return route.fulfill({ contentType: "text/html", body: html });
});
try {
  await page.goto("https://atg.test/");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.getByRole("button", { name: "For your life", exact: true }).click();
  await page.getByRole("heading", { name: "Make room for the people who matter." }).waitFor();
  assert.equal(await page.locator('a[href="/intake?audience=personal"]').count(), 1);
  await page.screenshot({ path: path.join(out, "homepage-desktop.png"), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.screenshot({ path: path.join(out, "homepage-mobile.png"), fullPage: true });
  await page.goto("https://atg.test/?view=guide");
  await page.getByRole("heading", { name: "A plan you can put to work." }).waitFor();
  assert.equal(await page.getByText("Private operator notes", { exact: true }).count(), 0);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirm reviewed version" }).click();
  await page.getByText(/You confirmed this version/).waitFor();
  await page.getByRole("textbox", { name: /What happened/ }).fill("Calendar test needs a duplicate-event check.");
  await page.getByRole("button", { name: "Send report", exact: true }).click();
  await page.getByText("Calendar test needs a duplicate-event check.", { exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.screenshot({ path: path.join(out, "customer-guide-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("https://atg.test/?view=admin");
  await page.getByRole("textbox", { name: "Your priorities", exact: true }).fill("Updated pilot priorities");
  assert.equal(await page.getByRole("button", { name: "Publish reviewed guide" }).isDisabled(), true);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByText("Draft saved. Published guide is unchanged.").waitFor();
  assert.notEqual(record.content, record.publishedContent);
  await page.getByRole("button", { name: "Publish reviewed guide" }).click();
  await page.getByText("Reviewed guide published to the customer.").waitFor();
  await page.screenshot({ path: path.join(out, "operator-guide-desktop.png"), fullPage: true });
  await page.goto("https://atg.test/intake?view=intake&audience=personal");
  await page.getByRole("button", { name: /Start.*assessment|Start.*intake|Get started|Begin/i }).first().click();
  await page.getByPlaceholder("you@company.com").fill("test@example.com");
  await page.getByRole("button", { name: /Continue|Start/i }).first().click();
  await page.getByText("What's your name?", { exact: true }).waitFor();
  const start = requests.find((r) => r.path.endsWith("/discovery/start"));
  assert.equal(start.body.answers.find((a) => a.id === "audience").answer, "My personal and family life");
  const input = page.locator("textarea").first(); await input.fill("Test visitor"); failNext = true;
  await page.getByRole("button", { name: /Next|Continue/i }).first().click();
  await page.getByText("Please wait. Your answer is safe.").waitFor();
  assert.equal(await input.inputValue(), "Test visitor");
  assert.deepEqual(errors, []);
  console.log("UI smoke passed: desktop/mobile homepage, audience links, guide permissions, acceptance, feedback, draft/publish, and intake retry.");
} finally { await browser.close(); }
