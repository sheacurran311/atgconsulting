// Generation and saved-account regression journeys. Every HTTP request is intercepted.
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { buildClientDeployment } from "../../artifacts/api-server/src/lib/clientDeployment.ts";
import { deliveryGuide } from "../../artifacts/api-server/src/lib/masterPlaybook.ts";
import { nativePlatforms, recommendAutomationBots } from "../../artifacts/api-server/src/lib/automationLibrary.ts";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."); const front=path.join(root,"artifacts/atg-consulting");
const requireFront=createRequire(path.join(front,"package.json")); const {build}=createRequire(path.join(root,"artifacts/api-server/package.json"))("esbuild");
const cm={exports:{}}; vm.runInNewContext(await readFile(path.join(front,"tailwind.config.js"),"utf8"),{module:cm,require:requireFront}); cm.exports.content=[path.join(front,"src/**/*.{ts,tsx}").replaceAll("\\","/")];
const css=(await requireFront("postcss")([requireFront("tailwindcss")(cm.exports)]).process((await readFile(path.join(front,"src/index.css"),"utf8")).replace(/^@import.*;$/gm,""),{from:undefined})).css;
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {Router,Switch,Route} from 'wouter';import Discovery from './src/pages/admin/discovery';import Clients from './src/pages/admin/clients';import Shell from './src/components/app/AppShell';createRoot(document.getElementById('root')).render(<Router><Switch><Route path="/admin/discovery" component={Discovery}/><Route path="/admin/clients/:id/:tab?" component={Clients}/><Route path="/app"><Shell><h1>Client dashboard reached</h1></Shell></Route></Switch></Router>);`,resolveDir:front,loader:"tsx"},plugins:[{name:"fixture-clerk",setup(p){p.onResolve({filter:/@clerk\/react$/},()=>({path:"clerk",namespace:"fixture"}));p.onResolve({filter:/lib[\\/]clerk$/},()=>({path:"config",namespace:"fixture"}));p.onLoad({filter:/.*/,namespace:"fixture"},({path:p})=>({contents:p==="config"?`export const basePath="";`:`export function useUser(){return {isLoaded:true,isSignedIn:true,user:{id:"fixture-user"}};}export function useClerk(){return {signOut:async()=>{}};}`}));}}],bundle:true,write:false,format:"iife",jsx:"automatic",alias:{"@":path.join(front,"src")},define:{"import.meta.env":JSON.stringify({BASE_URL:"/"}),"process.env.NODE_ENV":'"production"'}});
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${bundle.outputFiles[0].text.replaceAll("</script","<\\/script")}</script></body></html>`;

