import test from "node:test";
import assert from "node:assert/strict";
import { matchProspectMeetings, readUpcomingProspectMeetings } from "./lib/prospectCalendar";
import type { SheetProspect } from "./lib/prospectSheet";
function prospect(overrides:Partial<SheetProspect>={}):SheetProspect {
 return {rowNumber:2,businessName:"ABC Plumbing",website:"",domain:"abcplumbing.example",
 category:"Plumbing",city:"Denver",state:"CO",contactName:"Owner",
 contactEmail:"owner@abcplumbing.example",emailStatus:"Published",observedSignal:"",
 suggestedService:"",priority:"",outreachStage:"Contacted",owner:"",lastContacted:"",
 nextFollowUp:"",doNotContact:false,researchSegment:"",businessSourceUrl:"",contactSourceUrl:"",...overrides};
}
const now=new Date("2026-11-18T17:00:00Z"),end=new Date("2027-01-17T17:00:00Z");
const meet={status:"confirmed",start:{dateTime:"2026-11-23T17:00:00Z"},
 end:{dateTime:"2026-11-23T17:20:00Z"},
 attendees:[{email:"OWNER@ABCPLUMBING.EXAMPLE",responseStatus:"accepted"}],
 htmlLink:"https://calendar.google.com/calendar/event?eid=test"};
test("matches only prospect attendees, never unrelated event content",()=>{
 const data=matchProspectMeetings([meet,{...meet,attendees:[{email:"other@example.com"}]},
  {...meet,status:"cancelled"}],[prospect()],now,end);
 assert.equal(data.meetingCount,1);
 assert.equal(data.matches[0]?.businessName,"ABC Plumbing");
 assert.equal(data.matches[0]?.responseStatus,"accepted");
 assert.equal("summary" in data.matches[0]!,false);
});
test("ignores suppressed and duplicate-email prospects",()=>{
 const data=matchProspectMeetings([meet],[
  prospect({rowNumber:2}),prospect({rowNumber:3,contactEmail:"OWNER@ABCPLUMBING.EXAMPLE"}),
 ],now,end);
 assert.equal(data.meetingCount,0);
 const suppressed=matchProspectMeetings([meet],[prospect({doNotContact:true})],now,end);
 assert.equal(suppressed.meetingCount,0);
});
test("calendar integration requests read-only bounded events and filters after Sheet match",async()=>{
 const calls:string[]=[];
 const client={proxy:async (name:string,path:string)=>{
  assert.equal(name,"google-calendar");calls.push(path);
  return new Response(JSON.stringify({items:[meet],nextPageToken:"next"}),{status:200});
 }};
 const result=await readUpcomingProspectMeetings({client,now,
  pipelineReader:async()=>({spreadsheetId:"x",url:"",prospectCount:1,rows:[prospect()],
   byStage:{Contacted:1},suppressedCount:0,followUpsDue:0,dataTruncated:false}),
 });
 assert.equal(result.meetingCount,1);
 assert.equal(result.limited,true);
 assert.equal(calls.length,1);
 assert.match(calls[0]!,/singleEvents=true/);
 assert.match(calls[0]!,/maxResults=100/);
 assert.doesNotMatch(calls[0]!,/send|insert|update/);
});
