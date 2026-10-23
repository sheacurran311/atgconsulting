/**
 * LLM layer — provider-agnostic via OpenAI-compatible API.
 * Produces TWO separate outputs from every intake:
 *
 *  1. ClientSnapshot — what the client sees (short, no implementation details).
 *     Strictly: readiness level + 2-3 focus areas (one-line each) + CTA.
 *     The LLM is explicitly forbidden from including workflows, tools, or steps.
 *
 *  2. AdminPreCallReport — full internal report for Shea only.
 *     Situation, pains, opportunities with concrete solution ideas, objections,
 *     call agenda, discovery questions, risks, scope, next steps.
 *
 * Without an API key (or on error), both fall back to deterministic templates.
 *
 * Providers: set OPENAI_API_KEY, XAI_API_KEY, or LLM_API_KEY + LLM_BASE_URL.
 * Model: LLM_MODEL (default: gpt-4o-mini). 20-second timeout.
 */

import OpenAI from "openai";
import { sanitiseText, promptSafe } from "./sanitize";

// ── Types ────────────────────────────────────────────────────────────────────

export interface FocusArea {
  area: "executive_assistant" | "marketing" | "sales" | "customer_support";
  name: string;
  whyItMatters: string; // one line — why THIS person would save time here
}

/** What the client sees after their intake. Keep it short and human. */
export interface ClientSnapshot {
  aiReadinessLabel: string;  // e.g. "Early Explorer"
  aiReadinessSummary: string; // 2-3 plain sentences. No jargon. No tools.
  focusAreas: FocusArea[];   // 2-3 areas max. ONE LINE each. No how-to.
  recommendedTier: "self_serve" | "guided" | "done_for_you";
  tierRationale: string;     // 1-2 sentences. No implementation detail.
  ctaText: string;           // Strong "Book your 1:1 with Shea" CTA, 15-30 words.
  source: "LLM" | "TEMPLATE";
}

export interface OpportunityArea {
  area: string;
  title: string;
  estimatedTimeSavedHrsPerWeek: number;
  situationNote: string;  // what Shea observed from the intake
  solutionIdeas: string[]; // concrete things Shea could build/propose
  toolOptions: string[];   // specific tools that fit this client
}

/** Full internal report. Shown only to admins. Never sent to clients. */
export interface AdminPreCallReport {
  intakeSummary: string;
  situationAndPains: string;
  aiReadinessAssessment: string; // with reasoning from their answers
  opportunityAreas: OpportunityArea[];
  likelyObjections: string[];
  callAgenda: string[];          // ordered agenda for the 1:1 call
  talkingPoints: string[];
  discoveryQuestions: string[];
  recommendedTier: "self_serve" | "guided" | "done_for_you";
  recommendedScope: string;      // what the engagement would look like
  risks: string[];               // red flags or complexity issues
  nextSteps: string[];
  source: "LLM" | "TEMPLATE";
}

// ── Client ────────────────────────────────────────────────────────────────────

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.XAI_API_KEY ?? process.env.LLM_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: process.env.LLM_BASE_URL, timeout: 20_000 });
}

const MODEL = process.env.LLM_MODEL ?? "gpt-4o-mini";

// ── Labels ────────────────────────────────────────────────────────────────────

const AI_READINESS_LABELS = [
  "AI Newcomer",          // 0 — never used AI tools
  "Curious Explorer",     // 1 — asks ChatGPT occasionally
  "Regular User",         // 2 — uses AI weekly for work
  "Active Builder",       // 3 — has built a few automations
  "AI-Native Operator",   // 4 — runs agents daily
] as const;

const AREA_NAMES: Record<string, string> = {
  executive_assistant: "Executive assistant",
  marketing: "Marketing",
  sales: "Sales",
  customer_support: "Customer support",
};

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildContext(intake: IntakeInput): string {
  return `
Name: ${promptSafe(intake.name, "name")}
Role: ${promptSafe(intake.role, "role")}
Industry: ${promptSafe(intake.industry, "industry")}
Business size: ${intake.bizSize}
Areas wanting help: ${intake.areas.map((a) => AREA_NAMES[a] ?? a).join(", ")}
AI comfort (0–4): ${intake.aiComfort} — ${AI_READINESS_LABELS[intake.aiComfort] ?? "unknown"}
Tools used today: ${intake.tools.join(", ") || "none listed"}
Biggest time sinks: ${intake.timeSinks.join(", ") || "not specified"}
Hours/week lost to repetitive work: ${intake.hoursLost}
Preferred way to get help: ${intake.helpStyle}
${intake.automateFirst ? `Would first automate: ${promptSafe(intake.automateFirst, "automate_first")}` : ""}
${intake.freeText ? `Additional context: ${promptSafe(intake.freeText, "free_text")}` : ""}`.trim();
}

