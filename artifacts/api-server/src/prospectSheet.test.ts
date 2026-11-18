import test from "node:test";
import assert from "node:assert/strict";
import { parseProspectSheet, readProspectPipeline, SHEET_HEADERS } from "./lib/prospectSheet";

function sample(overrides:Record<number,string>={}) {
  const row=new Array(26).fill("");
  row[0]="Denver Mechanical";row[1]="https://denvermechanical.example";row[2]="denvermechanical.example";
  row[3]="HVAC";row[4]="Denver";row[5]="CO";row[8]="team@denvermechanical.example";
  row[16]="Public request form lacks scheduling";row[17]="Lead routing";row[19]="Ready";
  for(const [index,value] of Object.entries(overrides))row[Number(index)]=value;
  return row;
}
test("preserves the actual 26-column ATG prospecting schema and counts follow-ups",()=>{
  const result=parseProspectSheet({values:[SHEET_HEADERS, sample({22:"2026-11-17"}),sample({0:"Suppressed Business",23:"Yes",22:"2026-11-17"})]},"validID",new Date("2026-11-18T12:00:00Z"));
  assert.equal(result.prospectCount,2);
  assert.equal(result.followUpsDue,1);
  assert.equal(result.suppressedCount,1);
  assert.equal(result.byStage.Ready,2);
  assert.equal(result.rows[0]?.rowNumber,2);
});
test("fails closed on unexpected order or missing headers",()=>{
  const headers=[...SHEET_HEADERS];[headers[0],headers[1]]=[headers[1]!,headers[0]!];
  assert.throws(()=>parseProspectSheet({values:[headers,sample()]},"validID"),/headers changed/);
});
test("rejects unsafe website URLs and leaves source data unchanged",()=>{
  const row=sample({1:"javascript:alert(1)",13:"file:///etc/passwd"});
  const result=parseProspectSheet({values:[SHEET_HEADERS,row]},"validID");
  assert.equal(result.rows[0]?.website,"");
  assert.equal(result.rows[0]?.businessSourceUrl,"");
  assert.equal(row[1],"javascript:alert(1)");
});
test("reads via Replit Sheets connector without writing",async()=>{
  let name="",path="";
  const client={
    proxy:async (n:string,p:string)=>{name=n;path=p;return new Response(JSON.stringify({values:[SHEET_HEADERS,sample()]}),{status:200,headers:{"Content-Type":"application/json"}});},
  };
  const result=await readProspectPipeline({sheetId:"testSpreadsheetIdentifier123",client,now:new Date("2026-11-18T12:00:00Z")});
  assert.equal(name,"google-sheet");
  assert.match(path,/\/v4\/spreadsheets\/testSpreadsheetIdentifier123\/values\//);
  assert.ok(!/append|batchUpdate|:send/.test(path));
  assert.equal(result.prospectCount,1);
});
test("does not include provider error response bodies",async()=>{
  await assert.rejects(readProspectPipeline({sheetId:"testSpreadsheetIdentifier123",client:{
    proxy:async()=>new Response(JSON.stringify({token:"secret"}),{status:403}),
  }}),/lacks access/);
});
