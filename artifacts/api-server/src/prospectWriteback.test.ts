import test from "node:test";
import assert from "node:assert/strict";
import { approveSheetUpdate, verifyProposedChange, ProspectWriteConflict, type ReviewWrite } from "./lib/prospectWriteback";
import { SHEET_HEADERS, parseProspectSheet } from "./lib/prospectSheet";

const sheetId="testSpreadsheetIdentifier123";
function row(){
 const r=new Array(24).fill("");
 r[0]="ABC Plumbing";r[2]="abcplumbing.example";r[8]="owner@abcplumbing.example";
 r[19]="Ready";r[21]="";r[22]="";r[23]="";
 return r;
}
const pipelineReader=async()=>parseProspectSheet({values:[SHEET_HEADERS,row()]},"testSpreadsheetIdentifier123");
const update:ReviewWrite={
 rowNumber:2,expectedBusiness:"ABC Plumbing",expectedDomain:"abcplumbing.example",
 expectedEmail:"owner@abcplumbing.example",expectedStage:"Ready",
 expectedLastContacted:"",expectedFollowUp:"",nextStage:"Contacted",
 lastContacted:"2026-11-18",nextFollowUp:"2026-11-25",confirmed:true,
};
test("approved change checks exact identity, stage, suppression and date",()=>{
 assert.doesNotThrow(()=>verifyProposedChange(row(),update));
 const changed=row();changed[19]="Replied";
 assert.throws(()=>verifyProposedChange(changed,update),ProspectWriteConflict);
 const suppressed=row();suppressed[23]="Yes";
 assert.throws(()=>verifyProposedChange(suppressed,update),/Do not contact/);
 const duplicate=row();duplicate[8]="different@example.com";
 assert.throws(()=>verifyProposedChange(duplicate,update),/changed/);
 assert.throws(()=>verifyProposedChange(row(),{...update,lastContacted:"2026-02-30"}),/valid dates/);
 assert.throws(()=>verifyProposedChange(row(),{...update,nextStage:"Replied"}),/requires a Contacted/);
});
test("disabled write-back never contacts a provider",async()=>{
 let called=false;
 const client={proxy:async()=>{called=true;return new Response(null,{status:200});}};
 await assert.rejects(()=>approveSheetUpdate(update,{client,sheetId,allowWrites:false}),/disabled/);
 assert.equal(called,false);
});
test("approved write touches only T, V, W and verifies live headers and row",async()=>{
 const calls:Array<{path:string;options?:{method?:string;body?:string}}> = [];
 const client={proxy:async (_name:string,path:string,options?:{method?:string;body?:string})=>{
   calls.push({path,options});
   const value=path.includes("batchUpdate")?{totalUpdatedCells:3}
     :path.includes("A1%3AZ1")?{values:[SHEET_HEADERS]}
     :{values:[row()]};
   return new Response(JSON.stringify(value),{status:200});
 }};
 const result=await approveSheetUpdate(update,{client,sheetId,allowWrites:true,pipelineReader});
 assert.equal(result.stage,"Contacted");
 assert.equal(calls.length,3);
 assert.equal(calls[2]?.options?.method,"POST");
 const request=JSON.parse(calls[2]?.options?.body??"{}");
 assert.equal(request.valueInputOption,"RAW");
 assert.deepEqual(request.data.map((d:{range:string})=>d.range),["'Prospects'!T2","'Prospects'!V2","'Prospects'!W2"]);
 assert.ok(calls.filter(c=>c.options?.method==="POST").length===1);
});
test("changed row aborts before any write",async()=>{
 let writes=0;
 const changed=row();changed[23]="Yes";
 const client={proxy:async (_name:string,path:string,options?:{method?:string})=>{
   if(options?.method==="POST")writes++;
   const data=path.includes("A1%3AZ1")?{values:[SHEET_HEADERS]}:{values:[changed]};
   return new Response(JSON.stringify(data),{status:200});
 }};
 await assert.rejects(()=>approveSheetUpdate(update,{client,sheetId,allowWrites:true}),/Do not contact/);
 assert.equal(writes,0);
});

test("duplicate business identity is rejected before any Sheet POST",async()=>{
 let writes=0;
 const dup=row();dup[0]="Other Listing";
 const client={proxy:async (_name:string,path:string,options?:{method?:string})=>{
   if(options?.method==="POST")writes++;
   return new Response(JSON.stringify(path.includes("A1%3AZ1")?{values:[SHEET_HEADERS]}:{values:[row()]}),{status:200});
 }};
 const duplicates=async()=>parseProspectSheet({values:[SHEET_HEADERS,row(),dup]},"testSpreadsheetIdentifier123");
 await assert.rejects(()=>approveSheetUpdate(update,{client,sheetId,allowWrites:true,pipelineReader:duplicates}),/Duplicate domain/);
 assert.equal(writes,0);
});
