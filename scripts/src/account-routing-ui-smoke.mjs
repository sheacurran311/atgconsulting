// Isolated UI regressions. All HTTP requests are intercepted; no real account is used.
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
const bundle = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {Router,Switch,Route} from 'wouter'; import Landing from './src/components/AccountLanding'; import IntakeEntry from './src/components/IntakeEntry'; import Account from './src/pages/admin/account'; import Shell from './src/components/admin/AdminShell'; createRoot(document.getElementById('root')).render(<Router><Switch><Route path="/auth/continue" component={Landing}/><Route path="/admin/account" component={Account}/><Route path="/admin/today">{()=><Shell><h1>Admin dashboard</h1></Shell>}</Route><Route path="/intake">{()=><IntakeEntry><h1>Intake editor</h1></IntakeEntry>}</Route><Route path="/app">{()=><h1>Customer dashboard</h1>}</Route><Route><h1>Signed out</h1></Route></Switch></Router>);`, resolveDir: front, loader: "tsx" },
  plugins: [{ name: "fixture-auth", setup(plugin) {
    plugin.onResolve({ filter: /@clerk\/react$/ }, () => ({ path: "clerk", namespace: "fixture" }));
    plugin.onResolve({ filter: /lib[\\/]clerk$/ }, () => ({ path: "clerk-config", namespace: "fixture" }));
    plugin.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path: p }) => ({ contents: p === "clerk-config" ? `export const basePath="";` : `export function useUser(){ return {isLoaded:true,isSignedIn:true,user:{id:"fixture-user"}}; } export function useClerk(){ return {signOut: async (options)=>{sessionStorage.setItem("fixtureSignOutOptions",JSON.stringify(options)); if(window.failSignOut)throw new Error("Fixture failure"); window.location.assign("/signed-out");}}; }` }));
  } }],
  bundle: true, write: false, format: "iife", jsx: "automatic", alias: { "@": path.join(front, "src") }, define: { "import.meta.env": JSON.stringify({ BASE_URL: "/" }), "process.env.NODE_ENV": '"production"' },
});
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${bundle.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script></body></html>`;
const out = path.join(root, ".test-output", "account-routing"); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
const errors = []; const requests = []; page.on("pageerror", (err) => errors.push(err.message));
await page.addInitScript(() => { if(new URLSearchParams(location.search).has("stale")){sessionStorage.setItem("atg-client-view","1");sessionStorage.setItem("atg-signed-in-user","fixture-user");} });
let role = "ADMIN"; let linked = true; let failIdentity = false; let failExit = false;
await page.route("**/*", async (route) => {
  const url = new URL(route.request().url()); const method = route.request().method();
  if(!url.pathname.startsWith("/api/")) return route.fulfill({contentType:"text/html",body:html});
  requests.push({path:url.pathname,method});
  if(url.pathname === "/api/account") return failIdentity ? route.fulfill({status:503,json:{error:"Account temporarily unavailable"}}) : route.fulfill({json:{id:"fixture-user",name:"Shea Example",email:role === "ADMIN" ? "shea@example.com" : "customer@example.com",role,isAdmin:role === "ADMIN",clientId:null}});
  if(url.pathname === "/api/admin/impersonate" && method === "DELETE") return route.fulfill({status:failExit ? 503 : 200,json:{ok:!failExit}});
  if(url.pathname === "/api/portal/status") return route.fulfill({json:{hasClient:true,hasIntake:linked}});
  return route.fulfill({status:500,json:{error:"Unexpected fixture request: "+url.pathname}});
});
const host = "https://atgconsulting.io";
try {
  await page.goto(host+"/auth/continue?stale=1"); await page.getByRole("heading",{name:"Admin dashboard",exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>sessionStorage.getItem("atg-client-view")),null);
  assert.ok(requests.some(r=>r.path==="/api/admin/impersonate" && r.method==="DELETE"));
  await page.getByRole("link",{name:"Account",exact:true}).click(); await page.getByRole("heading",{name:"Account",exact:true}).waitFor();
  await page.getByText("Administrator",{exact:true}).waitFor(); assert.equal(await page.getByText("PROSPECT",{exact:true}).count(),0);
  await page.screenshot({path:path.join(out,"admin-account-desktop.png"),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  const moreBounds=await page.getByRole("button",{name:"More",exact:true}).boundingBox(); assert.ok(moreBounds && moreBounds.x+moreBounds.width<=390,"Mobile More menu must fit on screen");
  await page.getByRole("button",{name:"More",exact:true}).click();
  await page.getByRole("link",{name:"Account",exact:true}).filter({visible:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(out,"admin-account-mobile.png"),fullPage:true});
  await page.getByRole("button",{name:"More",exact:true}).click();
  await page.screenshot({path:path.join(out,"admin-account-mobile.png"),fullPage:true});
  await page.evaluate(()=>{window.failSignOut=true;}); await page.getByRole("button",{name:"Sign out",exact:true}).filter({visible:true}).click();
  await page.getByRole("alert").getByText(/Could not sign out/).waitFor(); await page.evaluate(()=>{window.failSignOut=false;});
  await page.getByRole("button",{name:"Sign out",exact:true}).filter({visible:true}).click(); await page.getByRole("heading",{name:"Signed out",exact:true}).waitFor();
  assert.deepEqual(JSON.parse(await page.evaluate(()=>sessionStorage.getItem("fixtureSignOutOptions"))),{redirectUrl:"/"});
  await page.goto(host+"/intake"); await page.getByRole("heading",{name:"Admin dashboard",exact:true}).waitFor();
  role="CLIENT"; const beforeClient=requests.length;
  await page.goto(host+"/auth/continue"); await page.getByRole("heading",{name:"Customer dashboard",exact:true}).waitFor();
  assert.ok(!requests.slice(beforeClient).some(r=>r.path==="/api/admin/impersonate"));
  await page.goto(host+"/intake"); await page.getByRole("heading",{name:"Customer dashboard",exact:true}).waitFor();
  linked=false; await page.goto(host+"/intake"); await page.getByRole("heading",{name:"Intake editor",exact:true}).waitFor();
  linked=true; const beforeEdit=requests.length; await page.goto(host+"/intake?edit=true"); await page.getByRole("heading",{name:"Intake editor",exact:true}).waitFor(); assert.equal(requests.length,beforeEdit);
  await page.goto(host+"/intake?resume=fixture-id"); await page.getByRole("heading",{name:"Intake editor",exact:true}).waitFor();
  failIdentity=true; await page.goto(host+"/auth/continue"); await page.getByRole("alert").getByText(/Account temporarily unavailable/).waitFor(); assert.equal(await page.getByRole("heading",{name:"Intake editor",exact:true}).count(),0);
  failIdentity=false; await page.getByRole("button",{name:"Try again",exact:true}).click(); await page.getByRole("heading",{name:"Customer dashboard",exact:true}).waitFor();
  role="ADMIN"; failExit=true; await page.goto(host+"/auth/continue"); await page.getByRole("alert").getByText(/Could not return to admin view/).waitFor();
  failExit=false; await page.getByRole("button",{name:"Try again",exact:true}).click(); await page.getByRole("heading",{name:"Admin dashboard",exact:true}).waitFor();
  assert.ok(!requests.some(r=>r.path==="/api/client/me")); assert.deepEqual(errors,[]);
  console.log("PASS: admin/customer landing, stale Client View reset, linked-intake redirect, deliberate edit/resume, admin Account and sign-out on desktop/mobile, sign-out error recovery, failed identity/exit retries, no customer-profile dependency. All requests intercepted.");
} finally { await browser.close(); }
