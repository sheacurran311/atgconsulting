import test from "node:test";
import assert from "node:assert/strict";
import {approvedProposalDocText,createATGProposalDoc} from "./lib/proposalDocs";

const id="1AbCdEfGhIjKlMnOpQrStUvWxYz12345";
const source={
 execSummary:"Approved executive summary",
 understanding:"Approved customer needs",
 scope:"Draft-only follow-up workflow",
 howWeConnect:"Customer-owned platform",
 milestones:JSON.stringify([{label:"Pilot",description:"Approve sample workflow"}]),
 investment:JSON.stringify({tier:"GUIDED",price:"$997",care:"Not purchased"}),
 acceptanceClause:"Approved acceptance clause",
 reviewSummary:"PRIVATE reviewer information that must never be exported",
};
function fakeClient(owner="shea@atgconsulting.io"){
 const calls:Array<{service:string;path:string;method:string;body:string}>=[];
 const proxy=async(service:string,path:string,opts?:{method?:string;body?:string})=>{
  calls.push({service,path,method:opts?.method??"GET",body:opts?.body??""});
  let data:unknown={};
  if(path.includes("/about?"))data={user:{emailAddress:owner}};
  else if(service==="google-docs"&&path==="/v1/documents")data={documentId:id};
  else if(path.includes("owners(emailAddress)"))data={owners:[{emailAddress:owner}]};
  else if(path.includes("?fields=id,parents"))data={parents:["root12345678901234567890"]};
  return new Response(JSON.stringify(data),{status:200});
 };
 return {calls,proxy};
}
test("document export includes only approved client-facing scope, not internal reviewer notes",()=>{
 const text=approvedProposalDocText(source,"ABC Plumbing");
 assert.match(text,/Approved executive summary/);
 assert.match(text,/Draft-only follow-up workflow/);
 assert.match(text,/Approve sample workflow/);
 assert.doesNotMatch(text,/PRIVATE reviewer information/);
});
test("Docs export checks ATG owner, persists document ID and inserts a single text request",async()=>{
 const client=fakeClient();
 let storedId="";
 const result=await createATGProposalDoc({
  client,proposal:source,company:"ABC Plumbing",account:"shea@atgconsulting.io",
  onCreated:async value=>{storedId=value;},
 });
 assert.equal(storedId,id);
 assert.equal(result.docId,id);
 assert.match(result.url,/docs.google.com\/document\/d\//);
 assert.deepEqual(client.calls.map(c=>c.method),["GET","POST","GET","POST"]);
 assert.deepEqual(client.calls.map(c=>c.service),["google-drive","google-docs","google-drive","google-docs"]);
 const write=JSON.parse(client.calls[3]!.body);
 assert.equal(write.requests.length,1);
 assert.doesNotMatch(write.requests[0].insertText.text,/PRIVATE reviewer information/);
 assert.ok(client.calls.every(c=>!c.path.includes("permissions")&&!c.path.includes("send")));
});
test("wrong Google account refuses Docs creation before any writes",async()=>{
 const client=fakeClient("another@example.com");
 let created=false;
 await assert.rejects(()=>createATGProposalDoc({
  client,proposal:source,company:"ABC",onCreated:async()=>{created=true;},
 }),/does not match/);
 assert.equal(created,false);
 assert.equal(client.calls.length,1);
});
test("invalid folder configuration blocks document creation before network requests",async()=>{
 const client=fakeClient();
 await assert.rejects(()=>createATGProposalDoc({
  client,proposal:source,company:"ABC",folderId:"bad",onCreated:async()=>{},
 }),/folder ID/);
 assert.equal(client.calls.length,0);
});