const CLIENT_SYSTEM_PROMPT = `You are Shea Curran, founder of ATG Consulting. A prospective client just completed an intake form. Write a short, warm, human snapshot of where they are and how you can help.

STRICT RULES — violating any of these is a critical error:
- Do NOT include any implementation steps, workflows, tool setup instructions, or "how-to" content.
- Do NOT name specific AI tools or apps (no "ChatGPT", "Zapier", "Notion", etc.) in the client output.
- Do NOT describe what any automation would do step by step.
- Keep it under 200 words total.
- Use plain language — no jargon, no acronyms.
- The tone is warm, direct, and confident. This is a human-led service.
- ATG's differentiator is a HUMAN-DESIGNED, tailored solution for the client's specific life and business, set up and run FOR them by Shea. Not a course. Not a tool.

Return ONLY valid JSON. No markdown, no prose outside JSON.`;

const CLIENT_OUTPUT_SCHEMA = `{
  "aiReadinessLabel": string,     // 2-3 words: e.g. "Curious Explorer"
  "aiReadinessSummary": string,   // 2-3 sentences: where they are TODAY. No tools. No steps.
  "focusAreas": [                 // 2-3 areas max. EXACTLY one sentence each for whyItMatters.
    { "area": "sales"|"marketing"|"executive_assistant"|"customer_support",
      "name": string,
      "whyItMatters": string }    // ONE LINE. Why THIS person specifically. No how-to.
  ],
  "recommendedTier": "self_serve"|"guided"|"done_for_you",
  "tierRationale": string,        // 1-2 sentences. Why this tier. No implementation detail.
  "ctaText": string               // 15-30 words. Strong, personal CTA to book a 1:1 with Shea.
}`;

const ADMIN_SYSTEM_PROMPT = `You are preparing a confidential pre-call intelligence report for Shea Curran (ATG Consulting founder) to use before her 1:1 consultation with a prospective client. This report is for Shea's eyes only — it will never be shown to the client.

Be specific, opinionated, and actionable. Shea is an expert at identifying where AI workflows can transform a small business or solopreneur's daily life. She delivers human-designed, tailored solutions — not generic courses or off-the-shelf tools.

Return ONLY valid JSON. No markdown, no prose outside JSON.`;

const ADMIN_OUTPUT_SCHEMA = `{
  "intakeSummary": string,           // 3-5 sentences: who this person is and what they said
  "situationAndPains": string,       // inferred deeper pains and root causes beyond what they stated
  "aiReadinessAssessment": string,   // readiness level with specific reasoning from their answers
  "opportunityAreas": [
    {
      "area": string,
      "title": string,
      "estimatedTimeSavedHrsPerWeek": number,
      "situationNote": string,       // what the intake reveals about this pain
      "solutionIdeas": string[],     // concrete things Shea could build or propose
      "toolOptions": string[]        // specific tools that fit this client's stack and comfort level
    }
  ],                                  // ranked by estimated time saved, most impactful first
  "likelyObjections": string[],      // objections they may raise on the call
  "callAgenda": string[],            // ordered agenda for the 1:1 call
  "talkingPoints": string[],         // key things Shea should say
  "discoveryQuestions": string[],    // questions to ask to deepen understanding
  "recommendedTier": "self_serve"|"guided"|"done_for_you",
  "recommendedScope": string,        // what the engagement would look like in plain terms
  "risks": string[],                 // red flags, complexity issues, or reasons it might not work
  "nextSteps": string[]              // suggested next steps after the call
}`;

// ── Generate both outputs ────────────────────────────────────────────────────

