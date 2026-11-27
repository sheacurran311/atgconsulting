import { kpiRegistry, readinessLevels, readinessRubric } from "../../artifacts/api-server/src/lib/engagementMeasurement.ts";
import { transformationServices } from "../../artifacts/api-server/src/lib/transformationServices.ts";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const front = path.join(root, "artifacts/atg-consulting");
const requireFront = createRequire(path.join(front, "package.json"));
const {build} = createRequire(path.join(root, "artifacts/api-server/package.json"))("esbuild");
const postcss = requireFront("postcss");
const tailwind = requireFront("tailwindcss");
const config = {exports: {}};
vm.runInNewContext(await readFile(path.join(front, "tailwind.config.js"), "utf8"), {module: config, require: requireFront});
config.exports.content = [path.join(front, "src/**/*.{ts,tsx}").replaceAll("\\", "/")];
const css = (await postcss([tailwind(config.exports)])
  .process((await readFile(path.join(front, "src/index.css"), "utf8")).replace(/^@import.*;$/gm, ""), {from: undefined})).css;
const bundle = await build({
  stdin: {
    contents: `
      import React from "react";
      import {createRoot} from "react-dom/client";
      import {Router, Route, Switch} from "wouter";
      import Clients from "./src/pages/admin/clients";
      import Reports from "./src/pages/app/reports";
      createRoot(document.getElementById("root")).render(<Router><Switch>
        <Route path="/admin/clients/:id/:tab?" component={Clients}/>
        <Route path="/app/reports" component={Reports}/>
      </Switch></Router>);
    `,
    resolveDir: front, loader: "tsx",
  },
  plugins: [{name: "fixture-clerk", setup(plugin) {
    plugin.onResolve({filter: /^@clerk\/react$/}, () => ({path: "clerk", namespace: "fixture"}));
    plugin.onResolve({filter: /lib[\\/]clerk$/}, () => ({path: "config", namespace: "fixture"}));
    plugin.onLoad({filter: /.*/, namespace: "fixture"}, ({path: target}) => ({
      contents: target === "config" ? 'export const basePath = "";' :
        'export function useUser(){return {isLoaded:true,isSignedIn:true,user:{id:"fixture-user"}};} export function useClerk(){return {signOut:async()=>{}};}',
    }));
  }}],
  bundle: true, write: false, format: "iife", jsx: "automatic", alias: {"@": path.join(front, "src")},
  define: {"import.meta.env": JSON.stringify({BASE_URL: "/"}), "process.env.NODE_ENV": '"production"'},
});
const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
  css + '</style></head><body><div id="root"></div><script>' + bundle.outputFiles[0].text.replaceAll("</script", "<\\/script") + "</script></body></html>";
const account = {id: "fixture-user", clientId: "client-a", tier: "GUIDED", status: "ACTIVE", email: "fixture@example.invalid"};
const client = {id: "client-a", user: {name: "Fixture client", email: account.email}, tier: "GUIDED", status: "ACTIVE",
  industry: "services", aiLevel: 1, plans: [], intakes: [], workflowItems: [], consultations: [], documents: [], reports: [], workflows: []};
const base = "/api/admin/clients/client-a/engagement-workspace";
const measurement = {registry: kpiRegistry, registryVersion: 1, readinessLevels, readinessRubric,
  services: transformationServices.map(({id, name}) => ({id, name}))};
const sample = {kind: "change", workspace: "intake-a", period: "CO-001", version: 2, status: "published", createdAt: "2026-11-20T15:00:00.000Z",
  content: {reference: "CO-001", title: "Extra training", scope: "Support team onboarding", reason: "New team members",
    timeline: "Week two", acceptance: "Complete the session", includedHours: 2, additionalHourlyCents: 10000, additionalFeeCents: 20000,
    commercialTerms: "Invoice after acceptance"}};

const browser = await chromium.launch({headless: true, ...(process.env.ATG_CHROMIUM_EXECUTABLE
  ? {executablePath: process.env.ATG_CHROMIUM_EXECUTABLE, args: ["--no-sandbox", "--disable-dev-shm-usage"]}
  : process.platform === "win32" ? {channel: "msedge"} : {})});
