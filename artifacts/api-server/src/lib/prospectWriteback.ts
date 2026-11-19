/**
 * Explicitly approved ATG prospect stage changes.
 * Google Sheets remains source of truth. Never update contact, evidence or suppression columns.
 *
 * Sheets values APIs provide no atomic compare-and-swap. We re-read immediately
 * before the narrow write and fail closed on changed identity/stage/suppression.
 * Concurrent human edits between that read and write remain possible.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { DEFAULT_ATG_PROSPECT_SHEET_ID, SHEET_HEADERS } from "./prospectSheet";

export type ReviewWrite = {
  rowNumber:number; expectedBusiness:string; expectedDomain:string; expectedEmail:string;
  expectedStage:string; expectedLastContacted:string; expectedFollowUp:string;
  nextStage:"Contacted"|"Replied"; lastContacted:string; nextFollowUp:string;
  confirmed:true;
};
type Writer={proxy:(name:string,path:string,options?:{method?:string;headers?:Record<string,string>;body?:string})=>Promise<Response>};
export class ProspectWriteConflict extends Error {}
function str(v:unknown):string{return typeof v==="string"?v.trim():typeof v==="number"?String(v):"";}
function validDate(x:string):boolean{
  if(!x)return true;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
  const d=new Date(x+"T00:00:00Z");
  return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===x;
}
function validEmail(x:string):boolean{return !x||/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(x);}
export function verifyProposedChange(row:unknown[],payload:ReviewWrite):void{
  const v=(i:number)=>str(row[i]);
  if(!payload.confirmed||!Number.isSafeInteger(payload.rowNumber)||payload.rowNumber<2||payload.rowNumber>501)
    throw new ProspectWriteConflict("Prospect row or explicit confirmation is invalid.");
  if(!validDate(payload.lastContacted)||!validDate(payload.nextFollowUp)||!payload.lastContacted)
    throw new ProspectWriteConflict("Use valid dates (YYYY-MM-DD) for contact and follow-up.");
  if(!["Contacted","Replied"].includes(payload.nextStage))
    throw new ProspectWriteConflict("Unsupported outreach stage.");
  if(payload.nextStage==="Contacted"&&!["Ready","Contacted"].includes(payload.expectedStage))
    throw new ProspectWriteConflict("Contacted requires a Ready or Contacted source stage.");
  if(payload.nextStage==="Replied"&&!["Contacted","Replied"].includes(payload.expectedStage))
    throw new ProspectWriteConflict("Replied requires a Contacted or Replied source stage.");
  if(
    v(0)!==payload.expectedBusiness||v(2).toLowerCase()!==payload.expectedDomain.toLowerCase()||
    v(8).toLowerCase()!==payload.expectedEmail.toLowerCase()||
    v(19)!==payload.expectedStage||
    v(21)!==payload.expectedLastContacted||v(22)!==payload.expectedFollowUp
  )throw new ProspectWriteConflict("Prospect row changed. Refresh the Google Sheet and review again.");
  if(/^(yes|true|1|y)$/i.test(v(23)))throw new ProspectWriteConflict("Prospect is marked Do not contact.");
  if(!validEmail(v(8))||!v(0)||!v(2))throw new ProspectWriteConflict("Prospect has incomplete or ambiguous identity.");
}
async function providerJson(client:Writer,path:string):Promise<unknown>{
  const resp=await client.proxy("google-sheet",path);
  if(!resp.ok)throw new Error(`Google Sheets read failed (HTTP ${resp.status}).`);
  return resp.json();
}
export async function approveSheetUpdate(
  payload:ReviewWrite,
  opts:{client?:Writer;sheetId?:string;allowWrites?:boolean}={}
):Promise<{rowNumber:number;stage:string;lastContacted:string;nextFollowUp:string}>{
  if(!(opts.allowWrites??process.env.ATG_ENABLE_SHEET_WRITEBACK==="true"))
    throw new ProspectWriteConflict("Google Sheets write-back is disabled until explicitly enabled.");
  const sheetId=opts.sheetId??process.env.ATG_PROSPECT_SHEET_ID??DEFAULT_ATG_PROSPECT_SHEET_ID;
  if(!/^[A-Za-z0-9_-]{20,100}$/.test(sheetId))throw new ProspectWriteConflict("Invalid ATG spreadsheet identifier.");
  if(!Number.isSafeInteger(payload.rowNumber)||payload.rowNumber<2||payload.rowNumber>501)
    throw new ProspectWriteConflict("Invalid prospect row.");
  // The SDK's proxy accepts per-request HTTP method and body options.
  const client=opts.client??(new ReplitConnectors() as unknown as Writer);
  const base=`/v4/spreadsheets/${encodeURIComponent(sheetId)}`;
  const header=await providerJson(client,`${base}/values/%27Prospects%27%21A1%3AZ1`) as {values?:unknown};
  if(!Array.isArray(header.values)||!Array.isArray(header.values[0])||
    SHEET_HEADERS.some((h,i)=>(header.values as unknown[][])[0]?.[i]!==h))
    throw new ProspectWriteConflict("Prospect Sheet column structure changed. No update performed.");
  const idRange=encodeURIComponent(`'Prospects'!A${payload.rowNumber}:X${payload.rowNumber}`);
  const read=await providerJson(client,`${base}/values/${idRange}?valueRenderOption=FORMATTED_VALUE`) as {values?:unknown};
  const current=Array.isArray(read.values)&&Array.isArray(read.values[0])?read.values[0]:[];
  verifyProposedChange(current,payload);
  // Updating only the three approved cells protects all research and opt-out fields.
  const body={valueInputOption:"RAW",data:[
    {range:`'Prospects'!T${payload.rowNumber}`,values:[[payload.nextStage]]},
    {range:`'Prospects'!V${payload.rowNumber}`,values:[[payload.lastContacted]]},
    {range:`'Prospects'!W${payload.rowNumber}`,values:[[payload.nextFollowUp]]},
  ]};
  const response=await client.proxy("google-sheet",`${base}/values:batchUpdate`,{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
  });
  if(!response.ok)throw new Error(`Google Sheets update failed (HTTP ${response.status}).`);
  const result=await response.json() as {totalUpdatedCells?:unknown};
  if(result.totalUpdatedCells!==3)throw new Error("Google Sheets did not confirm all three cell updates; inspect the Sheet.");
  return {rowNumber:payload.rowNumber,stage:payload.nextStage,lastContacted:payload.lastContacted,nextFollowUp:payload.nextFollowUp};
}