export interface IntakeInput {
  name: string;
  email: string;
  role: string;
  industry: string;
  bizSize: string;
  areas: string[];
  aiComfort: number;
  tools: string[];
  timeSinks: string[];
  automateFirst?: string;
  hoursLost: number;
  helpStyle: string;
  freeText?: string;
}

export interface LLMResult {
  clientSnapshot: ClientSnapshot;
  adminReport: AdminPreCallReport;
}

export async function generateBothOutputs(intake: IntakeInput): Promise<LLMResult> {
  const client = getClient();
  const context = buildContext(intake);

  if (!client) {
    return {
      clientSnapshot: buildTemplateClientSnapshot(intake),
      adminReport: buildTemplateAdminReport(intake),
    };
  }

  // Run both calls in parallel
  const [snapshotResult, reportResult] = await Promise.allSettled([
    callLLM<ClientSnapshot>(client, CLIENT_SYSTEM_PROMPT, `${context}\n\nOutput schema:\n${CLIENT_OUTPUT_SCHEMA}`),
    callLLM<AdminPreCallReport>(client, ADMIN_SYSTEM_PROMPT, `${context}\n\nOutput schema:\n${ADMIN_OUTPUT_SCHEMA}`),
  ]);

  return {
    clientSnapshot:
      snapshotResult.status === "fulfilled"
        ? { ...snapshotResult.value, source: "LLM" }
        : buildTemplateClientSnapshot(intake),
    adminReport:
      reportResult.status === "fulfilled"
        ? { ...reportResult.value, source: "LLM" }
        : buildTemplateAdminReport(intake),
  };
}

async function callLLM<T>(client: OpenAI, system: string, user: string): Promise<T> {
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    max_tokens: 1200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return JSON.parse(completion.choices[0]?.message?.content ?? "{}") as T;
}

// ── Template fallbacks ───────────────────────────────────────────────────────

function buildTemplateClientSnapshot(intake: IntakeInput): ClientSnapshot {
  const label = AI_READINESS_LABELS[intake.aiComfort] ?? "Explorer";
  const firstName = intake.name.split(" ")[0] ?? intake.name;

  const summaries: Record<number, string> = {
    0: `${firstName}, you're at the very beginning of your AI journey — and that's exactly where Shea starts with most clients. You don't need to know anything about AI; that's her job.`,
    1: `${firstName}, you've dipped your toes in — and now it's time to turn those one-off experiments into something that actually runs your business. That's what Shea builds.`,
    2: `${firstName}, you're already getting value from AI weekly. Shea will take that foundation and build a tailored system around your specific role and business.`,
    3: `${firstName}, you've built automations before. Shea will go deeper — designing a connected system that fits your specific life, clients, and industry.`,
    4: `${firstName}, you're already running agents. Shea will focus on the gaps, the integration points, and the parts that are still manual — and design a solution that fits your exact context.`,
  };

  const focusAreas: FocusArea[] = intake.areas.slice(0, 3).map((a) => ({
    area: a as FocusArea["area"],
    name: AREA_NAMES[a] ?? a,
    whyItMatters: buildAreaWhy(a, intake),
  }));

  const recommendedTier: ClientSnapshot["recommendedTier"] =
    intake.helpStyle === "done_for_you" || intake.aiComfort <= 1
      ? "done_for_you"
      : intake.helpStyle === "self_serve" && intake.aiComfort >= 3
      ? "self_serve"
      : "guided";

  return {
    aiReadinessLabel: label,
    aiReadinessSummary: summaries[intake.aiComfort] ?? summaries[1]!,
    focusAreas,
    recommendedTier,
    tierRationale: buildTierRationale(recommendedTier, intake),
    ctaText: `Book your free 1:1 with Shea — she'll review your answers and map out exactly what a tailored setup would look like for your ${intake.industry} business.`,
    source: "TEMPLATE",
  };
}

function buildAreaWhy(area: string, intake: IntakeInput): string {
  const map: Record<string, string> = {
    sales: `With ${intake.hoursLost}+ hours a week going to repetitive work, a tailored sales system would put prospecting and follow-up on autopilot.`,
    marketing: `A human-designed content and campaign system would free you from the grind while keeping everything on-brand.`,
    executive_assistant: `Inbox, scheduling, and logistics are the biggest hidden time drains — the right setup changes your whole day.`,
    customer_support: `Faster, more consistent responses without spending more time: that's what a tailored support system delivers.`,
  };
  return map[area] ?? `This area is a high-impact opportunity given what you shared about your role.`;
}