try {
  for (const viewport of [{width: 390, height: 844}, {width: 1440, height: 1000}]) {
    const page = await browser.newPage({viewport, reducedMotion: "reduce"});
    const errors = [];
    let draft;
    let readinessDraft;
    let accepted = false;
    let clientView = false;
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      const json = body => route.fulfill({json: body});
      const method = route.request().method();
      if (url.origin !== "https://fixture.example.invalid") return route.abort();
      if (!url.pathname.startsWith("/api/")) return route.fulfill({contentType: "text/html", body: html});
      if (url.pathname === "/api/account" || url.pathname === "/api/client/me") return json({...account, role: clientView ? "CLIENT" : "ADMIN", isAdmin: !clientView});
      if (url.pathname === "/api/admin/clients/client-a") return json(client);
      if (url.pathname === "/api/admin/clients/client-a/prep") return json({});
      if (url.pathname === base) return json({intakes: [{id: "intake-a", status: "reviewed", createdAt: "2026-11-20T15:00:00.000Z", engagementId: null}]});
      if ([base + "/unlinked", base + "/intake-a"].includes(url.pathname)) return json({records: [draft, readinessDraft].filter(Boolean), source: null, measurement, contextVersion: 2});
      if (url.pathname === base + "/unlinked/readiness" && method === "PUT") {
        const data = route.request().postDataJSON();
        assert.equal(data.content.scores.infrastructure.score, 2);
        assert.equal(data.content.scores.data.score, null);
        readinessDraft = {kind: "readiness", workspace: "unlinked", version: 1, status: "draft", period: data.content.period,
          content: data.content, calculation: {score: null, coverage: 1, total: 6}};
        return json(readinessDraft);
      }
      if (url.pathname === base + "/unlinked/readiness/publish" && method === "POST") {
        assert.equal(route.request().postDataJSON().expectedVersion, 1);
        readinessDraft = {...readinessDraft, status: "published", version: 2};
        return json(readinessDraft);
      }
      if (url.pathname === base + "/unlinked/estimate" && method === "PUT") {
        const data = route.request().postDataJSON();
        assert.equal(data.content.input.additionalHourlyCents, 10000);
        const empty = {feeCents: 0, costCents: 0, includedHours: 0, contributionCents: 0, marginPercent: null, effectiveHourlyCents: null};
        draft = {kind: "estimate", version: 1, status: "draft", period: "", content: data.content,
          calculation: {setup: empty, monthly: empty, term: empty, firstYear: empty, rows: []}};
        return json(draft);
      }
      if (url.pathname === "/api/admin/clients/client-a/discovery/intake-a/billing") return json({accepted: false, liveEnabled: false, installments: []});
      if (url.pathname === "/api/admin/clients/client-a/discovery/intake-a/delivery") return json({milestones: [], consultations: []});
      if (url.pathname === "/api/admin/clients/client-a/seo/connections") return json({enabled: false, connections: []});
      if (url.pathname === "/api/portal/status") return json({hasClient: true, hasIntake: true, tier: "GUIDED", clientId: "client-a", personalizedSlugs: []});
      if (["/api/client/reports", "/api/workbench/messages"].includes(url.pathname)) return json([]);
      if (url.pathname === "/api/client/seo/connections") return json({enabled: false, connections: []});
      if (url.pathname === "/api/client/engagement-workspace") return json({records: [sample, readinessDraft].filter(Boolean), readinessBaselines: readinessDraft ? [readinessDraft] : []});
      if (url.pathname === "/api/client/engagement-workspace/change/accept" && method === "POST") {
        assert.deepEqual(route.request().postDataJSON(), {workspace: "intake-a", reference: "CO-001", expectedVersion: 2, authorized: true});
        accepted = true;
        return json({...sample, status: "accepted", version: 3});
      }
      if (url.pathname === "/api/admin/impersonate/status") return json({active: false});
      return json({});
    });
    const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true,
      "Horizontal overflow at " + viewport.width);
    await page.goto("https://fixture.example.invalid/admin/clients/client-a/engagement");
    await page.getByLabel("Engagement name").fill("Fixture estimate");
    await page.getByLabel("ATG internal hourly cost (USD)").fill("35");
    await page.getByLabel("Workstream name").fill("Workflow setup");
    await page.getByRole("button", {name: "Save draft revision"}).click();
    await page.getByText("Draft revision saved.").waitFor();
    await noOverflow();
    await page.getByRole("button", {name: "Readiness", exact: true}).click();
    await page.getByLabel("Digital infrastructure score").selectOption("2");
    await page.getByLabel("Digital infrastructure evidence").fill("Synthetic access inventory");
    await page.getByLabel("Client-visible assessment summary").fill("Fixture findings");
    await page.getByRole("button", {name: "Save draft revision"}).click();
    await page.getByRole("button", {name: "Publish reviewed copy to client"}).click();
    await page.getByText("Published to the client portal.").waitFor();
    await noOverflow();
    await page.getByRole("button", {name: "Opportunities", exact: true}).click();
    await page.getByLabel("Opportunity service").selectOption("workflow-engineering");
    await page.getByLabel("Evidence confidence (10%) score").waitFor();
    await page.getByRole("button", {name: "Value Measurement Plan", exact: true}).click();
    await page.getByRole("button", {name: "Add KPI", exact: true}).click();
    await page.getByLabel("KPI definition").selectOption("processing-time");
    await page.getByRole("button", {name: "Add forecast assumptions"}).click();
    await page.getByLabel("Client loaded hourly employee cost (USD)").fill("40");
    await noOverflow();
    await page.getByRole("button", {name: "Financial evidence", exact: true}).click();
    await page.getByLabel("Stable source record ID").fill("ledger-entry-1");
    await page.getByRole("button", {name: "SLA performance", exact: true}).click();
    await page.getByLabel("Initial response at").waitFor();
    await page.getByRole("button", {name: "SLA", exact: true}).click();
    await page.getByLabel("Additional-work hourly rate (USD)").waitFor();
    await page.getByLabel("P1 Initial response").waitFor();
    await noOverflow();
    await page.getByRole("button", {name: "Monthly ROI", exact: true}).click();
    await page.getByLabel("Attribution confidence").waitFor();
    await noOverflow();
    await page.getByRole("button", {name: "Fractional AI leadership", exact: true}).click();
    await page.getByRole("button", {name: "Add milestone", exact: true}).click();
    await page.getByLabel("Milestone owner").waitFor();
    await noOverflow();
    await page.getByRole("button", {name: "SEO and AEO", exact: true}).click();
    await page.getByText("Google sync is disabled. Use authorized exports for this report.").waitFor();
    await page.getByRole("button", {name: "Add answer engine sample"}).click();
    await page.getByLabel("Observation date").waitFor();
    await noOverflow();
    await page.getByLabel("Client engagement").selectOption("intake-a");
    assert.equal(await page.getByRole("link", {name: "Open linked discovery"}).getAttribute("href"), "/admin/discovery?intake=intake-a");
    await page.getByRole("heading", {name: "Proposal installments"}).waitFor();
    await noOverflow();
    clientView = true;
    await page.goto("https://fixture.example.invalid/app/reports");
    await page.getByText("Readiness baseline and comparison").waitFor();
    await page.getByText("CO-001 · Extra training · Review", {exact: true}).click({timeout: 6000}).catch(async error => {
      throw new Error("Client reports fixture failed at " + page.url() + "\n" + (await page.locator("body").innerText()).slice(0, 1000) + "\n" + errors.join("\n"), {cause: error});
    });
    await page.getByText("Support team onboarding").waitFor();
    await page.getByRole("checkbox", {name: /I am authorized/}).check();
    await page.getByRole("button", {name: "Accept this change order"}).click();
    await page.getByText("CO-001 · Extra training · Accepted", {exact: true}).waitFor();
    await noOverflow();
    assert.equal(accepted, true);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log("PASS: admin readiness, opportunity, measurement, finance, pricing, SLA, ROI, advisory and SEO UI, and client readiness and change-order acceptance at 390px and 1440px. All HTTP requests used fixtures.");
} finally {await browser.close();}
