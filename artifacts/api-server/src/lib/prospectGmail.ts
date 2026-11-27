/**
 * Read-only Gmail reconciliation for ATG's existing Sheets prospect ledger.
 * Explicit admin request only. No email bodies, messages, draft/send, sheet writes,
 * background jobs, or persisted mailbox data.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { readProspectPipeline, type SheetProspect } from "./prospectSheet";

export const MAX_CONTACTS=12;
const THREADS_PER_PAGE = 10;
const MAX_THREAD_PAGES = 3;
const EMAIL=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const VALID_ID=/^[A-Za-z0-9_-]{1,160}$/;
type ConnectorClient=Pick<ReplitConnectors,"proxy">;
type Header={name?:unknown;value?:unknown};
type Message={labelIds?:unknown;internalDate?:unknown;payload?:{headers?:Header[]}};
type GmailThread={id?:unknown;messages?:Message[]};
type GmailList={threads?:Array<{id?:unknown}>;nextPageToken?:unknown};
type GmailProfile={emailAddress?:unknown};
export type GmailMatch = {
  rowNumber:number;businessName:string;contactEmail:string;
  status:"reply_detected"|"outbound_found"|"inbound_without_outbound"|"no_recent_match"|"incomplete"|"error";
  lastOutboundAt:string|null;lastInboundAt:string|null;threadCount:number;
  suggestedAction:"review_reply"|"verify_outreach"|"inspect_inbound"|"hold_follow_up"|"none";
};
export type GmailReconciliation={
  account:string;checked:number;eligibleCount:number;limited:boolean;offset:number;nextOffset:number|null;skippedSuppressed:number;
  skippedAmbiguous:number;matches:GmailMatch[];
  summary:{replyDetected:number;outboundFound:number;inboundWithoutOutbound:number;noRecentMatch:number;errors:number};
};

function normalEmail(s:string):string {
  const raw=s.trim().toLowerCase();
  return EMAIL.test(raw)&&raw.length<=254?raw:"";
}
function headerValues(m:Message,name:string):string[]{
  const headers=m.payload?.headers;
  if(!Array.isArray(headers))return [];
  return headers.filter(h=>typeof h.name==="string"&&h.name.toLowerCase()===name)
    .map(h=>typeof h.value==="string"?h.value:"");
}
function hasAddress(value:string,email:string):boolean {
  // Strict token-boundary match, not substring match (foo@ vs notfoo@).
  const tokens: string[] = value.toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/g)??[];
  return tokens.includes(email);
}
function messageTime(m:Message):number|null {
  const n=Number(m.internalDate);
  return Number.isSafeInteger(n)&&n>0&&n<8.64e15?n:null;
}
export function classifyThreads(
 threads:GmailThread[], prospectEmail:string, accountEmail:string, requireSentLabel=false, since=0
):Pick<GmailMatch,"status"|"lastOutboundAt"|"lastInboundAt"|"threadCount"> {
  let newestOutbound=0,newestInbound=0,reply=false;
  for(const thread of threads){
    const messages=Array.isArray(thread.messages)?thread.messages:[];
    let firstOutbound=0;
    for(const m of messages){
      const at=messageTime(m);
      if(at===null || at<since)continue;
      const from=headerValues(m,"from").some(v=>hasAddress(v,accountEmail));
      const toProspect=headerValues(m,"to").some(v=>hasAddress(v,prospectEmail));
      if(from&&toProspect&&(!requireSentLabel || (Array.isArray(m.labelIds) && m.labelIds.includes("SENT") && !m.labelIds.includes("DRAFT")))){
        firstOutbound=firstOutbound===0?at:Math.min(firstOutbound,at);
        newestOutbound=Math.max(newestOutbound,at);
      }
    }
    for(const m of messages){
      const at=messageTime(m);
      if(at===null || at<since)continue;
      const fromProspect=headerValues(m,"from").some(v=>hasAddress(v,prospectEmail));
      const toAccount=headerValues(m,"to").some(v=>hasAddress(v,accountEmail));
      if(fromProspect&&toAccount){
        newestInbound=Math.max(newestInbound,at);
        if(firstOutbound!==0&&at>firstOutbound)reply=true;
      }
    }
  }
  const status:GmailMatch["status"]=reply?"reply_detected"
    :newestOutbound?"outbound_found"
    :newestInbound?"inbound_without_outbound":"no_recent_match";
  return {status,lastOutboundAt:newestOutbound?new Date(newestOutbound).toISOString():null,
    lastInboundAt:newestInbound?new Date(newestInbound).toISOString():null,threadCount:threads.length};
}
async function getJson(client:ConnectorClient,path:string):Promise<unknown>{
  const response=await client.proxy("google-mail",path);
  if(!response.ok){
    if(response.status===401||response.status===403)throw new Error("Gmail authorization denied. Verify Replit project connector access.");
    throw new Error(`Gmail read-only request failed (HTTP ${response.status}).`);
  }
  return response.json();
}
async function reviewContact(client:ConnectorClient,row:Pick<SheetProspect,"rowNumber"|"businessName"|"contactEmail">,account:string,since=0):Promise<GmailMatch>{
  const email=normalEmail(row.contactEmail);
  const base={rowNumber:row.rowNumber,businessName:row.businessName,contactEmail:email};
  try{
    // Search both sides in one Gmail query. Gmail returns existing threads without exposing bodies.
    const q=`{from:${email} to:${email}}`;
    const ids = new Set<string>();
    const tokens = new Set<string>();
    let pageToken: string | undefined;
    for (let page = 0; page < MAX_THREAD_PAGES; page++) {
      const params = new URLSearchParams({maxResults: String(THREADS_PER_PAGE), q});
      if (pageToken) params.set("pageToken", pageToken);
      const search = await getJson(client, "/gmail/v1/users/me/threads?" + params) as GmailList;
      if (!search || (search.threads !== undefined && !Array.isArray(search.threads)) ||
          (search.threads?.length ?? 0) > THREADS_PER_PAGE) throw new Error("Invalid Gmail page.");
      for (const item of search.threads ?? []) {
        if (typeof item?.id !== "string" || !VALID_ID.test(item.id)) throw new Error("Invalid Gmail thread ID.");
        ids.add(item.id);
      }
      const next = search.nextPageToken;
      if (!next) {pageToken = undefined; break;}
      if (typeof next !== "string" || next.length > 1024 || tokens.has(next)) throw new Error("Invalid Gmail page token.");
      tokens.add(next);
      pageToken = next;
    }
    if (pageToken) return {...base, status: "incomplete", lastOutboundAt: null, lastInboundAt: null,
      threadCount: ids.size, suggestedAction: "hold_follow_up"};
    const threads:GmailThread[]=[];
    for(const id of ids){
      const result=await getJson(client,`/gmail/v1/users/me/threads/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=To`);
      if (!result || typeof result !== "object" || !Array.isArray((result as GmailThread).messages)) throw new Error("Missing Gmail metadata.");
      threads.push(result as GmailThread);
    }
    const result=classifyThreads(threads,email,account,true,since);
    const suggestedAction:GmailMatch["suggestedAction"]=result.status==="reply_detected"?"review_reply"
      :result.status==="outbound_found"?"verify_outreach"
      :result.status==="inbound_without_outbound"?"inspect_inbound":"none";
    return {...base,...result,suggestedAction};
  }catch{
    // No provider error payloads or email content exposed.
    return {...base,status:"error",lastOutboundAt:null,lastInboundAt:null,threadCount:0,suggestedAction:"hold_follow_up"};
  }
}
export function eligibleContacts(rows:SheetProspect[]){
  const counts=new Map<string,number>();
  for(const row of rows){
    const email=normalEmail(row.contactEmail);
    if(email)counts.set(email,(counts.get(email)??0)+1);
  }
  const eligible=rows.filter(r=>!r.doNotContact&&!!normalEmail(r.contactEmail)&&counts.get(normalEmail(r.contactEmail))===1);
  const skippedSuppressed=rows.filter(r=>r.doNotContact).length;
  const skippedAmbiguous=rows.filter(r=>!r.doNotContact&&!!normalEmail(r.contactEmail)&&counts.get(normalEmail(r.contactEmail))!==1).length;
  return {eligible,skippedSuppressed,skippedAmbiguous};
}
export async function verifyProspectMail(contactEmail: string, businessName: string, since: Date, client: ConnectorClient = new ReplitConnectors()) {
  const profile = await getJson(client, "/gmail/v1/users/me/profile") as GmailProfile;
  const account = normalEmail(typeof profile?.emailAddress === "string" ? profile.emailAddress : "");
  if (account !== "shea@atgconsulting.io" || !normalEmail(contactEmail)) throw new Error("Verify the approved ATG mailbox and contact.");
  const match = await reviewContact(client, {rowNumber: 0, businessName, contactEmail}, account, since.getTime());
  if (!match.lastOutboundAt || new Date(match.lastOutboundAt) < since) return null;
  return match;
}

export async function reconcileGmail(opts:{
 client?:ConnectorClient;pipelineReader?:typeof readProspectPipeline;expectedAccount?:string;offset?:number;
}={}):Promise<GmailReconciliation>{
  const offset=opts.offset??0;
  if(!Number.isSafeInteger(offset)||offset<0||offset>500)throw new Error("Invalid Gmail reconciliation offset.");
  const client=opts.client??new ReplitConnectors();
  const profile=await getJson(client,"/gmail/v1/users/me/profile") as GmailProfile;
  const account=normalEmail(typeof profile?.emailAddress==="string"?profile.emailAddress:"");
  const expected=normalEmail(opts.expectedAccount??process.env.ATG_GMAIL_ACCOUNT??"shea@atgconsulting.io");
  if(!account||!expected||account!==expected)
    throw new Error("Connected Gmail account does not match the configured ATG mailbox. Reconciliation stopped.");
  const pipeline=await (opts.pipelineReader??readProspectPipeline)();
  const {eligible,skippedSuppressed,skippedAmbiguous}=eligibleContacts(pipeline.rows);
  const candidates=eligible.slice(offset,offset+MAX_CONTACTS);
  const matches:GmailMatch[]=[];
  // Sequential calls keep rate limits and mailbox exposure bounded.
  for(const row of candidates)matches.push(await reviewContact(client,row,account));
  return {
    account,checked:matches.length,eligibleCount:eligible.length,offset,
    nextOffset:offset+matches.length<eligible.length?offset+matches.length:null,
    limited:offset+MAX_CONTACTS<eligible.length||pipeline.dataTruncated||matches.some(row=>row.status==="incomplete"||row.status==="error"),skippedSuppressed,skippedAmbiguous,
    matches,summary:{
      replyDetected:matches.filter(m=>m.status==="reply_detected").length,
      outboundFound:matches.filter(m=>m.status==="outbound_found").length,
      inboundWithoutOutbound:matches.filter(m=>m.status==="inbound_without_outbound").length,
      noRecentMatch:matches.filter(m=>m.status==="no_recent_match").length,
      errors:matches.filter(m=>m.status==="error"||m.status==="incomplete").length,
    },
  };
}
