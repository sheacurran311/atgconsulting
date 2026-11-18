/** Read-only ATG-owned prospecting Sheet adapter. No writes or Gmail access. */
import { ReplitConnectors } from "@replit/connectors-sdk";

export const DEFAULT_ATG_PROSPECT_SHEET_ID = "13S9bNCUwvsOLTLUDZq5roX9OMCia8xZJthn6jguoeVE";
export const SHEET_HEADERS = [
  "Business name","Website","Domain key","Business category","City","State","Contact name",
  "Contact title","Contact email","Email status","Contact page","Business phone",
  "Company LinkedIn","Business source URL","Contact source URL","Researched on",
  "Observed signal","Suggested ATG service","Priority","Outreach stage","Owner",
  "Last contacted","Next follow-up","Do not contact","Notes","Research segment",
] as const;
export type SheetProspect = {
  rowNumber: number; businessName: string; website: string; domain: string; category: string;
  city: string; state: string; contactName: string; contactEmail: string; emailStatus: string;
  observedSignal: string; suggestedService: string; priority: string; outreachStage: string;
  owner: string; lastContacted: string; nextFollowUp: string; doNotContact: boolean;
  researchSegment: string; businessSourceUrl: string; contactSourceUrl: string;
};
type SheetData = { range?: string; values?: unknown };
export type Pipeline = {
  spreadsheetId: string; url: string; prospectCount: number;
  rows: SheetProspect[]; byStage: Record<string,number>; suppressedCount: number;
  followUpsDue: number; dataTruncated: boolean;
};
const MAX_ROWS=500;
const CELL_LIMIT=500;
function val(v:unknown):string {return typeof v==="string" ? v.slice(0,CELL_LIMIT).trim() : typeof v==="number" ? String(v) : "";}
function safeUrl(v:string): string {try {const u=new URL(v);return ["https:","http:"].includes(u.protocol)?u.href:"";}catch{return "";}}
export function parseProspectSheet(data:SheetData, spreadsheetId:string, now=new Date()):Pipeline {
  const values=Array.isArray(data.values) ? data.values : [];
  const header=Array.isArray(values[0])? values[0].map(val):[];
  // Fail closed on altered or reordered schemas instead of mislabeling PII or stages.
  if(SHEET_HEADERS.some((h,i)=>header[i]!==h))throw new Error("Prospect Sheet headers changed; reconcile the schema before enabling the dashboard.");
  const rows:SheetProspect[]=[];
  const stages:Record<string,number>={};
  let suppressedCount=0,followUpsDue=0;
  const today=now.toISOString().slice(0,10);
  for(let i=1;i<values.length&&rows.length<MAX_ROWS;i++){
    const raw=values[i];
    if(!Array.isArray(raw))continue;
    const a=(idx:number)=>val(raw[idx]);
    const businessName=a(0);
    if(!businessName)continue;
    const suppressed=/^(yes|true|1|y)$/i.test(a(23));
    const stage=a(19)||"Unspecified";
    const nextFollowUp=a(22);
    if(suppressed)suppressedCount++;
    if(!suppressed&&/^\d{4}-\d{2}-\d{2}$/.test(nextFollowUp)&&nextFollowUp<=today)followUpsDue++;
    stages[stage]=(stages[stage]??0)+1;
    rows.push({
      rowNumber:i+1,businessName,website:safeUrl(a(1)),domain:a(2),category:a(3),city:a(4),state:a(5),
      contactName:a(6),contactEmail:a(8),emailStatus:a(9),
      observedSignal:a(16),suggestedService:a(17),priority:a(18),outreachStage:stage,owner:a(20),
      lastContacted:a(21),nextFollowUp,doNotContact:suppressed,researchSegment:a(25),
      businessSourceUrl:safeUrl(a(13)),contactSourceUrl:safeUrl(a(14)),
    });
  }
  return {
    spreadsheetId,url:`https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit`,
    prospectCount:rows.length,rows,byStage:stages,suppressedCount,followUpsDue,
    dataTruncated:values.length>MAX_ROWS+1,
  };
}
export async function readProspectPipeline(
  opts:{sheetId?:string;client?:Pick<ReplitConnectors,"proxy">;now?:Date}={}
):Promise<Pipeline>{
  const sheetId=opts.sheetId??process.env.ATG_PROSPECT_SHEET_ID??DEFAULT_ATG_PROSPECT_SHEET_ID;
  if(!/^[a-zA-Z0-9_-]{20,100}$/.test(sheetId))throw new Error("ATG prospect spreadsheet ID is invalid.");
  const client=opts.client??new ReplitConnectors();
  const path=`/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/%27Prospects%27%21A1%3AZ${MAX_ROWS+1}?valueRenderOption=FORMATTED_VALUE`;
  const resp=await client.proxy("google-sheet",path);
  if(!resp.ok) {
    if(resp.status===403||resp.status===401)throw new Error("ATG Google Sheets connector lacks access. Verify the project-level grant.");
    if(resp.status===404)throw new Error("ATG prospect spreadsheet not found for this connected Google account.");
    throw new Error(`Google Sheets read failed (HTTP ${resp.status}).`);
  }
  const payload:unknown=await resp.json();
  if(!payload||typeof payload!=="object"||!Array.isArray((payload as SheetData).values))
    throw new Error("Google Sheets returned unexpected data.");
  return parseProspectSheet(payload as SheetData,sheetId,opts.now);
}
