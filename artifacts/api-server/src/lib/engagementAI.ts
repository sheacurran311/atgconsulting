/**
 * Engagement AI functions:
 *
 * suggestMembers()        — Grok analyzes a first intake and suggests who else should contribute
 * generateMergedReview()  — Grok combines all submissions into one dept-organized review
 * generateProposalSigners()— determines owner + approver per module based on member roles
 *
 * All functions have deterministic template fallbacks.
 * Tokens are tracked per-submission (AI_CAP_INTAKE applies per intake, not per engagement).
 */

import OpenAI from "openai";
import { getGrokClient, GROK_MODEL, logFallback } from "./grokClient";
import type { AnsweredQuestion } from "./discoveryAI";
import { ROLE_CONFIGS } from "./roleQuestions";

function getClient(): OpenAI | null {
  
  return getGrokClient();
}

// ── Suggest additional members ────────────────────────────────────────────────

export interface SuggestedMember {
  role: string;
  roleLabel: string;
  reason: string;
  priority: "required" | "recommended" | "optional";
}

export async function suggestMembers(
  answers: AnsweredQuestion[],
  decisionAuthority: string | null,
  approverInfo: { name?: string | null; email?: string | null; role?: string | null },
): Promise<{ suggestions: SuggestedMember[]; tokensUsed: number }> {
  const llm = getClient();

  const qaSummary = answers.slice(0, 15)
    .map((a) => `[${a.category}] ${a.question}\n→ ${a.answer}`)
    .join("\n\n");

  const authorityNote = decisionAuthority !== "full"
    ? `The respondent's decision authority is '${decisionAuthority ?? "unknown"}'. Approver: ${approverInfo.name ?? "TBC"} (${approverInfo.role ?? "—"}).`
    : "The respondent has full decision authority.";

  const roleList = Object.entries(ROLE_CONFIGS)
    .map(([slug, c]) => `${slug}: ${c.label}`)
    .join(", ");

  if (!llm) return buildFallbackSuggestions(answers, decisionAuthority, approverInfo);

  try {
    const completion = await llm.chat.completions.create({
      model: GROK_MODEL,
      max_tokens: 600,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `You are reviewing a company's first discovery intake for ATG Consulting.
${authorityNote}

Intake answers:
${qaSummary}

Available roles: ${roleList}

Based on the answers, suggest which other people at this company should contribute a short intake (8-12 questions each).
Only suggest roles where the answers reveal a knowledge gap, complex system ownership, or a separate decision-maker.
Do NOT suggest roles already clearly covered by the respondent.

Return ONLY valid JSON:
{"suggestions":[{"role":"ops_manager","roleLabel":"Operations Manager","reason":"Answer about ERP mentions a separate ops team","priority":"recommended"}]}`,
      }],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as { suggestions?: SuggestedMember[] };
    return { suggestions: raw.suggestions ?? [], tokensUsed: completion.usage?.total_tokens ?? 0 };
  } catch {
    return buildFallbackSuggestions(answers, decisionAuthority, approverInfo);
  }
}

function buildFallbackSuggestions(
  answers: AnsweredQuestion[],
  decisionAuthority: string | null,
  approverInfo: { name?: string | null; role?: string | null },
): { suggestions: SuggestedMember[]; tokensUsed: number } {
  const suggestions: SuggestedMember[] = [];

  const hasCoreSystem = answers.some((a) => a.id === "core_system" && a.answer.length > 20);
  const hasFieldTeam = answers.some((a) => a.id === "field_team" && a.answer.includes("yes"));
  const hasInvoicing = answers.some((a) => a.id === "invoicing_bottleneck");

  if (hasCoreSystem) {
    suggestions.push({ role: "it_admin", roleLabel: ROLE_CONFIGS.it_admin!.label, reason: "A system or ERP was mentioned — the IT/ERP admin can confirm API access and integrations.", priority: "recommended" });
  }
  if (hasFieldTeam) {
    suggestions.push({ role: "field_ops", roleLabel: ROLE_CONFIGS.field_ops!.label, reason: "Field or contractor management was mentioned.", priority: "recommended" });
  }
  if (hasInvoicing) {
    suggestions.push({ role: "finance", roleLabel: ROLE_CONFIGS.finance!.label, reason: "Invoicing was flagged as a bottleneck.", priority: "optional" });
  }
  if (decisionAuthority !== "full" && approverInfo.role) {
    const approverRoleSlug = approverInfo.role.toLowerCase().includes("ops") ? "ops_manager"
      : approverInfo.role.toLowerCase().includes("it") ? "it_admin"
      : approverInfo.role.toLowerCase().includes("finance") ? "finance"
      : "owner";
    suggestions.push({ role: approverRoleSlug, roleLabel: approverInfo.role, reason: `${approverInfo.name ?? "The approver"} was listed as the decision-maker. Their input is needed to complete the picture.`, priority: "required" });
  }

  return { suggestions, tokensUsed: 0 };
}

// ── Merged review ─────────────────────────────────────────────────────────────

export interface MemberSubmission {
  memberRole: string;
  memberName: string | null;
  answers: AnsweredQuestion[];
  decisionAuthority?: string | null;
}

export interface MergedReview {
  overview: string;
  byDepartment: Array<{
    department: string;
    findings: string[];
    owner: string;       // member role most accountable here
  }>;
  conflicts: Array<{
    topic: string;
    description: string;
    members: string[];
  }>;
  missingInput: Array<{
    topic: string;
    suggestedRole: string;
  }>;
  proposalReadiness: "ready" | "gaps_noted" | "missing_critical";
  readinessNote: string;
}

