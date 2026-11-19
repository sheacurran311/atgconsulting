/** Upcoming ATG consultation visibility from Replit's native Google Calendar connector. */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { readProspectPipeline, type SheetProspect } from "./prospectSheet";

type Client=Pick<ReplitConnectors,"proxy">;
type CalendarEvent={
  id?:unknown;status?:unknown;start?:{dateTime?:unknown};end?:{dateTime?:unknown};
  attendees?:Array<{email?:unknown;responseStatus?:unknown}>;summary?:unknown;htmlLink?:unknown;
};
export type ProspectMeeting={
  rowNumber:number;businessName:string;contactEmail:string;startsAt:string;endsAt:string;
  responseStatus:string;calendarUrl:string;
};
export type MeetingOverview={
  meetingCount:number;rangeStart:string;rangeEnd:string;limited:boolean;eventsConsidered:number;
  matches:ProspectMeeting[];
};
const email=(s:string)=>s.trim().toLowerCase();
function dateTime(s:unknown):string|null{
  if(typeof s!=="string")return null;
  const n=Date.parse(s);
  return Number.isFinite(n)?new Date(n).toISOString():null;
}
export function matchProspectMeetings(events:CalendarEvent[],rows:SheetProspect[],start:Date,end:Date):MeetingOverview{
  const emails=new Map<string,SheetProspect[]>();
  for(const r of rows){
    // Include suppressed rows in duplicate detection, but never surface them as meetings.
    if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(r.contactEmail.trim()))continue;
    const key=email(r.contactEmail);
    emails.set(key,[...(emails.get(key)??[]),r]);
  }
  const matches:ProspectMeeting[]=[];
  for(const event of events){
    if(event.status==="cancelled"||!Array.isArray(event.attendees))continue;
    const begins=dateTime(event.start?.dateTime);
    const ends=dateTime(event.end?.dateTime);
    if(!begins||!ends||Date.parse(begins)<start.valueOf()||Date.parse(begins)>end.valueOf())continue;
    for(const attendee of event.attendees){
      if(typeof attendee.email!=="string")continue;
      const key=email(attendee.email);
      const prospects=emails.get(key)??[];
      if(prospects.length!==1||prospects[0]?.doNotContact)continue;
      const p=prospects[0]!;
      const link=typeof event.htmlLink==="string"&&/^https:\/\/calendar\.google\.com\//.test(event.htmlLink)?event.htmlLink:"";
      matches.push({rowNumber:p.rowNumber,businessName:p.businessName,contactEmail:key,
        startsAt:begins,endsAt:ends,responseStatus:typeof attendee.responseStatus==="string"?attendee.responseStatus:"unknown",
        calendarUrl:link});
    }
  }
  matches.sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
  return {meetingCount:matches.length,rangeStart:start.toISOString(),rangeEnd:end.toISOString(),
    limited:events.length>=100,eventsConsidered:events.length,matches};
}
export async function readUpcomingProspectMeetings(opts:{
 client?:Client;pipelineReader?:typeof readProspectPipeline;now?:Date;
}={}):Promise<MeetingOverview>{
  const now=opts.now??new Date();
  const end=new Date(now.valueOf()+60*24*60*60*1000);
  const client=opts.client??new ReplitConnectors();
  const params=new URLSearchParams({timeMin:now.toISOString(),timeMax:end.toISOString(),
    maxResults:"100",singleEvents:"true",orderBy:"startTime",fields:"items(id,status,start(dateTime),end(dateTime),attendees(email,responseStatus),htmlLink),nextPageToken"});
  const response=await client.proxy("google-calendar",`/calendar/v3/calendars/primary/events?${params}`);
  if(!response.ok)throw new Error(`Calendar read failed (HTTP ${response.status}).`);
  const result:unknown=await response.json();
  const data=result&&typeof result==="object"?result as {items?:unknown;nextPageToken?:unknown}:{};
  if(!Array.isArray(data.items))throw new Error("Unexpected Calendar response.");
  const pipeline=await (opts.pipelineReader??readProspectPipeline)();
  const output=matchProspectMeetings(data.items as CalendarEvent[],pipeline.rows,now,end);
  return {...output,limited:output.limited||!!data.nextPageToken||pipeline.dataTruncated};
}
