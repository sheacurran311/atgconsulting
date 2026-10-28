/**
 * Discovery intake AI functions.
 *
 * nextQuestion()       — pick the next 1–3 adaptive questions (Grok)
 * extractFromDocument()— extract structured Q&A from pasted text/PDF (Grok)
 * generateReportDraft()— create a tailored report draft (Grok, admin-only)
 *
 * Cost controls:
 *   AI_CAP_INTAKE — per-session token cap (default 60 000)
 *   global AI_ASSIST_ENABLED kill switch respected
 *   rate limiting is handled at the route level
 */

import OpenAI from "openai";
import { getGrokClient, GROK_MODEL, GROK_VISION_MODEL, logFallback } from "./grokClient";
import {
  QUESTION_BANK, CORE_QUESTIONS, FALLBACK_ORDER, CATEGORY_LABELS,
  QUESTION_MAP, type Question,
} from "./questionBank";

export interface AnsweredQuestion {
  id: string;
  category: string;
  question: string;
  answer: string;
}

/** An AI-generated follow-up question (not from the bank). */
export interface GeneratedQuestion {
  id: string;     // synthetic ID: "gq_<slug>"
  category: string;
  text: string;
  type: "text" | "choice" | "multiselect";
  options?: string[];
  generated: true; // flags it as AI-generated, not from bank
}

export interface NextQuestionResult {
  nextIds: string[];                 // IDs from the bank to ask next (1–3)
  generatedQuestions?: GeneratedQuestion[]; // 0–2 Grok-authored follow-ups
  done: boolean;
  tokensUsed: number;
  fromCache?: boolean;
  fromFallback?: boolean;
}

export interface ReportDraft {
  summary: string;
  keyFindings: string[];
  painPoints: string[];
  recommendedWorkflows: { slug: string; name: string; why: string }[];
  suggestedTier: "SELF_SERVE" | "GUIDED" | "WHITE_GLOVE";
  tierRationale: string;
  proposalScope: string;
  discoveryQuestions: string[];  // follow-up questions for the live call
  risks: string[];
  nextSteps: string[];
}

const AI_CAP_INTAKE = parseInt(process.env.AI_CAP_INTAKE ?? "60000", 10);

function getClient(): OpenAI | null {
  
  return getGrokClient();
}

function isEnabled(): boolean {
  return process.env.AI_ASSIST_ENABLED !== "false"; // default on for discovery
}

// ── Coverage map ──────────────────────────────────────────────────────────────

function buildCoverageMap(answered: AnsweredQuestion[]): Record<string, number> {
  const coverage: Record<string, number> = {};
  for (const a of answered) {
    const q = QUESTION_MAP[a.id];
    if (q) coverage[q.category] = (coverage[q.category] ?? 0) + 1;
  }
  return coverage;
}

function answeredIds(answered: AnsweredQuestion[]): Set<string> {
  return new Set(answered.map((a) => a.id));
}

// ── Next question (adaptive) ──────────────────────────────────────────────────