function buildTierRationale(tier: ClientSnapshot["recommendedTier"], intake: IntakeInput): string {
  if (tier === "done_for_you") return `Given your comfort level and preference, Shea would design and deliver everything — you just show up to the handoff call.`;
  if (tier === "self_serve") return `You have the confidence to run with the right framework. Shea will give you the templates and a clear plan.`;
  return `Working together in live sessions is the fastest way to get a real system built around your specific situation.`;
}

function buildTemplateAdminReport(intake: IntakeInput): AdminPreCallReport {
  const firstName = intake.name.split(" ")[0] ?? intake.name;
  return {
    intakeSummary: `${intake.name} is a ${intake.role} in the ${intake.industry} industry with a ${intake.bizSize}-person business. They selected ${intake.areas.map((a) => AREA_NAMES[a] ?? a).join(" and ")} as their priority areas and estimate losing ~${intake.hoursLost} hours/week to repetitive work. They prefer a ${intake.helpStyle} engagement style.`,
    situationAndPains: `Their top time sinks (${intake.timeSinks.slice(0, 3).join(", ")}) suggest they're in a manual execution loop with no systematic delegation. At ${intake.bizSize} team size, every hour lost is directly Shea's opportunity to quantify ROI. Their AI comfort level (${intake.aiComfort}/4) means ${intake.aiComfort <= 1 ? "we need to lead with simplicity and outcome, not technology" : "we can move faster and discuss tools directly"}.`,
    aiReadinessAssessment: `Comfort level ${intake.aiComfort}/4 (${AI_READINESS_LABELS[intake.aiComfort]}). ${intake.tools.includes("none") || intake.tools.length === 0 ? "No current AI tool usage — start from scratch." : `Currently using: ${intake.tools.join(", ")}.`} ${intake.automateFirst ? `Their instinct to automate "${intake.automateFirst}" is a strong signal of readiness.` : "No clear automation instinct stated yet — probe for one on the call."}`,
    opportunityAreas: intake.areas.slice(0, 4).map((a, i) => ({
      area: a,
      title: AREA_NAMES[a] ?? a,
      estimatedTimeSavedHrsPerWeek: Math.round((intake.hoursLost / intake.areas.length) * 0.6),
      situationNote: `Client flagged this as a priority area with ${intake.timeSinks.filter((s) => getAreaSinks(a).includes(s)).join(", ") || "general workflow"} as key pain points.`,
      solutionIdeas: getAreaSolutionIdeas(a, intake),
      toolOptions: getAreaToolOptions(a, intake),
    })),
    likelyObjections: [
      "\"I don't have time to learn new tools\"",
      "\"I've tried this before and it didn't stick\"",
      "\"I'm not sure how much this will actually save me\"",
      intake.bizSize === "solo" ? "\"I can't afford it right now\"" : "\"My team won't adopt it\"",
    ],
    callAgenda: [
      "5 min — Welcome and confirm their goals",
      "10 min — Walk through their intake answers and clarify pains",
      "15 min — Present opportunity areas and get reactions",
      "10 min — Walkthrough of what a tailored setup would look like",
      "10 min — Discuss recommended tier and investment",
      "5 min — Next steps and scheduling",
      "5 min — Q&A",
    ],
    talkingPoints: [
      `They're losing ~${intake.hoursLost} hrs/week — at even $50/hr that's $${intake.hoursLost * 50 * 52 / 1000}k/year in hidden cost.`,
      "ATG's differentiator: a human-designed system built around your specific life, clients, and industry — not a generic tool or course.",
      "You don't need to become an AI expert. Shea handles the setup and runs it for you.",
      `Their comfort level (${intake.aiComfort}/4) means we ${intake.aiComfort <= 1 ? "keep it simple and outcome-focused" : "can move quickly into tool discussions"}.`,
    ],
    discoveryQuestions: [
      "Walk me through a typical Monday morning — what's the first thing that makes you feel behind?",
      `You mentioned losing ${intake.hoursLost} hours a week — what does that cost you in stress, not just time?`,
      `You said you'd automate "${intake.automateFirst ?? "something"}" first — tell me more about why that one.`,
      "What has to be perfect before you'd trust a system to handle it?",
      "What happened the last time you tried to systematize something in your business?",
    ],
    recommendedTier: buildTemplateClientSnapshot(intake).recommendedTier,
    recommendedScope: `${intake.helpStyle === "done_for_you" ? "White Glove" : intake.helpStyle === "guided" ? "Guided (1:1 or cohort)" : "Self-serve with Guided upgrade path"}: focus on ${intake.areas.slice(0, 2).map((a) => AREA_NAMES[a] ?? a).join(" and ")} first. Estimated ${intake.aiComfort <= 1 ? "4-6 weeks" : "2-4 weeks"} to first working system.`,
    risks: [
      intake.aiComfort <= 1 ? "Low AI comfort — may need more hand-holding than expected" : "Higher comfort may create scope creep (\"can we also add...\").",
      intake.bizSize === "solo" ? "Solo operator — budget sensitivity is real; be ready with ROI numbers." : "Multi-person team — adoption and change management may be a factor.",
      "If they've had a bad experience with AI tools before, address it head-on early.",
    ],
    nextSteps: [
      "Send a calendar invite for the consultation",
      "Prepare a 1-page tailored proposal based on their intake",
      "Identify 1 quick win to show them in the first call",
      "Review any industry-specific context before the call",
    ],
    source: "TEMPLATE",
  };
}

