import test from "node:test";
import assert from "node:assert/strict";
import { classifyThreads, eligibleContacts, reconcileGmail } from "./lib/prospectGmail";
import type { SheetProspect } from "./lib/prospectSheet";

const account="shea@atgconsulting.io";
const email="owner@smallbusiness.example";
function msg(from:string,to:string,at:number) {
  return {internalDate:String(at),payload:{headers:[{name:"From",value:from},{name:"To",value:to}]}};
}
function prospect(overrides:Partial<SheetProspect>={}):SheetProspect {
  return {rowNumber:2,businessName:"ABC HVAC",website:"",domain:"abc.example",category:"HVAC",city:"Denver",state:"CO",
    contactName:"Owner",contactEmail:email,emailStatus:"Published",observedSignal:"",suggestedService:"",
    priority:"",outreachStage:"Ready",owner:"",lastContacted:"",nextFollowUp:"",doNotContact:false,
    researchSegment:"",businessSourceUrl:"",contactSourceUrl:"",...overrides};
}
test("detects reply only when same thread has outbound earlier than matching inbound",()=>{
  const outbound=msg(account,email,1700000000000);
  const inbound=msg(email,account,1700000100000);
  const one=classifyThreads([{messages:[outbound,inbound]}],email,account);
  assert.equal(one.status,"reply_detected");
  assert.ok(one.lastInboundAt);
  const separate=classifyThreads([{messages:[outbound]},{messages:[inbound]}],email,account);
  assert.equal(separate.status,"outbound_found");
  assert.equal(classifyThreads([{messages:[inbound]}],email,account).status,"inbound_without_outbound");
});
test("does not match address substrings or unrelated thread participants",()=>{
  const result=classifyThreads([{messages:[
    msg(account,"notowner@smallbusiness.example",1700000000000),
    msg("notowner@smallbusiness.example",account,1700000100000),
  ]}],email,account);
  assert.equal(result.status,"no_recent_match");
});
test("suppressed rows and duplicate contact emails are excluded",()=>{
  const rows=[prospect(),prospect({rowNumber:3,doNotContact:true,contactEmail:"skip@another.example"}),
    prospect({rowNumber:4,contactEmail:" OWNER@smallbusiness.example "}),
    prospect({rowNumber:5,contactEmail:"other@another.example"})];
  const e=eligibleContacts(rows);
  assert.equal(e.eligible.length,1);
  assert.equal(e.eligible[0]?.rowNumber,5);
  assert.equal(e.skippedSuppressed,1);
  assert.equal(e.skippedAmbiguous,2);
});
test("refuses a wrong mailbox before reading the prospecting Sheet",async()=>{
  let sheetRead=false;
  const client={proxy:async()=>new Response(JSON.stringify({emailAddress:"personal@other.example"}),{status:200})};
  await assert.rejects(()=>reconcileGmail({client,pipelineReader:async()=>{sheetRead=true;throw new Error("should not run");}}),/does not match/);
  assert.equal(sheetRead,false);
});
test("reconciliation fetches Gmail thread metadata only, never bodies or writes",async()=>{
  const requested:string[]=[];
  const client={proxy:async (name:string,path:string)=>{
    assert.equal(name,"google-mail");requested.push(path);
    const value=path.includes("/profile")?{emailAddress:account}
      :path.includes("/threads?")?{threads:[{id:"thread123"}]}
      :{messages:[msg(account,email,1700000000000),msg(email,account,1700000100000)]};
    return new Response(JSON.stringify(value),{status:200});
  }};
  const result=await reconcileGmail({
    client,expectedAccount:account,
    pipelineReader:async()=>({spreadsheetId:"x",url:"",prospectCount:1,rows:[prospect()],
      byStage:{Ready:1},suppressedCount:0,followUpsDue:0,dataTruncated:false}),
  });
  assert.equal(result.summary.replyDetected,1);
  assert.equal(result.checked,1);
  assert.ok(requested.every(p=>p.startsWith("/gmail/v1/users/me/")));
  assert.ok(requested.every(p=>!/send|modify|draft|batch|format=full/i.test(p)));
  assert.ok(requested.some(p=>p.includes("format=metadata")));
});