export async function generateMergedReview(
  engagementId: string,
  companyName: string,
  submissions: MemberSubmission[],
): Promise<{ review: MergedReview; tokensUsed: number }> {
  const llm = getClient();
  const fallback = buildFallbackMergedReview(companyName, submissions);
  if (!llm || submissions.length === 0) return { review: fallback, tokensUsed: 0 };

  const submissionSummary = submissions.map((s) => {
    const qa = s.answers.slice(0, 10).map((a) => `  [${a.category}] ${a.question}\n  → ${a.answer}`).join("\n\n");
    return `=== ${s.memberRole.toUpperCase()} (${s.memberName ?? "Anonymous"}) ===\n${qa}`;
  }).join("\n\n");

  try {
    const completion = await llm.chat.completions.create({
      model: GROK_MODEL,
      max_tokens: 2000,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `Generate an internal merged discovery review for ATG Consulting for ${companyName}.

Submissions from ${submissions.length} contributors:
${submissionSummary}

Return ONLY valid JSON:
{
  "overview": "2-3 sentences summarizing the company's overall situation",
  "byDepartment": [{"department":"Operations","findings":["..."],"owner":"ops_manager"}],
  "conflicts": [{"topic":"ERP ownership","description":"Owner says custom-built; IT says bought SaaS","members":["owner","it_admin"]}],
  "missingInput": [{"topic":"Field dispatch process","suggestedRole":"field_ops"}],
  "proposalReadiness": "ready|gaps_noted|missing_critical",
  "readinessNote": "1-2 sentences on whether Shea has enough to write a proposal"
}
Flag conflicts honestly. Missing input is expected and normal.`,
      }],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<MergedReview>;
    const tokensUsed = completion.usage?.total_tokens ?? 0;
    return {
      review: {
        overview:           raw.overview           ?? fallback.overview,
        byDepartment:       raw.byDepartment       ?? fallback.byDepartment,
        conflicts:          raw.conflicts          ?? [],
        missingInput:       raw.missingInput       ?? fallback.missingInput,
        proposalReadiness:  raw.proposalReadiness  ?? fallback.proposalReadiness,
        readinessNote:      raw.readinessNote      ?? fallback.readinessNote,
      },
      tokensUsed,
    };
  } catch {
    return { review: fallback, tokensUsed: 0 };
  }
}

function buildFallbackMergedReview(companyName: string, submissions: MemberSubmission[]): MergedReview {
  const roles = submissions.map((s) => s.memberRole);
  const hasConflict = submissions.length > 1;
  return {
    overview: `${companyName} has provided input from ${submissions.length} contributor${submissions.length !== 1 ? "s" : ""} covering ${roles.join(", ")}. Full review pending Grok generation.`,
    byDepartment: submissions.map((s) => ({
      department: s.memberRole.replace("_", " "),
      findings: [`${s.memberName ?? "Contributor"} completed ${s.answers.length} questions.`],
      owner: s.memberRole,
    })),
    conflicts: hasConflict ? [{ topic: "Cross-department alignment", description: "Review individual submissions for potential conflicts.", members: roles }] : [],
    missingInput: [],
    proposalReadiness: "gaps_noted",
    readinessNote: "Shea can review individual submissions and proceed with a proposal at any time.",
  };
}

// ── Proposal signers per module ───────────────────────────────────────────────

export interface ModuleSigner {
  module: string;
  ownerRole: string;
  ownerName: string | null;
  ownerEmail: string | null;
  approverRole: string | null;
  approverName: string | null;
  approverEmail: string | null;
  needsApproverSignature: boolean;
}

export async function generateProposalSigners(
  companyName: string,
  members: Array<{ role: string; name: string | null; email: string | null; decisionAuthority?: string | null }>,
  scopeItems: string[],
): Promise<{ signers: ModuleSigner[]; tokensUsed: number }> {
  const llm = getClient();

  const memberSummary = members.map((m) =>
    `${m.role} (${m.name ?? "—"}, ${m.email ?? "—"}): authority=${m.decisionAuthority ?? "unknown"}`
  ).join("\n");

  if (!llm || members.length === 0) {
    return { signers: buildFallbackSigners(members, scopeItems), tokensUsed: 0 };
  }

  try {
    const completion = await llm.chat.completions.create({
      model: GROK_MODEL,
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `For ${companyName}, determine who owns and approves each scope module.

Engagement members:
${memberSummary}

Scope items:
${scopeItems.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Return ONLY valid JSON:
{"signers":[{"module":"Lead follow-up workflow","ownerRole":"sales","ownerName":"...","ownerEmail":"...","approverRole":"owner","approverName":"...","approverEmail":"...","needsApproverSignature":true}]}`,
      }],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as { signers?: ModuleSigner[] };
    return { signers: raw.signers ?? buildFallbackSigners(members, scopeItems), tokensUsed: completion.usage?.total_tokens ?? 0 };
  } catch {
    return { signers: buildFallbackSigners(members, scopeItems), tokensUsed: 0 };
  }
}

function buildFallbackSigners(
  members: Array<{ role: string; name: string | null; email: string | null; decisionAuthority?: string | null }>,
  scopeItems: string[],
): ModuleSigner[] {
  const owner = members.find((m) => m.role === "owner") ?? members[0];
  const approver = members.find((m) => m.decisionAuthority === "full" && m.role !== "owner") ?? null;
  return scopeItems.map((item) => ({
    module:                item,
    ownerRole:             owner?.role ?? "owner",
    ownerName:             owner?.name ?? null,
    ownerEmail:            owner?.email ?? null,
    approverRole:          approver?.role ?? null,
    approverName:          approver?.name ?? null,
    approverEmail:         approver?.email ?? null,
    needsApproverSignature: !!approver,
  }));
}