function getAreaSinks(area: string): string[] {
  const map: Record<string, string[]> = {
    executive_assistant: ["email", "scheduling", "admin", "personal_logistics"],
    marketing: ["social_content", "research", "email", "proposals"],
    sales: ["prospecting", "followups", "research", "proposals", "email"],
    customer_support: ["email", "followups", "research"],
  };
  return map[area] ?? [];
}

function getAreaSolutionIdeas(area: string, intake: IntakeInput): string[] {
  const map: Record<string, string[]> = {
    executive_assistant: ["AI inbox triage and draft replies", "Automated calendar management", "Smart meeting notes and action item capture", "Travel and logistics coordination workflow"],
    marketing: ["Content repurposing pipeline (one piece → multiple formats)", "AI-drafted email campaigns with brand voice", "Competitor and market research digest", "SEO content brief generator"],
    sales: [`Automated prospect list for ${intake.industry}`, "First-touch outreach in their voice", "Follow-up sequence and nudge system", "CRM auto-logging and deal tracking"],
    customer_support: ["FAQ-powered first-response drafts", "Ticket triage and prioritization", "Customer sentiment and feedback digest", "Help doc generator from conversations"],
  };
  return map[area] ?? ["Custom workflow to be defined on the call"];
}

function getAreaToolOptions(area: string, intake: IntakeInput): string[] {
  const hasGPT = intake.tools.includes("chatgpt");
  const hasClaude = intake.tools.includes("claude");
  const hasZapier = intake.tools.includes("zapier_make");
  const hasCRM = intake.tools.includes("crm");

  const base: Record<string, string[]> = {
    executive_assistant: ["ChatGPT or Claude for drafts", "Zapier/Make for automation triggers", "Google Calendar + AI scheduling"],
    marketing: ["Claude for brand voice", "ChatGPT for research and ideation", "Buffer/Hootsuite + AI scheduling"],
    sales: [hasCRM ? "Existing CRM + AI enrichment" : "HubSpot or Airtable as lightweight CRM", "Clay or Apollo for prospecting", "ChatGPT or Claude for outreach drafts"],
    customer_support: ["Intercom or Freshdesk + AI", "ChatGPT for reply drafts", "Zapier/Make for ticket routing"],
  };

  const tools = base[area] ?? [];
  if (hasGPT && !tools.some((t) => t.includes("ChatGPT"))) tools.unshift("ChatGPT (already using)");
  if (hasClaude && !tools.some((t) => t.includes("Claude"))) tools.unshift("Claude (already using)");
  if (hasZapier) tools.push("Zapier/Make (already using — extend it)");
  return tools;
}
