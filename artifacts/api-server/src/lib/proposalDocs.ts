/**
 * Manual ATG-owned export of an approved proposal. Never reads client Google accounts,
 * emails a customer, changes sharing, or exports private review notes.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { parseInvestment, parseMilestones } from "./clientProposal";

type ProxyOptions={method?:string;headers?:Record<string,string>;body?:string};
type Client={proxy:(name:string,path:string,opts?:ProxyOptions)=>Promise<Response>};
type Source={
  execSummary:string;understanding:string;scope:string;howWeConnect:string;
  milestones:string;investment:string;acceptanceClause:string;
};
const GOOGLE_ID=/^[A-Za-z0-9_-]{20,160}$/;
const email=(s:string)=>s.trim().toLowerCase();
function clean(s:string,max=12000){return s.replace(/\u0000/g,"").slice(0,max).trim();}
export function approvedProposalDocText(proposal:Source,company:string):string{
  const investment=parseInvestment(proposal.investment);
  const milestones=parseMilestones(proposal.milestones);
  const lines=[
    "ATG CONSULTING | APPROVED PROPOSAL",
    clean(company,160),
    "",
    "EXECUTIVE SUMMARY",clean(proposal.execSummary),"",
    "OUR UNDERSTANDING",clean(proposal.understanding),"",
    "SCOPE AND DELIVERABLES",clean(proposal.scope),"",
    "CUSTOMER-OWNED SYSTEMS AND INTEGRATIONS",clean(proposal.howWeConnect),"",
    "DELIVERY MILESTONES",
    ...milestones.map((m,i)=>`${i+1}. ${clean(m.label,160)}: ${clean(m.description,2000)}`),
    "",
    "INVESTMENT",...(["tier","price","care","notes"] as const)
      .flatMap(key=>investment[key]?[ `${key}: ${clean(investment[key]!,1000)}` ]:[]),
    "",
    "ACCEPTANCE",clean(proposal.acceptanceClause),"",
    "This document is an ATG-owned export. Sharing and client acceptance are separate actions.",
  ];
  return lines.join("\n").slice(0,48000);
}
async function request(client:Client,service:string,path:string,opts?:ProxyOptions):Promise<unknown>{
  const response=await client.proxy(service,path,opts);
  if(!response.ok)throw new Error(`${service} request failed (HTTP ${response.status}).`);
  return response.json();
}
export async function createATGProposalDoc(opts:{
  proposal:Source;company:string;client?:Client;account?:string;folderId?:string;
  onCreated:(docId:string)=>Promise<void>;
}):Promise<{docId:string;url:string}>{
  const client=opts.client??(new ReplitConnectors() as unknown as Client);
  const expected=email(opts.account??process.env.ATG_DOCS_OWNER_EMAIL??"shea@atgconsulting.io");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(expected))throw new Error("Invalid configured ATG Docs account.");
  if(opts.folderId&&!GOOGLE_ID.test(opts.folderId))throw new Error("Invalid ATG proposal folder ID.");
  const about=await request(client,"google-drive","/drive/v3/about?fields=user(emailAddress)") as {user?:{emailAddress?:unknown}};
  if(email(typeof about?.user?.emailAddress==="string"?about.user.emailAddress:"")!==expected)
    throw new Error("Connected Google Drive account does not match the approved ATG Docs owner.");
  const title=`ATG Proposal | ${clean(opts.company,80)}`;
  const created=await request(client,"google-docs","/v1/documents",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title}),
  }) as {documentId?:unknown};
  if(typeof created?.documentId!=="string"||!GOOGLE_ID.test(created.documentId))
    throw new Error("Google Docs did not return a valid document identifier.");
  const docId=created.documentId;
  // Persist immediately so a later failure cannot result in a duplicate document on retry.
  await opts.onCreated(docId);
  // Replit can bind Docs and Drive to distinct accounts. Check the created file's
  // actual Google owner before inserting any customer-specific proposal content.
  const ownership=await request(client,"google-drive",
    `/drive/v3/files/${encodeURIComponent(docId)}?fields=id,owners(emailAddress)`) as {
      owners?:Array<{emailAddress?:unknown}>;
    };
  if(!Array.isArray(ownership.owners)||
    !ownership.owners.some(owner=>email(typeof owner.emailAddress==="string"?owner.emailAddress:"")===expected))
    throw new Error("New document owner does not match the ATG Docs account. Export halted.");
  const content=approvedProposalDocText(opts.proposal,opts.company);
  await request(client,"google-docs",`/v1/documents/${encodeURIComponent(docId)}:batchUpdate`,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({requests:[{insertText:{location:{index:1},text:content}}]}),
  });
  if(opts.folderId){
    const file=await request(client,"google-drive",
      `/drive/v3/files/${encodeURIComponent(docId)}?fields=id,parents`) as {parents?:unknown};
    const parents=Array.isArray(file?.parents)?file.parents.filter((p):p is string=>typeof p==="string"&&GOOGLE_ID.test(p)):[];
    const params=new URLSearchParams({addParents:opts.folderId,
      ...(parents.length?{removeParents:parents.join(",")}:{})});
    await request(client,"google-drive",
      `/drive/v3/files/${encodeURIComponent(docId)}?${params}`,{
        method:"PATCH",headers:{"Content-Type":"application/json"},body:"{}",
      });
  }
  return {docId,url:`https://docs.google.com/document/d/${encodeURIComponent(docId)}/edit`};
}
