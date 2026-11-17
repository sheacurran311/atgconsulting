/**
 * Draft-only outbound copy, grounded in ATG's operator-verified prospect evidence.
 * This module never sends mail, connects accounts, crawls URLs or invents sources.
 */
import { getGrokClient, GROK_MODEL, logFallback } from "./grokClient";
import type { ProspectEvidence } from "./prospecting";
import { atgBusinessSkills } from "./businessSkillRegistry";

export interface ProspectDraftInput {
  businessName: string;
  verifiedEvidence: ProspectEvidence[];
}
export function draftFallback(input: ProspectDraftInput): string {
  const first = input.verifiedEvidence.find(e=>e.verified && e.claim.trim() && /^https?:\/\//i.test(e.sourceUrl));
  if (!first) throw new Error("Verified source evidence is required.");
  return `Hello,\n\nI work with small businesses on practical AI, sales, and operations improvements. I was reviewing ${input.businessName} and noticed this publicly documented detail: ${first.claim}\n\nIf streamlining a related workflow is a priority, I'd be interested in comparing notes and seeing whether a short consultation would be useful.\n\nBest,\nATG Consulting`;
}
export async function generateProspectDraft(input: ProspectDraftInput):Promise<{draft:string;source:"LLM"|"TEMPLATE"}> {
  const evidence=input.verifiedEvidence.filter(e=>e.verified && e.claim.trim() && /^https?:\/\//i.test(e.sourceUrl)).slice(0,8);
  if(!evidence.length) throw new Error("Verified source evidence is required.");
  const safe={businessName:input.businessName.slice(0,160),verifiedEvidence:evidence};
  const fallback=draftFallback(safe);
  const methods=atgBusinessSkills.filter(skill=>["prospecting","cold-email"].includes(skill.id));
  const methodGuidance=methods.map(skill=>`${skill.title}: ${skill.consultantAction} Evidence requirement: ${skill.evidenceRequired}`).join("\n");
  const client=getGrokClient();
  if(!client) return {draft:fallback,source:"TEMPLATE"};
  try{
    const result=await client.chat.completions.create({
      model:GROK_MODEL,
      temperature:0.2,
      max_tokens:550,
      messages:[
        {role:"system",content:"You are drafting a short, professional, unsolicited business introduction for human review. Use ONLY the supplied verified public facts as factual evidence. Do not invent names, job titles, email addresses, website claims, client results, ROI figures, or prior relationships. Do not make claims of audits, analytics access, or personal knowledge. No deceptive subject lines. No high-pressure language. Draft only: do not claim to send any message. Return plain text of 100-160 words, including a courteous opt-out line."},
        {role:"user",content:JSON.stringify({businessName:safe.businessName,methodGuidance,verifiedEvidence:safe.verifiedEvidence.map(x=>({claim:x.claim,sourceUrl:x.sourceUrl,observedAt:x.observedAt}))})},
      ],
    });
    const draft=result.choices[0]?.message?.content?.trim()??"";
    if(draft.length<100||draft.length>8000) {
      logFallback("prospectDraft","invalid_output");
      return {draft:fallback,source:"TEMPLATE"};
    }
    return {draft,source:"LLM"};
  }catch(e){
    logFallback("prospectDraft","llm_error");
    return {draft:fallback,source:"TEMPLATE"};
  }
}