export async function nextQuestion(
  answered: AnsweredQuestion[],
  sessionTokensUsed: number,
): Promise<NextQuestionResult> {
  const done = answered.length >= 25;
  if (done) return { nextIds: [], done: true, tokensUsed: 0 };

  const alreadyAnswered = answeredIds(answered);
  const available = QUESTION_BANK.filter((q) => !alreadyAnswered.has(q.id));
  if (available.length === 0) return { nextIds: [], done: true, tokensUsed: 0 };

  // Token cap or kill-switch → fallback order
  const overCap = sessionTokensUsed >= AI_CAP_INTAKE;
  const llm = isEnabled() && !overCap ? getClient() : null;

  if (!llm) {
    return fallbackNextQuestion(answered, alreadyAnswered);
  }

  const coverage = buildCoverageMap(answered);
  const coveredCategories = Object.keys(coverage);

  // Summarise answered Q&A for the prompt (truncated to save tokens)
  const qaSummary = answered.slice(-10).map((a) =>
    `Q(${a.category}): ${a.question.slice(0, 80)}\nA: ${a.answer.slice(0, 120)}`
  ).join("\n\n");

  // List available questions by category
  const availableSummary = Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
    const qs = available.filter((q) => q.category === cat);
    if (qs.length === 0) return null;
    return `${label} [${cat}]:\n${qs.map((q) => `  - id:${q.id} "${q.text.slice(0, 80)}"`).join("\n")}`;
  }).filter(Boolean).join("\n\n");

  // Last answered Q&A (the most recent answer to ground new follow-ups)


  const prompt = `You are helping run an ATG Consulting discovery intake for a prospect.
Questions answered so far: ${answered.length} / ~20 total target.
Covered categories: ${coveredCategories.join(", ") || "none yet"}
Uncovered categories: ${Object.keys(CATEGORY_LABELS).filter((c) => !coveredCategories.includes(c)).join(", ")}

Recent Q&A:
${qaSummary || "(none yet)"}

Available bank questions:
${availableSummary}

Your job:
1. Select 1–3 question IDs from the bank that best continue the conversation.
2. Optionally write 0–2 NEW follow-up questions grounded in the LATEST ANSWER (not in the bank).
   New questions must be short (<= 120 chars), relevant to what the prospect just said, and add
   information not covered by the bank. Valid types: text, choice, multiselect.
   For choice/multiselect include 2–5 short options.
3. If critical categories are covered and answers are detailed, set done=true.

Critical categories: company, authority, systems, alerts, sales, invoicing, ai_tools, goals.

Return ONLY valid JSON:
{
  "nextIds": ["id1"],
  "generatedQuestions": [
    {"id":"gq_erp_vendor","category":"systems","text":"Which ERP vendor are you using?","type":"choice","options":["SAP","NetSuite","QuickBooks","Other"]}
  ],
  "done": false
}
If no new questions, set generatedQuestions to [].`;

  try {
    const completion = await llm.chat.completions.create({
      model: GROK_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as {
      nextIds?: string[];
      generatedQuestions?: Array<{ id?: string; category?: string; text?: string; type?: string; options?: string[] }>;
      done?: boolean;
    };
    const tokensUsed = completion.usage?.total_tokens ?? 0;

    const nextIds = (raw.nextIds ?? [])
      .filter((id): id is string => typeof id === "string" && QUESTION_MAP[id] !== undefined && !alreadyAnswered.has(id))
      .slice(0, 3);

    // Validate and sanitize generated questions
    const MAX_NEW = 2;
    const generatedQuestions: GeneratedQuestion[] = (raw.generatedQuestions ?? [])
      .filter((q) =>
        q.text && q.text.length >= 10 && q.text.length <= 200 &&
        q.category && ["text", "choice", "multiselect"].includes(q.type ?? "") &&
        !(q.id && alreadyAnswered.has(q.id)) // never repeat
      )
      .slice(0, MAX_NEW)
      .map((q, i) => ({
        id: q.id ?? `gq_${Date.now()}_${i}`,
        category: q.category ?? "general",
        text: q.text!,
        type: (q.type ?? "text") as "text" | "choice" | "multiselect",
        options: Array.isArray(q.options) ? q.options.slice(0, 5).filter((o) => typeof o === "string") : undefined,
        generated: true as const,
      }));

    if (nextIds.length === 0 && generatedQuestions.length === 0 && !raw.done) {
      logFallback("nextQuestion", "empty_response");
      return fallbackNextQuestion(answered, alreadyAnswered);
    }
    return { nextIds, generatedQuestions, done: raw.done ?? false, tokensUsed };
  } catch (err) {
    logFallback("nextQuestion", "llm_error", err instanceof Error ? err.message : String(err));
    return fallbackNextQuestion(answered, alreadyAnswered);
  }
}


function fallbackNextQuestion(answered: AnsweredQuestion[], alreadyAnswered: Set<string>): NextQuestionResult {
  const nextId = FALLBACK_ORDER.find((id) => !alreadyAnswered.has(id));
  return {
    nextIds: nextId ? [nextId] : [],
    done: !nextId,
    tokensUsed: 0,
    fromFallback: true,
  };
}

// ── Extract from document ─────────────────────────────────────────────────────

export interface ExtractResult {
  answers: AnsweredQuestion[];
  gapIds: string[];   // question IDs not covered by the pasted doc
  tokensUsed: number;
}

export async function extractFromDocument(text: string): Promise<ExtractResult> {
  const llm = getClient();
  const truncated = text.slice(0, 8000);

  if (!llm || !isEnabled()) {
    return { answers: [], gapIds: FALLBACK_ORDER.slice(0, 8), tokensUsed: 0 };
  }

  const questionList = QUESTION_BANK.slice(0, 30).map((q) =>
    `id:${q.id} [${q.category}] "${q.text.slice(0, 80)}"`
  ).join("\n");

  const prompt = `Extract structured answers from this ATG Consulting discovery questionnaire response.
Map the content to known question IDs where possible.

Question IDs to attempt to fill:
${questionList}

Document text:
---
${truncated}
---

Return ONLY valid JSON:
{
  "answers": [
    {"id":"question_id","category":"cat","question":"exact question text","answer":"extracted answer"},
    ...
  ],
  "gapIds": ["id1","id2"]
}
Only include questions that are actually answered in the text.
gapIds should list critical question IDs NOT found in the document.`;

  try {
    const completion = await llm.chat.completions.create({
      model: GROK_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as { answers?: AnsweredQuestion[]; gapIds?: string[] };
    const tokensUsed = completion.usage?.total_tokens ?? 0;
    return {
      answers: (raw.answers ?? []).filter((a) => a.id && a.answer),
      gapIds: raw.gapIds ?? [],
      tokensUsed,
    };
  } catch {
    return { answers: [], gapIds: FALLBACK_ORDER.slice(0, 8), tokensUsed: 0 };
  }
}

// ── Generate report draft (admin only) ───────────────────────────────────────

export async function generateReportDraft(
  answers: AnsweredQuestion[],
  contactName: string,
  companyName: string,
  availableWorkflowSlugs: string[],
): Promise<ReportDraft & { tokensUsed: number }> {
  const fallback = buildFallbackReport(answers, contactName, companyName);
  const llm = getClient();
  if (!llm || !isEnabled()) return { ...fallback, tokensUsed: 0 };

  const qaSummary = answers.map((a) => `[${a.category}] ${a.question}\n→ ${a.answer}`).join("\n\n");
  const workflowList = availableWorkflowSlugs.join(", ");

  const prompt = `You are writing an internal ATG Consulting discovery report draft for Shea Curran.
This is for a prospect named ${contactName} at ${companyName}.

Their discovery answers:
${qaSummary}

Available ATG workflow slugs: ${workflowList}

Write a tailored internal report draft. Include:
- summary: 2-3 sentence plain-English description of the prospect's situation
- keyFindings: array of 3-6 specific observations from the intake
- painPoints: array of their main operational pain points
- recommendedWorkflows: array of {slug, name, why} — pick the most relevant from the list above
- suggestedTier: one of SELF_SERVE, GUIDED, WHITE_GLOVE
- tierRationale: 1-2 sentences explaining the recommendation
- proposalScope: a concise scope statement for the engagement
- discoveryQuestions: 3-5 follow-up questions to ask in the discovery call
- risks: 2-4 potential risks or concerns
- nextSteps: 3-5 concrete next steps

Return ONLY valid JSON matching this schema. No jargon. No invented stats or testimonials.`;

  try {
    const completion = await llm.chat.completions.create({
      model: GROK_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.5,
      response_format: { type: "json_object" },
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<ReportDraft>;
    const tokensUsed = completion.usage?.total_tokens ?? 0;
    return {
      summary:              raw.summary              ?? fallback.summary,
      keyFindings:          raw.keyFindings          ?? fallback.keyFindings,
      painPoints:           raw.painPoints           ?? fallback.painPoints,
      recommendedWorkflows: raw.recommendedWorkflows ?? fallback.recommendedWorkflows,
      suggestedTier:        raw.suggestedTier        ?? fallback.suggestedTier,
      tierRationale:        raw.tierRationale        ?? fallback.tierRationale,
      proposalScope:        raw.proposalScope        ?? fallback.proposalScope,
      discoveryQuestions:   raw.discoveryQuestions   ?? fallback.discoveryQuestions,
      risks:                raw.risks                ?? fallback.risks,
      nextSteps:            raw.nextSteps            ?? fallback.nextSteps,
      tokensUsed,
    };
  } catch {
    return { ...fallback, tokensUsed: 0 };
  }
}

function buildFallbackReport(answers: AnsweredQuestion[], contactName: string, companyName: string): ReportDraft {
  const companyA = answers.find((a) => a.id === "business_type")?.answer ?? "their business";
  const teamA = answers.find((a) => a.id === "team_size")?.answer ?? "a small team";
  const problemsA = answers.find((a) => a.id === "top_problems")?.answer ?? "various operational challenges";
  const systemA = answers.find((a) => a.id === "core_system")?.answer ?? "existing systems";
  const aiA = answers.find((a) => a.id === "ai_tools_today")?.answer ?? "";
  const budgetA = answers.find((a) => a.id === "budget_range")?.answer ?? "to be confirmed";

  const tier: ReportDraft["suggestedTier"] =
    budgetA.includes("15,000") || budgetA.includes("5,000") ? "WHITE_GLOVE" :
    budgetA.includes("2,000") ? "GUIDED" : "SELF_SERVE";

  return {
    summary: `${contactName} runs ${companyA} with ${teamA}. They're looking to address: ${problemsA.slice(0, 200)}.`,
    keyFindings: [
      `Core system: ${systemA.slice(0, 100)}`,
      `Team size: ${teamA}`,
      `Primary problems: ${problemsA.slice(0, 150)}`,
      aiA ? `AI tools today: ${aiA.slice(0, 100)}` : "No AI tools in use currently",
    ],
    painPoints: problemsA.split(/[.,;]/).map((s) => s.trim()).filter((s) => s.length > 10).slice(0, 4),
    recommendedWorkflows: [
      { slug: "follow-up", name: "Lead follow-up", why: "High-frequency task with clear automation potential" },
      { slug: "invoice-triage", name: "Invoice triage", why: "Common bottleneck for small business ops" },
    ],
    suggestedTier: tier,
    tierRationale: `Based on the intake, ${tier === "WHITE_GLOVE" ? "the scope and budget suggest a full Done-for-you engagement" : tier === "GUIDED" ? "Guided sessions would allow hands-on build with appropriate oversight" : "Self-serve is a good starting point"}.`,
    proposalScope: `Initial engagement: assess ${companyA} workflows, deliver a personalised tool plan and setup guides. Recommend 1–2 key workflows for immediate impact.`,
    discoveryQuestions: [
      "Can you walk me through a typical week in detail?",
      `Tell me more about how ${systemA} is used day to day.`,
      "What have you already tried to fix these problems?",
      "Who would own the setup and maintenance on your team?",
    ],
    risks: [
      "System integration complexity unknown until scoped",
      "Team adoption depends on comfort with new tools",
    ],
    nextSteps: [
      "Schedule a 30-minute discovery call with Shea",
      "Share access to a demo environment of the core system (optional)",
      "Confirm the team members who will be involved",
    ],
  };
}

/** Build a text transcript from answered questions. */
export function buildTranscript(answers: AnsweredQuestion[]): string {
  return answers.map((a, i) =>
    `Q${i + 1} [${a.category}]: ${a.question}\nAnswer: ${a.answer}`
  ).join("\n\n");
}