const out=path.join(root,".test-output","generation-linking");await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.platform==="win32"?{channel:"msedge"}:{})});const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on("pageerror",e=>errors.push(e.message));
let role="ADMIN";let portalMode="legacy";let failedReport=false;let failedProposal=false;let reportRoute=null;let proposalRoute=null;let reportCalls=0;
const report={summary:"A saved fixture report",keyFindings:["Review one pilot"],painPoints:["Repeat work"],suggestedTier:"GUIDED",tierRationale:"Guided setup",proposalScope:"One pilot",recommendedWorkflows:[],discoveryQuestions:[],risks:[],nextSteps:[]};
const proposal={id:"proposal-a",discoveryIntakeId:"intake-a",status:"draft",execSummary:"Saved proposal fixture",understanding:"Client need",scope:"Agreed pilot",howWeConnect:"Native apps",milestones:"[]",investment:"{}",acceptanceClause:"Review before acceptance",approvedAt:null,portalPublishedAt:null};
const intake={id:"intake-a",contactName:"Fixture customer",contactEmail:"customer@example.com",status:"new",tokensUsed:0,consentGiven:true,createdAt:"2026-11-16T08:00:00Z",clientId:null,reportDraft:null,answers:"[]",transcript:"Fixture notes",reportApprovedAt:null};
let client={id:"client-a",userId:"user-a",user:{name:"Fixture customer",email:"customer@example.com"},tier:"NONE",status:"PROSPECT",industry:"services",aiLevel:1,notes:null,plans:[{intakeId:"legacy-a"}],intakes:[],hasLegacyAssessment:true,unlinkedAssessmentCount:1,workflowItems:[],consultations:[],documents:[],reports:[],workflows:[]};
await page.route("**/*",async route=>{
 const u=new URL(route.request().url());const method=route.request().method();const json=value=>route.fulfill({json:value});
 if(!u.pathname.startsWith("/api/"))return route.fulfill({contentType:"text/html",body:html});
 if(u.pathname==="/api/account")return json({id:"user-a",role,isAdmin:role==="ADMIN",clientId:"client-a",email:"customer@example.com"});
 if(u.pathname==="/api/client/me")return json({id:"user-a",role,isAdmin:role==="ADMIN",clientId:"client-a",tier:"GUIDED",status:"ACTIVE",email:"customer@example.com"});
 if(u.pathname==="/api/admin/clients"&&method==="GET")return json([client]);
 if(u.pathname==="/api/admin/clients/client-a"&&method==="GET")return json(client);
 if(u.pathname==="/api/admin/clients/client-a"&&method==="PATCH"){const patch=route.request().postDataJSON();client={...client,...patch,...(patch.tier?{status:"ACTIVE"}:{})};return json({...patch,status:client.status});}
 if(u.pathname==="/api/admin/clients/client-a/prep")return json(null);
 if(u.pathname==="/api/admin/clients/client-a/link-assessments"){client={...client,intakes:[{...intake,clientId:"client-a"}],unlinkedAssessmentCount:0};return json({linked:1});}
 if(u.pathname==="/api/admin/discovery")return json({intakes:[intake],total:1});
 if(u.pathname==="/api/admin/discovery/intake-a"&&method==="GET")return json(intake);
 if(u.pathname==="/api/admin/discovery/intake-a/proposal"&&method==="GET")return route.fulfill({status:404,json:{error:"No proposal yet"}});
 if(u.pathname==="/api/admin/discovery/intake-a/report"&&method==="POST"){reportCalls++;if(!failedReport){failedReport=true;return route.fulfill({status:503,json:{error:"Report provider unavailable"}});}reportRoute=route;return;}
 if(u.pathname==="/api/admin/discovery/intake-a/proposal"&&method==="POST"){if(!failedProposal){failedProposal=true;return route.fulfill({status:500,json:{error:"Proposal could not save"}});}proposalRoute=route;return;}
 if(u.pathname==="/api/portal/status"){if(portalMode==="error")return route.fulfill({status:503,json:{error:"Account check unavailable"}});return json({hasClient:true,hasIntake:portalMode==="legacy",assessmentSource:portalMode==="legacy"?"legacy":"none",tier:"GUIDED",clientId:"client-a",testMode:false,personalizedSlugs:[],intakePrefill:{email:"customer@example.com",name:"Fixture customer"},discoveryProposal:null});}
 if(u.pathname==="/api/admin/impersonate/status")return json({active:false});
 return route.fulfill({status:500,json:{error:"Unexpected fixture request "+method+" "+u.pathname}});
});
const host="https://atgconsulting.io";
try {
 await page.clock.install();
 await page.goto(host+"/admin/discovery?intake=intake-a");await page.getByRole("button",{name:"Generate report",exact:true}).click();
 await page.getByRole("alert").getByText(/Report provider unavailable/).waitFor();assert.equal(await page.getByRole("progressbar").count(),0);assert.equal(await page.getByRole("button",{name:"Generate report",exact:true}).isEnabled(),true);
 await page.getByRole("button",{name:"Generate report",exact:true}).click();await page.getByRole("progressbar",{name:"Generating report",exact:true}).waitFor();
 assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuenow"),null,"Do not invent a percentage");
 await page.getByText(/Keep this page open until the saved draft appears/).waitFor();await page.clock.fastForward(46_000);await page.getByText(/Still waiting for the server/).waitFor();
 assert.equal(await page.evaluate(()=>{const e=new Event("beforeunload",{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}),true);
 assert.equal(reportCalls,2,"Retry only follows the visible failure, not a second click while busy");
 await page.screenshot({path:path.join(out,"report-progress.png"),fullPage:false});
 assert.ok(reportRoute);await reportRoute.fulfill({json:{ok:true,report}});await page.getByRole("status").getByText(/Report draft saved/).waitFor();await page.getByText(report.summary,{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>{const e=new Event("beforeunload",{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}),false);
 await page.getByRole("button",{name:"Generate proposal",exact:true}).click();await page.getByRole("alert").getByText(/Proposal could not save/).waitFor();assert.equal(await page.getByRole("progressbar").count(),0);
 await page.getByRole("button",{name:"Generate proposal",exact:true}).click();await page.getByRole("progressbar",{name:"Generating proposal",exact:true}).waitFor();assert.ok(proposalRoute);await proposalRoute.fulfill({json:{ok:true,proposal}});await page.getByRole("status").getByText(/Proposal draft saved/).waitFor();
 await page.goto(host+"/admin/clients/client-a");await page.getByRole("combobox",{name:"Client tier",exact:true}).selectOption("GUIDED");await page.waitForFunction(()=>document.querySelector('[aria-label="Client status"]')?.value==="ACTIVE");
 await page.getByRole("button",{name:"Link matching submitted assessments",exact:true}).click();await page.getByRole("status").getByText(/1 submitted assessment/).waitFor();await page.getByRole("link",{name:/Fixture customer.*reviewed|Fixture customer.*new/}).waitFor();assert.equal(client.unlinkedAssessmentCount,0);
 role="CLIENT";portalMode="legacy";await page.goto(host+"/app");await page.getByRole("heading",{name:"Client dashboard reached",exact:true}).waitFor();
 portalMode="error";await page.goto(host+"/app");await page.getByRole("heading",{name:"We could not check your saved assessment",exact:true}).waitFor();assert.equal(await page.getByText("One quick step first",{exact:true}).count(),0);
 portalMode="legacy";await page.getByRole("button",{name:"Check my account again",exact:true}).click();await page.getByRole("heading",{name:"Client dashboard reached",exact:true}).waitFor();
 portalMode="none";await page.goto(host+"/app");await page.getByRole("heading",{name:"One quick step first",exact:true}).waitFor();portalMode="legacy";await page.getByRole("button",{name:"Check for my saved assessment",exact:true}).click();await page.getByRole("heading",{name:"Client dashboard reached",exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log("PASS: report/proposal spinner, elapsed wait guidance, navigation warning, visible failure/retry, saved confirmations, real status response, assessment-history repair, legacy dashboard access and failed account-check recovery. All HTTP intercepted; no production writes.");
}finally{await browser.close();}
