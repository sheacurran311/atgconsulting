import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { adminJson } from "@/lib/adminWork";

type Status = "NEW"|"RESEARCHED"|"QUALIFIED"|"DISQUALIFIED"|"DRAFT_READY"|"APPROVED"|"CONTACTED"|"REPLIED"|"BOOKED"|"WON"|"LOST"|"SUPPRESSED";
interface Prospect {
  id: string; businessName: string; website: string; domain: string; industry: string; updatedAt: string;
  notes: string; status: Status; score: number | null; outreachDraft: string;
  review?: Review | null;
}
interface Review { industryFit:number; sizeFit:number; observableNeed:number; contactConfidence:number; urgency:number; suppressed:boolean; evidence: Array<{claim:string;sourceUrl:string;observedAt:string;verified:boolean}> }
interface SheetProspect {
  rowNumber:number; businessName:string; website:string; domain:string; category:string; city:string; state:string;
  contactName:string; contactEmail:string; emailStatus:string; observedSignal:string; suggestedService:string;
  priority:string; outreachStage:string; owner:string; lastContacted:string; nextFollowUp:string;
  doNotContact:boolean; researchSegment:string; businessSourceUrl:string; contactSourceUrl:string;
}
interface SheetPipeline {
  url:string; prospectCount:number; rows:SheetProspect[]; byStage:Record<string,number>;
  suppressedCount:number; followUpsDue:number; dataTruncated:boolean;
}
interface GmailMatch {
  rowNumber:number;businessName:string;contactEmail:string;
  status:"reply_detected"|"outbound_found"|"inbound_without_outbound"|"no_recent_match"|"error";
  lastOutboundAt:string|null;lastInboundAt:string|null;threadCount:number;
  suggestedAction:"review_reply"|"verify_outreach"|"inspect_inbound"|"none";
}
interface GmailReconciliation {
  account:string;checked:number;eligibleCount:number;limited:boolean;offset:number;nextOffset:number|null;
  skippedSuppressed:number;skippedAmbiguous:number;matches:GmailMatch[];
  summary:{replyDetected:number;outboundFound:number;inboundWithoutOutbound:number;noRecentMatch:number;errors:number};
}
interface ProspectMeeting {
  rowNumber:number;businessName:string;contactEmail:string;startsAt:string;endsAt:string;
  responseStatus:string;calendarUrl:string;
}
interface MeetingOverview {
  meetingCount:number;rangeStart:string;rangeEnd:string;limited:boolean;eventsConsidered:number;
  matches:ProspectMeeting[];
}
const emptyReview:Review={industryFit:0,sizeFit:0,observableNeed:0,contactConfidence:0,urgency:0,suppressed:false,evidence:[]};
const transitions: Record<Status, Status[]> = {
  NEW:["RESEARCHED","DISQUALIFIED","SUPPRESSED"],
  RESEARCHED:["QUALIFIED","DISQUALIFIED","SUPPRESSED"],
  QUALIFIED:["DRAFT_READY","DISQUALIFIED","SUPPRESSED"],
  DISQUALIFIED:["RESEARCHED","SUPPRESSED"],
  DRAFT_READY:["APPROVED","QUALIFIED","SUPPRESSED"],
  APPROVED:["CONTACTED","DRAFT_READY","SUPPRESSED"],
  CONTACTED:["REPLIED","LOST","SUPPRESSED"],
  REPLIED:["BOOKED","LOST","SUPPRESSED"],
  BOOKED:["WON","LOST","SUPPRESSED"],
  WON:["SUPPRESSED"], LOST:["RESEARCHED","SUPPRESSED"], SUPPRESSED:[],
};
export default function AdminProspectingPage() {
  const [rows,setRows]=useState<Prospect[]>([]);
  const [sheet,setSheet]=useState<SheetPipeline|null>(null);
  const [calendar,setCalendar]=useState<MeetingOverview|null>(null);
  const [calendarBusy,setCalendarBusy]=useState(false);
  const [calendarError,setCalendarError]=useState("");
  async function checkCalendar() {
    if(calendarBusy)return;
    setCalendarBusy(true);setCalendarError("");
    try { setCalendar(await adminJson<MeetingOverview>("/api/admin/prospecting/calendar-meetings")); }
    catch(e){setCalendarError(e instanceof Error?e.message:"Unable to read calendar.");}
    finally {setCalendarBusy(false);}
  }
  const [approvalRow,setApprovalRow]=useState<SheetProspect|null>(null);
  const [approvalStage,setApprovalStage]=useState<"Contacted"|"Replied">("Contacted");
  const [approvalDate,setApprovalDate]=useState(new Date().toISOString().slice(0,10));
  const [approvalFollowUp,setApprovalFollowUp]=useState("");
  const [approvalConfirmed,setApprovalConfirmed]=useState(false);
  const [approvalBusy,setApprovalBusy]=useState(false);
  const [approvalError,setApprovalError]=useState("");
  const [approvalMessage,setApprovalMessage]=useState("");
  async function approveSheetStage() {
    if(!approvalRow||!approvalConfirmed||approvalBusy)return;
    setApprovalBusy(true);setApprovalError("");setApprovalMessage("");
    const payload={
      rowNumber:approvalRow.rowNumber,expectedBusiness:approvalRow.businessName,
      expectedDomain:approvalRow.domain,expectedEmail:approvalRow.contactEmail,
      expectedStage:approvalRow.outreachStage,expectedLastContacted:approvalRow.lastContacted,
      expectedFollowUp:approvalRow.nextFollowUp,nextStage:approvalStage,
      lastContacted:approvalDate,nextFollowUp:approvalFollowUp,confirmed:true,
    };
    try {
      await adminJson("/api/admin/prospecting/google-sheet/approve",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),
      });
      setApprovalMessage("Google Sheet updated. Recheck the row before making another change.");
      setApprovalRow(null);setApprovalConfirmed(false);
      await loadSheet();
    }catch(e){setApprovalError(e instanceof Error?e.message:"Could not update the Google Sheet.");}
    finally {setApprovalBusy(false);}
  }

  const [gmail,setGmail]=useState<GmailReconciliation|null>(null);
  const [gmailBusy,setGmailBusy]=useState(false);
  const [gmailError,setGmailError]=useState("");
  async function checkGmail(offset=0) {
    if(gmailBusy)return;
    setGmailBusy(true);setGmailError("");setGmail(null);
    try { setGmail(await adminJson<GmailReconciliation>(`/api/admin/prospecting/gmail-reconciliation?offset=${offset}`)); }
    catch(e){setGmailError(e instanceof Error?e.message:"Unable to check Gmail.");}
    finally {setGmailBusy(false);}
  }

  const [sheetLoading,setSheetLoading]=useState(true);
  const [sheetError,setSheetError]=useState("");
  const [sheetFilter,setSheetFilter]=useState("");
  async function loadSheet() {
    setSheetLoading(true);setSheetError("");
    try { setSheet(await adminJson<SheetPipeline>("/api/admin/prospecting/google-sheet")); }
    catch(e) { setSheetError(e instanceof Error?e.message:"Unable to load the connected Google Sheet."); }
    finally { setSheetLoading(false); }
  }

  const [name,setName]=useState(""); const [website,setWebsite]=useState("");
  const [selected,setSelected]=useState<Prospect|null>(null);
  const [draft,setDraft]=useState(""); const [notes,setNotes]=useState("");
  const [review,setReview]=useState<Review>(emptyReview);
  const [claim,setClaim]=useState(""); const [sourceUrl,setSourceUrl]=useState("");
  const [evidenceVerified,setEvidenceVerified]=useState(false);
  const [error,setError]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function load() {
    try { setRows(await adminJson<Prospect[]>("/api/admin/prospecting")); }
    catch(e) { setError(e instanceof Error ? e.message : "Unable to load prospects."); }
  }
  useEffect(()=>{void load();},[]);
  useEffect(()=>{void loadSheet();},[]);
  async function add(e: React.FormEvent) {
    e.preventDefault(); if(busy) return; setBusy(true); setError(""); setMessage("");
    try {
      await adminJson("/api/admin/prospecting",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessName:name,website})});
      setName("");setWebsite("");setMessage("Prospect saved for research.");await load();
    } catch(e) {setError(e instanceof Error?e.message:"Could not add prospect.");}
    finally {setBusy(false);}
  }
  async function save(nextStatus?:Status) {
    if(!selected||busy)return;
    if(nextStatus==="APPROVED" && draft!==selected.outreachDraft) { setError("Save and review the latest outreach draft before approving it."); return; }
    setBusy(true);setError("");setMessage("");
    try {
      if ((claim.trim() || sourceUrl.trim()) && (!claim.trim() || !sourceUrl.trim() || !evidenceVerified)) {
        setError("Enter a complete observation and URL, then confirm you verified the source."); setBusy(false); return;
      }
      const evidence = evidenceVerified && claim.trim() && sourceUrl.trim() ? [{claim:claim.trim(),sourceUrl:sourceUrl.trim(),observedAt:new Date().toISOString(),verified:true}] : [];
      const payload:Record<string,unknown>={notes,expectedUpdatedAt:selected.updatedAt,review:{...review,evidence: evidence.length ? [...review.evidence,...evidence] : review.evidence}};
      if(selected.status!=="APPROVED"&&nextStatus!=="APPROVED")payload.outreachDraft=draft;
      if(nextStatus)payload.nextStatus=nextStatus;
      const updated=await adminJson<Prospect>(`/api/admin/prospecting/${selected.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      setSelected(updated);setDraft(updated.outreachDraft);setNotes(updated.notes);setReview(updated.review ?? review);
      setClaim(""); setSourceUrl(""); setEvidenceVerified(false); setMessage("Changes saved. Sending is not automated.");await load();
    }catch(e){setError(e instanceof Error?e.message:"Unable to save prospect.");}
    finally{setBusy(false);}
  }
  async function createDraft() {
    if(!selected||busy||selected.status!=="QUALIFIED")return;
    if(claim.trim()||sourceUrl.trim()||notes!==selected.notes) {
      setError("Save all research notes and verified evidence before generating an outreach draft."); return;
    }
    setBusy(true);setError("");setMessage("");
    try {
      const updated=await adminJson<Prospect>(`/api/admin/prospecting/${selected.id}/draft`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({expectedUpdatedAt:selected.updatedAt}),
      });
      setSelected(updated);setDraft(updated.outreachDraft);
      setReview(updated.review??review);
      setMessage("A draft is ready for review. Nothing has been sent.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Unable to prepare an outreach draft.");}
    finally{setBusy(false);}
  }
  return <AdminShell><div className="max-w-5xl mx-auto space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-widest" style={{color:"var(--blue)"}}>ATG INTERNAL SALES</p>
      <h1 className="text-2xl font-bold">Prospect Review</h1>
      <p className="text-sm opacity-70">Private research queue. No outbound emails, OAuth connections, or automated messages.</p></div>
    <section aria-label="Google Sheets prospect pipeline" className="rounded-xl border p-4 space-y-4" style={{borderColor:"var(--canvas-border)"}}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Google Sheets Pipeline</h2>
          <p className="text-xs opacity-70">Read-only live ledger maintained by the prospecting agent. Separate from manual prospect reviews below.</p>
        </div>
        <div className="flex gap-2">
          {sheet&&<a className="btn-secondary px-3 py-2 text-sm" href={sheet.url} target="_blank" rel="noopener noreferrer">Open Google Sheet</a>}
          <button type="button" className="btn-secondary px-3 py-2 text-sm" disabled={sheetLoading} onClick={()=>void loadSheet()}>Refresh</button>
        </div>
      </div>
      {sheetLoading&&<p role="status" className="text-sm opacity-70">Reading Google Sheet...</p>}
      {sheetError&&<p role="alert" className="text-sm text-red-600">{sheetError}</p>}
      {sheet&&!sheetLoading&&<>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            ["Prospects reviewed",sheet.prospectCount],
            ["Follow-ups due",sheet.followUpsDue],
            ["Do not contact",sheet.suppressedCount],
            ["Pipeline stages",Object.keys(sheet.byStage).length],
          ] as const).map(([label,value])=><div key={label} className="rounded border p-3" style={{borderColor:"var(--canvas-border)"}}>
            <div className="text-xl font-bold">{value}</div><div className="text-xs opacity-70">{label}</div>
          </div>)}
        </div>
        {sheet.dataTruncated&&<p className="text-xs text-amber-700">Showing the first 500 prospects. The Sheet remains the complete source of record.</p>}
        <div className="flex flex-wrap gap-2 text-xs">{Object.entries(sheet.byStage).map(([stage,count])=><span key={stage} className="rounded border px-2 py-1" style={{borderColor:"var(--canvas-border)"}}>{stage}: {count}</span>)}</div>
        <label className="block text-sm">Filter business, location, service, contact, or outreach stage
          <input className="field-input block w-full mt-1" value={sheetFilter} onChange={e=>setSheetFilter(e.target.value)} placeholder="Search current Sheet rows"/>
        </label>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead><tr className="border-b" style={{borderColor:"var(--canvas-border)"}}>
              <th className="p-2">Business</th><th className="p-2">Location</th><th className="p-2">Signal / ATG fit</th><th className="p-2">Contact</th><th className="p-2">Stage</th><th className="p-2">Follow-up</th><th className="p-2">Review</th>
            </tr></thead>
            <tbody>{sheet.rows.filter(r=>{
              const q=sheetFilter.trim().toLowerCase();return !q||[r.businessName,r.city,r.category,r.suggestedService,r.contactName,r.outreachStage].some(v=>v.toLowerCase().includes(q));
            }).map(r=><tr key={r.rowNumber} className="border-b align-top" style={{borderColor:"var(--canvas-border)"}}>
              <td className="p-2"><div className="font-semibold">{r.businessName}</div>
                <div className="opacity-70">{r.category}</div>
                {r.website&&<a href={r.website} target="_blank" rel="noopener noreferrer" className="underline">Website</a>}
              </td>
              <td className="p-2">{[r.city,r.state].filter(Boolean).join(", ")}</td>
              <td className="p-2 max-w-72"><div>{r.observedSignal}</div><div className="font-semibold mt-1">{r.suggestedService}</div></td>
              <td className="p-2"><div>{r.contactName}</div><div>{r.contactEmail}</div><div className="opacity-70">{r.emailStatus}</div></td>
              <td className="p-2">{r.outreachStage}{r.doNotContact&&<div className="text-red-600 font-semibold">Do not contact</div>}</td>
              <td className="p-2">{r.nextFollowUp||"Not scheduled"}</td>
              <td className="p-2"><button type="button" className="text-xs underline" disabled={r.doNotContact||!["Ready","Contacted","Replied"].includes(r.outreachStage)} onClick={()=>{
                setApprovalRow(r);setApprovalStage(r.outreachStage==="Ready"?"Contacted":"Replied");
                setApprovalDate(new Date().toISOString().slice(0,10));setApprovalFollowUp(r.nextFollowUp);
                setApprovalConfirmed(false);setApprovalError("");setApprovalMessage("");
              }}>Review update</button></td>
            </tr>)}</tbody>
          </table>
        </div>
        {sheet.prospectCount===0&&<p className="text-sm opacity-70">No researched prospects yet. The agent can populate the Sheet without changes here.</p>}
      </>}
    </section>
    <section aria-label="Approved Google Sheet updates" className="rounded-xl border p-4 space-y-3" style={{borderColor:"var(--canvas-border)"}}>
      <h2 className="font-semibold text-lg">Reviewed Sheet Updates</h2>
      <p className="text-xs opacity-70">Select Review update on an eligible prospect above. Each change is explicitly approved, and the backend rechecks the live Sheet before modifying only the outreach stage and follow-up dates. Write-back must be enabled by the ATG administrator.</p>
      {approvalMessage&&<p role="status" className="text-sm text-green-700">{approvalMessage}</p>}
      {approvalError&&<p role="alert" className="text-sm text-red-600">{approvalError}</p>}
      {approvalRow&&<div className="rounded-lg border p-3 space-y-3" style={{borderColor:"var(--canvas-border)"}}>
        <div className="font-semibold">{approvalRow.businessName} ({approvalRow.domain})</div>
        <p className="text-xs">Current Sheet stage: {approvalRow.outreachStage}. Contact: {approvalRow.contactEmail||"Not provided"}.</p>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm">New stage
            <select className="field-input mt-1 w-full" value={approvalStage} onChange={e=>{setApprovalStage(e.target.value as "Contacted"|"Replied");setApprovalConfirmed(false);}}>
              {approvalRow.outreachStage==="Ready"?<option value="Contacted">Contacted</option>:<><option value="Contacted" disabled={approvalRow.outreachStage==="Replied"}>Contacted</option><option value="Replied">Replied</option></>}
            </select>
          </label>
          <label className="text-sm">Last contacted (YYYY-MM-DD)
            <input type="date" className="field-input mt-1 w-full" value={approvalDate} onChange={e=>{setApprovalDate(e.target.value);setApprovalConfirmed(false);}}/>
          </label>
          <label className="text-sm">Next follow-up (optional)
            <input type="date" className="field-input mt-1 w-full" value={approvalFollowUp} onChange={e=>{setApprovalFollowUp(e.target.value);setApprovalConfirmed(false);}}/>
          </label>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={approvalConfirmed} onChange={e=>setApprovalConfirmed(e.target.checked)}/>
          I reviewed the actual prospect and verified that this stage and date change are accurate.
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary px-3 py-2" disabled={!approvalConfirmed||approvalBusy} onClick={()=>void approveSheetStage()}>{approvalBusy?"Saving…":"Approve & update Google Sheet"}</button>
          <button type="button" className="btn-secondary px-3 py-2" disabled={approvalBusy} onClick={()=>setApprovalRow(null)}>Cancel</button>
        </div>
        <p className="text-xs opacity-70">No Gmail sends. Suppressed contacts cannot be updated. Concurrent Sheet edits after the server's final read cannot be atomically prevented.</p>
      </div>}
      {!approvalRow&&<p className="text-sm opacity-70">No prospect selected for review.</p>}
    </section>
    <section aria-label="Prospect Calendar" className="rounded-xl border p-4 space-y-3" style={{borderColor:"var(--canvas-border)"}}>
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div><h2 className="font-semibold text-lg">Upcoming Prospect Consultations</h2>
          <p className="text-xs opacity-70">Read-only: matches Google Calendar attendees with unique, non-suppressed prospect emails over the next 60 days.</p></div>
        <button type="button" className="btn-secondary px-3 py-2 text-sm" disabled={calendarBusy||sheetLoading||!sheet} onClick={()=>void checkCalendar()}>{calendarBusy?"Checking…":"Check Calendar"}</button>
      </div>
      {calendarError&&<p role="alert" className="text-sm text-red-600">{calendarError}</p>}
      {calendar&&<>
        <p className="text-sm font-medium">{calendar.meetingCount} matching consultation(s)</p>
        {calendar.limited&&<p className="text-xs text-amber-700">Only the first 100 upcoming Calendar events were examined, or Sheet coverage is incomplete. Not an exhaustive count.</p>}
        {calendar.matches.length===0&&<p className="text-sm opacity-70">No matching scheduled consultations found.</p>}
        <div className="space-y-2">{calendar.matches.map((meeting,i)=><div key={meeting.rowNumber+"-"+meeting.startsAt+"-"+i} className="rounded border p-3 text-sm" style={{borderColor:"var(--canvas-border)"}}>
          <div className="font-semibold">{meeting.businessName}</div>
          <div>{new Date(meeting.startsAt).toLocaleString()} | {meeting.responseStatus}</div>
          <div className="text-xs opacity-70">{meeting.contactEmail}</div>
          {meeting.calendarUrl&&<a className="underline text-xs" href={meeting.calendarUrl} target="_blank" rel="noopener noreferrer">View in Google Calendar</a>}
        </div>)}</div>
        <p className="text-xs opacity-70">Calendar visibility does not automatically mark a prospect as booked, change the Sheet or create new events.</p>
      </>}
    </section>
    <section aria-label="Gmail outreach reconciliation" className="rounded-xl border p-4 space-y-3" style={{borderColor:"var(--canvas-border)"}}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg">Gmail Conversation Matching</h2>
          <p className="text-xs opacity-70">On-demand, read-only Gmail metadata check against unique, non-suppressed Sheet contact emails. No messages are sent and no statuses are changed.</p>
        </div>
        <button type="button" className="btn-secondary px-3 py-2 text-sm" disabled={gmailBusy||sheetLoading||!sheet} onClick={()=>void checkGmail(0)}>
          {gmailBusy?"Checking…":"Check Gmail"}
        </button>
      </div>
      {gmailError&&<p role="alert" className="text-sm text-red-600">{gmailError}</p>}
      {gmail&&<>
        <p className="text-xs opacity-70">Connected mailbox: {gmail.account}. Checked {gmail.checked} contacts (batch starting at {gmail.offset+1}) of {gmail.eligibleCount} eligible contacts. Excluded {gmail.skippedSuppressed} suppressed and {gmail.skippedAmbiguous} duplicate-email records.</p>
        {gmail.limited&&<p className="text-xs text-amber-700">Each batch checks up to 12 eligible contacts and at most 3 recent matching threads per contact. A missing match does not prove there was no outreach.</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {([
            ["Replies detected",gmail.summary.replyDetected],
            ["Outbound found",gmail.summary.outboundFound],
            ["Inbound only",gmail.summary.inboundWithoutOutbound],
            ["No recent match",gmail.summary.noRecentMatch],
          ] as const).map(([label,n])=><div key={label} className="rounded border p-3" style={{borderColor:"var(--canvas-border)"}}><div className="text-xl font-bold">{n}</div><div className="text-xs opacity-70">{label}</div></div>)}
        </div>
        {gmail.summary.errors>0&&<p className="text-xs text-red-600">{gmail.summary.errors} contact checks could not be completed. No assumptions were made about their outreach status.</p>}
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead><tr className="border-b" style={{borderColor:"var(--canvas-border)"}}>
              <th className="p-2">Business</th><th className="p-2">Contact</th><th className="p-2">Gmail evidence</th><th className="p-2">Latest outbound</th><th className="p-2">Latest inbound</th><th className="p-2">Suggested next step</th>
            </tr></thead><tbody>
            {gmail.matches.map(m=><tr key={m.rowNumber} className="border-b" style={{borderColor:"var(--canvas-border)"}}>
              <td className="p-2">{m.businessName}</td><td className="p-2">{m.contactEmail}</td>
              <td className="p-2">{({
                reply_detected:"Reply observed in a matching thread",
                outbound_found:"Outbound message observed",
                inbound_without_outbound:"Inbound message; outbound not confirmed",
                no_recent_match:"No match in limited search",
                error:"Unable to check",
              } as const)[m.status]}</td>
              <td className="p-2">{m.lastOutboundAt?new Date(m.lastOutboundAt).toLocaleDateString():""}</td>
              <td className="p-2">{m.lastInboundAt?new Date(m.lastInboundAt).toLocaleDateString():""}</td>
              <td className="p-2">{({review_reply:"Review response",verify_outreach:"Verify sent message",inspect_inbound:"Review inbound",none:"No change"} as const)[m.suggestedAction]}</td>
            </tr>)}
          </tbody></table>
        </div>
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="text-xs opacity-70">Batch {Math.floor(gmail.offset/12)+1}; results are evidence only, not confirmed CRM statuses.</div>
          <div className="flex gap-2">
            {gmail.offset>0&&<button type="button" className="btn-secondary px-3 py-2 text-xs" disabled={gmailBusy} onClick={()=>void checkGmail(Math.max(0,gmail.offset-12))}>Previous 12</button>}
            {gmail.nextOffset!==null&&<button type="button" className="btn-secondary px-3 py-2 text-xs" disabled={gmailBusy} onClick={()=>void checkGmail(gmail.nextOffset!)}>Next 12</button>}
          </div>
        </div>
        <p className="text-xs opacity-70">A detected reply is evidence for human review, not an automatic qualified lead or booking. All Sheet and database stages remain unchanged.</p>
      </>}
    </section>
    {error&&<p role="alert" className="p-3 rounded bg-red-100 text-red-900">{error}</p>}
    {message&&<p role="status" className="p-3 rounded bg-green-100 text-green-900">{message}</p>}
    <form onSubmit={add} className="flex flex-wrap gap-2">
      <input aria-label="Business name" className="field-input flex-1 min-w-48" placeholder="Business name" value={name} onChange={e=>setName(e.target.value)} required/>
      <input aria-label="Website" className="field-input flex-1 min-w-48" placeholder="https://business.com" value={website} onChange={e=>setWebsite(e.target.value)} required/>
      <button disabled={busy} className="btn-primary px-4 py-2">Add prospect</button>
    </form>
    <div className="grid md:grid-cols-2 gap-4">
      <section className="space-y-2" aria-label="Prospects">
        {rows.length===0&&<p className="text-sm opacity-70">No prospects recorded.</p>}
        {rows.map(p=><button key={p.id} type="button" onClick={()=>{setSelected(p);setDraft(p.outreachDraft);setNotes(p.notes);setReview(p.review??emptyReview);setClaim("");setSourceUrl("");setEvidenceVerified(false);setMessage("");}}
          className="block w-full text-left rounded-lg border p-3" style={{borderColor:selected?.id===p.id?"var(--blue)":"var(--canvas-border)"}}>
          <div className="font-semibold">{p.businessName}</div><div className="text-xs opacity-70">{p.domain}</div>
          <div className="text-xs mt-2">{p.status} {p.score!==null?`· Fit ${p.score}/100`:""}</div>
        </button>)}
      </section>
      <section className="rounded-lg border p-4 space-y-3" style={{borderColor:"var(--canvas-border)"}}>
        {selected?<>
          <div><h2 className="font-semibold text-lg">{selected.businessName}</h2>
            <a className="text-sm underline" href={selected.website} target="_blank" rel="noopener noreferrer">{selected.domain}</a>
            <p className="text-xs opacity-70 mt-1">Status: {selected.status}. Qualification requires verified source evidence.</p></div>
          <div className="space-y-2 rounded border p-3" style={{borderColor:"var(--canvas-border)"}}>
            <p className="font-semibold text-sm">Evidence-backed qualification (0–5)</p>
            {(["industryFit","sizeFit","observableNeed","contactConfidence","urgency"] as const).map(key=><label key={key} className="flex items-center justify-between gap-2 text-xs">
              <span>{key.replace(/([A-Z])/g," $1")}</span><input aria-label={key} type="number" min={0} max={5} step={1} className="field-input w-16" value={review[key]} onChange={e=>setReview(r=>({...r,[key]:Number(e.target.value)}))}/>
            </label>)}
            <label className="block text-xs">Verified observation<input className="field-input mt-1 w-full" value={claim} onChange={e=>setClaim(e.target.value)} placeholder="Specific observable business fact"/></label>
            <label className="block text-xs">Source URL<input className="field-input mt-1 w-full" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://source.example/page"/></label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={evidenceVerified} onChange={e=>setEvidenceVerified(e.target.checked)}/> I personally checked this fact against the supplied public source</label>
            <p className="text-xs opacity-70">Do not invent needs or contacts. Existing observations: {review.evidence.length}.</p>
          </div>
          <label className="block text-sm font-medium">Research notes
            <textarea className="field-input mt-1 w-full" rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
          <label className="block text-sm font-medium">Draft outreach (never sent by ATG)
            <textarea className="field-input mt-1 w-full" rows={6} value={draft} onChange={e=>setDraft(e.target.value)} readOnly={selected.status==="APPROVED"||selected.status==="SUPPRESSED"}/></label>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary px-3 py-2" disabled={busy||selected.status==="SUPPRESSED"} onClick={()=>void save()}>Save notes / draft</button>
            {selected.status==="QUALIFIED"&&<button type="button" className="btn-secondary px-3 py-2" disabled={busy} onClick={()=>void createDraft()}>Prepare AI outreach draft</button>}
            {transitions[selected.status].map(s=><button type="button" key={s} disabled={busy} onClick={()=>void save(s)}
              className="text-xs font-semibold rounded border px-3 py-2" style={{borderColor:"var(--canvas-border)"}}>{s.replaceAll("_"," ")}</button>)}
          </div>
          <p className="text-xs opacity-70">Qualification is intentionally blocked until a source-backed assessment is saved through the reviewed API workflow. Mark CONTACTED only after separately completing approved outreach.</p>
        </>:<p className="text-sm opacity-70">Select a prospect to see research and draft history.</p>}
      </section>
    </div>
  </div></AdminShell>;
}
