// Isolated browser regression tests: every request is fulfilled from fixtures.
// Uses the approved page host, starts no server and accesses no live account/data.
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const front = path.join(root, "artifacts/atg-consulting");
const requireFront = createRequire(path.join(front, "package.json"));
const { build } = createRequire(path.join(root, "artifacts/api-server/package.json"))("esbuild");
const configModule = { exports: {} };
vm.runInNewContext(await readFile(path.join(front, "tailwind.config.js"), "utf8"), { module: configModule, require: requireFront });
configModule.exports.content = [path.join(front, "src/**/*.{ts,tsx}").replaceAll("\\", "/")];
const css = (await requireFront("postcss")([requireFront("tailwindcss")(configModule.exports)]).process((await readFile(path.join(front, "src/index.css"), "utf8")).replace(/^@import.*;$/gm, ""), { from: undefined })).css;
const bundle = await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Sessions from './src/components/admin/SessionsTab'; createRoot(document.getElementById('root')).render(<div style={{padding:24}}><Sessions clientId="client-a" /></div>);`, resolveDir: front, loader: "tsx" }, bundle: true, write: false, format: "iife", jsx: "automatic", alias: { "@": path.join(front, "src") }, define: { "import.meta.env": JSON.stringify({ BASE_URL: "/" }), "process.env.NODE_ENV": '"production"' } });
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${bundle.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script></body></html>`;
const out = path.join(root, ".test-output", "private-sharing"); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = []; page.on("pageerror", (err) => errors.push(err.message));
let record = { id: "session-a", clientId: "client-a", sessionDate: "2026-11-15", sessionType: "other", sessionNumber: null, recordingUrl: null, consentGiven: true, shareRecap: true, recapText: "Published recap stays unchanged", summaryJson: JSON.stringify({ shortRecap: "Saved private draft", source: "MANUAL" }), summarySource: "MANUAL", adminNotes: "Private operator notes", transcript: "Speaker A:\nPrivate source", createdAt: "2026-11-15T10:00:00.000Z", updatedAt: "2026-11-15T10:00:00.000Z" };
let failCreate = true; let failSave = 500; const requests = [];
function advance() { record.updatedAt = new Date(Date.parse(record.updatedAt) + 1).toISOString(); }
await page.route("**/*", async (route) => {
  const url = new URL(route.request().url()); const method = route.request().method();
  if (!url.pathname.startsWith("/api/")) return route.fulfill({ contentType: "text/html", body: html });
  const body = route.request().postDataJSON(); requests.push({ path: url.pathname, method, body });
  if (method === "GET") return route.fulfill({ json: url.pathname.endsWith("/sessions") ? [record] : record });
  if (method === "POST" && url.pathname.endsWith("/sessions")) {
    if (failCreate) return route.fulfill({ status: 500, json: { error: "Save failed. Your source is still here." } });
    return route.fulfill({ status: 201, json: { ...record, ...body, id: "created-session", shareRecap: false, recapText: null, summaryJson: null, summarySource: null } });
  }
  if (body.expectedUpdatedAt !== record.updatedAt) return route.fulfill({ status: 409, json: { error: "This session changed. Reload the saved version." } });
  if (url.pathname.endsWith("/recap-draft")) {
    if (failSave) { const status = failSave; failSave = 0; if (status === 409) { record.summaryJson = JSON.stringify({ shortRecap: "Another operator's draft" }); advance(); } return route.fulfill({ status, json: { error: status === 409 ? "This session changed. Reload the saved version." : "Save failed. Your editor text is still here." } }); }
    record.summaryJson = JSON.stringify({ shortRecap: body.recapText, source: "MANUAL" }); advance(); return route.fulfill({ json: record });
  }
  if (url.pathname.endsWith("/recap/publish")) { record.recapText = JSON.parse(record.summaryJson).shortRecap; record.shareRecap = true; advance(); return route.fulfill({ json: record }); }
  if (url.pathname.endsWith("/summarize")) { record.summaryJson = JSON.stringify({ shortRecap: "Regenerated private draft", source: "TEMPLATE", sourceWarning: "Source exceeds 20,000 characters. Review the full source before publishing." }); record.summarySource = "TEMPLATE"; advance(); return route.fulfill({ json: { session: record, summary: JSON.parse(record.summaryJson), warning: "Review the remaining source before publishing." } }); }
  return route.fulfill({ status: 500, json: { error: "Unexpected test request" } });
});
try {
  await page.goto("https://3e58f60d-93ea-4e0d-91d8-799c20a3158f-00-2noc46nremglm.kirk.replit.dev/");
  await page.getByRole("button", { name: /^Other ·/ }).click();
  const editor = page.getByRole("textbox", { name: /Private recap draft/ });
  const publish = page.getByRole("button", { name: "Publish reviewed recap", exact: true });
  const save = page.getByRole("button", { name: "Save recap draft", exact: true });
  await editor.fill("Edited reviewed recap"); assert.equal(await publish.isDisabled(), true);
  await save.click(); await page.getByRole("alert").getByText(/Save failed/).waitFor(); assert.equal(await editor.inputValue(), "Edited reviewed recap");
  failSave = 409; await save.click(); await page.getByRole("button", { name: "Reload saved version; keep my text", exact: true }).click();
  await page.getByText("Another operator's draft", { exact: true }).waitFor(); assert.equal(await editor.inputValue(), "Edited reviewed recap");
  await save.click(); await page.getByRole("status").getByText(/Private draft saved/).waitFor();
  assert.equal(record.recapText, "Published recap stays unchanged"); await publish.click(); await page.getByRole("status").getByText(/Reviewed recap published/).waitFor(); assert.equal(record.recapText, "Edited reviewed recap");
  await page.getByRole("button", { name: "Regenerate private draft", exact: true }).click(); await page.getByRole("status").getByText(/Template draft created/).waitFor(); assert.equal(record.recapText, "Edited reviewed recap");
  await page.getByRole("button", { name: "Show private source", exact: true }).click(); await page.getByText("Speaker A:\nPrivate source", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(out, "recap-editor-desktop.png"), fullPage: true });
  const source = page.getByRole("textbox", { name: "Transcript / source notes (private)", exact: true });
  await source.fill("Unsaved source\nSecond paragraph"); await page.getByRole("button", { name: "Add session", exact: true }).click();
  await page.getByRole("alert").getByText(/Save failed. Your source/).waitFor(); assert.equal(await source.inputValue(), "Unsaved source\nSecond paragraph");
  failCreate = false; await page.getByRole("button", { name: "Add session", exact: true }).click(); await page.getByRole("button", { name: /^Guided session ·/ }).waitFor(); assert.equal(await source.inputValue(), "");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: path.join(out, "recap-editor-mobile.png"), fullPage: true });
  assert.deepEqual(errors, []);
  assert.ok(requests.some((r) => r.path.endsWith("/recap/publish") && r.body.expectedUpdatedAt));
  console.log("PASS: editor retains failed saves, stale-version comparison, separate publish, regeneration snapshot, source retention, manual draft rendering, mobile width, no browser errors. All network requests were intercepted.");
} finally { await browser.close(); }
