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
 * Provider: xAI Grok. Set XAI_API_KEY and optionally AI_MODEL_DEFAULT (default: grok-4.7).
 */

import OpenAI from "openai";
import { getGrokClient, GROK_MODEL, GROK_VISION_MODEL, logFallback } from "./grokClient";
import { z } from "zod";
import { prisma } from "./db";

// ── DB-driven template loading ────────────────────────────────────────────────

/**
 * Load the active PromptTemplate from the DB for the given key (plan|digest).
 * Returns null if none found — caller falls back to code-defined string.
 * This fixes the gap where the admin prompt editor never fed llm.ts.
 */
export async function loadActivePrompt(key: string): Promise<string | null> {
  try {
    const t = await prisma.promptTemplate.findFirst({
      where: { key, active: true },
      orderBy: { version: "desc" },
    });
    return t?.body ?? null;
  } catch {
    return null; // DB unavailable — use code default
  }
}

/**
 * Load an enabled WorkflowTemplate by slug.
 * Returns the DB row if it exists and is enabled, otherwise null.
 */
export async function loadWorkflowTemplate(slug: string) {
  try {
    return await prisma.workflowTemplate.findFirst({
      where: { slug, enabled: true },
    });
  } catch {
    return null;
  }
}
import { sanitiseText, sanitiseShortText, promptSafe } from "./sanitize";

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

const getClient = getGrokClient;
const MODEL = GROK_MODEL;

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
    logFallback("generateBothOutputs", "no_api_key");
    return {
      clientSnapshot: buildTemplateClientSnapshot(intake),
      adminReport: buildTemplateAdminReport(intake),
    };
  }

  // Load DB-overridden prompts if admin has edited them; fall back to code defaults.
  const [clientPrompt, adminPrompt] = await Promise.all([
    loadActivePrompt("plan").then((p) => p ?? CLIENT_SYSTEM_PROMPT),
    loadActivePrompt("admin_report").then((p) => p ?? ADMIN_SYSTEM_PROMPT),
  ]);

  // Run both calls in parallel
  const [snapshotResult, reportResult] = await Promise.allSettled([
    callLLM<ClientSnapshot>(client, clientPrompt, `${context}\n\nOutput schema:\n${CLIENT_OUTPUT_SCHEMA}`),
    callLLM<AdminPreCallReport>(client, adminPrompt, `${context}\n\nOutput schema:\n${ADMIN_OUTPUT_SCHEMA}`),
  ]);

  return {
    clientSnapshot:
      snapshotResult.status === "fulfilled"
        ? { ...snapshotResult.value, source: "LLM" }
        : (logFallback("clientSnapshot", "llm_error"), buildTemplateClientSnapshot(intake)),
    adminReport:
      reportResult.status === "fulfilled"
        ? { ...reportResult.value, source: "LLM" }
        : (logFallback("adminReport", "llm_error"), buildTemplateAdminReport(intake)),
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

  // Tier recommendation respects what the user chose.
  // Done-for-you is only suggested when the user is genuinely unsure AND
  // has low AI comfort AND loses significant time (10+ h/wk).
  const recommendedTier: ClientSnapshot["recommendedTier"] = recommendTier(intake);

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

/**
 * Tier recommendation logic — exported for unit testing.
 * Never overrides an explicit user preference.
 */
export function recommendTier(intake: Pick<IntakeInput, "helpStyle" | "aiComfort" | "hoursLost">): ClientSnapshot["recommendedTier"] {
  if (intake.helpStyle === "done_for_you") return "done_for_you";
  if (intake.helpStyle === "guided")        return "guided";
  if (intake.helpStyle === "self_serve")    return "self_serve";
  // "not_sure": suggest done-for-you only for low AI comfort AND high hours lost
  if (intake.aiComfort <= 1 && intake.hoursLost >= 10) return "done_for_you";
  if (intake.aiComfort >= 3) return "self_serve";
  return "guided";
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

// ── Follow-up draft (workbench) ───────────────────────────────────────────────

const FollowUpSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(8000),
});

const FOLLOW_UP_SYSTEM = `You write one follow-up email for a small-business owner to review and copy into their own mail app.

Rules:
- Use only the facts inside the tagged fields. Do not invent dates, amounts, products, meetings, or promises.
- Do not mention AI, models, or that the email was drafted for them.
- No HTML, no tracking, no sign-off that adds facts. If a sender name is provided, you may end with that name.
- Plain language. Return JSON with "subject" and "body" only.`;

export interface FollowUpInput {
  who: string;
  lastTouch: string;
  wantToSay: string;
  senderName: string | null;
}

export async function generateFollowUpDraft(input: FollowUpInput): Promise<{ subject: string; body: string; source: "LLM" | "TEMPLATE" }> {
  const who = sanitiseShortText(input.who);
  const lastTouch = sanitiseText(input.lastTouch, 500);
  const wantToSay = sanitiseText(input.wantToSay, 1000);
  const senderName = input.senderName ? sanitiseShortText(input.senderName) : null;
  const fallback = () => buildTemplateFollowUp({ who, lastTouch, wantToSay, senderName });

  const client = getClient();
  if (!client) return fallback();

  const user = [
    `Recipient: ${promptSafe(who, "who")}`,
    `Last touch (untrusted notes): ${promptSafe(lastTouch, "last_touch")}`,
    `What they want to say (untrusted notes): ${promptSafe(wantToSay, "want_to_say")}`,
    senderName ? `Sender name: ${promptSafe(senderName, "sender")}` : "No sender name was provided. Do not invent one.",
    'Output schema: {"subject": string, "body": string}',
  ].join("\n");

  try {
    const raw = await callLLM<unknown>(client, FOLLOW_UP_SYSTEM, user);
    const parsed = FollowUpSchema.safeParse(raw);
    if (!parsed.success) return fallback();
    return { subject: parsed.data.subject, body: parsed.data.body, source: "LLM" };
  } catch {
    return fallback();
  }
}

function buildTemplateFollowUp(input: { who: string; lastTouch: string; wantToSay: string; senderName: string | null }): { subject: string; body: string; source: "TEMPLATE" } {
  const sign = input.senderName ? `\n\n${input.senderName}` : "";
  return {
    subject: "Following up",
    body: `Hi ${input.who},\n\n${input.wantToSay}\n\nLast time: ${input.lastTouch}${sign}`,
    source: "TEMPLATE",
  };
}

// ── Tool plan generation ──────────────────────────────────────────────────────

export interface ToolRecommendation {
  name: string;       // tool name
  slug?: string;      // Tool DB slug for /go/:slug links (populated when tool is in the DB)
  why: string;        // one sentence: why this tool for their situation
  costNote: string;   // "check current pricing" or "free tier available" – never invented numbers
}

export interface SetupStep {
  order: number;
  title: string;
  detail: string; // plain language, no jargon
}

export interface ToolPlanOutput {
  tools: ToolRecommendation[];
  steps: SetupStep[];
  source: "LLM" | "TEMPLATE";
}

export interface ToolPlanInput {
  industry: string;
  areas: string[];
  aiComfort: number;
  toolBudget?: string;       // e.g. "<$50/mo"
  currentSoftware?: string;  // existing tools by name
  weeklyVolumes?: string;    // e.g. "10-50 leads/wk"
  timeSinks: string[];
  aiPlatforms?: string[];    // e.g. ["grok_bot", "claude"]
}

const ToolPlanSchema = z.object({
  tools: z.array(z.object({
    name:     z.string().min(1).max(100),
    slug:     z.string().max(80).optional(), // Tool DB slug for /go/:slug links
    why:      z.string().min(1).max(300),
    costNote: z.string().min(1).max(200),
  })).min(1).max(8),
  steps: z.array(z.object({
    order:  z.number().int().min(1),
    title:  z.string().min(1).max(150),
    detail: z.string().min(1).max(400),
  })).min(1).max(10),
});

const TOOL_PLAN_SYSTEM = `You write a personalised tool plan for a small-business owner who is NOT technical.
Your plan recommends specific software tools and ordered setup steps.

Rules:
- Recommend 3–6 tools, each with a plain-language reason and a cost note. Never invent prices; say "check current pricing" or "has a free tier" or "typically $X–Y/mo range — verify on their site".
- Write 4–8 ordered setup steps in plain English. No jargon. No "agentic", "LLM", "RAG".
- Build on software they already use if provided.
- Respect their budget band. If budget is low (<$50/mo), prefer free tools.
- Do NOT include implementation steps that require coding.
- Return ONLY valid JSON, no prose outside JSON.`;

function buildToolPlanPrompt(input: ToolPlanInput): string {
  const lines: string[] = [
    `Industry: ${promptSafe(input.industry, "industry")}`,
    `Areas needing help: ${input.areas.join(", ")}`,
    `AI comfort (0–4): ${input.aiComfort}`,
    `Monthly tool budget: ${input.toolBudget ?? "not stated"}`,
    `Current software: ${input.currentSoftware ? promptSafe(input.currentSoftware, "software") : "none stated"}`,
    `Weekly volumes: ${input.weeklyVolumes ?? "not stated"}`,
    `Biggest time sinks: ${input.timeSinks.slice(0, 4).join(", ")}`,
  ];
  return `Generate a personalised tool plan:\n${lines.join("\n")}\n\nOutput schema:\n{"tools":[{"name","why","costNote"}],"steps":[{"order","title","detail"}]}`;
}

function buildTemplatePlan(input: ToolPlanInput): ToolPlanOutput {
  const isLowBudget = input.toolBudget?.startsWith("<") ?? false;
  const areas = input.areas;

  const tools: ToolRecommendation[] = [];
  if (areas.includes("sales") || areas.includes("executive_assistant")) {
    tools.push({ name: isLowBudget ? "HubSpot CRM (free tier)" : "HubSpot or Pipedrive", why: "Tracks your contacts and follow-ups so nothing slips.", costNote: "Free tier available (HubSpot) — check current pricing for upgrades." });
  }
  if (areas.includes("marketing")) {
    tools.push({ name: "Buffer or Later", why: "Schedules social posts in advance so you're not posting manually each day.", costNote: "Free tiers available — check current pricing." });
  }
  if (areas.includes("customer_support") || areas.includes("executive_assistant")) {
    tools.push({ name: "ChatGPT or Claude", why: "Drafts replies and summarises conversations so you're not writing from scratch.", costNote: "Free tiers available; paid plans typically in the $20–25/mo range — verify on their sites." });
  }
  if (!tools.length) {
    tools.push({ name: "ChatGPT or Claude", why: "A versatile starting point for drafting, summarising, and answering questions.", costNote: "Free tiers available; paid plans typically in the $20–25/mo range — verify on their sites." });
  }
  if (input.currentSoftware) {
    tools.push({ name: "Zapier or Make", why: `Connects ${input.currentSoftware.split(/[,&]/)[0]?.trim() ?? "your existing tools"} to the new tools so data moves automatically.`, costNote: "Free tiers available for simple flows — check current pricing." });
  }

  const steps: SetupStep[] = [
    { order: 1, title: "Review this plan with Shea", detail: "Shea will check this plan against your specific situation before you start anything." },
    { order: 2, title: "Set up accounts for the recommended tools", detail: "Create accounts using the tools listed above. Start with free tiers where available." },
    { order: 3, title: "Connect your first tool pair", detail: "Link the tool you use most (email or calendar) to the new tool. This is usually a 10-minute setup." },
    { order: 4, title: "Run one real task through the new setup", detail: "Try the workflow once with a real piece of work. Note anything that needs adjusting." },
    { order: 5, title: "Contact email support with any questions", detail: "Use the support form in your account. Shea's team replies within 2 business days." },
  ];

  return { tools, steps, source: "TEMPLATE" };
}

/** Load available tools from the DB to give the LLM a constrained list with slugs. */
async function loadAvailableTools(): Promise<{ slug: string; name: string; category: string; pricingNote: string }[]> {
  try {
    const { prisma } = await import("./db");
    const tools = await prisma.tool.findMany({
      where: { enabled: true },
      select: { slug: true, name: true, category: true, pricingNote: true },
      orderBy: { sortOrder: "asc" },
    });
    return tools;
  } catch {
    return [];
  }
}

export async function generateToolPlan(input: ToolPlanInput): Promise<ToolPlanOutput> {
  const llm = getClient();

  // Always try to load the tool catalogue for slug enrichment
  const availableTools = await loadAvailableTools();
  const toolCatalogueNote = availableTools.length > 0
    ? `\n\nAvailable tools (use these names and slugs where relevant; slug is for the /go/:slug link):\n${availableTools.map((t) => `- ${t.name} [slug:${t.slug}] (${t.category}): ${t.pricingNote || "check their site"}`).join("\n")}`
    : "";

  if (!llm) {
    const plan = buildTemplatePlan(input);
    // Enrich template tools with slugs from DB
    plan.tools = plan.tools.map((tool) => {
      const match = availableTools.find((t) => t.name.toLowerCase().includes(tool.name.toLowerCase().split(" ")[0]?.toLowerCase() ?? ""));
      return match ? { ...tool, slug: match.slug } : tool;
    });
    return plan;
  }

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TOOL_PLAN_SYSTEM + toolCatalogueNote },
        { role: "user",   content: buildToolPlanPrompt(input) },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const parsed = ToolPlanSchema.safeParse(raw);
    if (!parsed.success) {
      logFallback("generateToolPlan", "schema_mismatch");
      return buildTemplatePlan(input);
    }
    return { ...parsed.data, source: "LLM" };
  } catch (err) {
    logFallback("generateToolPlan", "llm_error", err instanceof Error ? err.message : String(err));
    return buildTemplatePlan(input);
  }
}

// ── Client Playbook generation (admin-only) ──────────────────────────────────

export interface SessionSummarySnippet {
  sessionNumber?: number;
  sessionType: string;
  sessionDate: string; // ISO date string
  decisions: string[];
  actionItems: string[];
  workflowsBuiltOrChanged: string[];
  openQuestions: string[];
}

export interface PlaybookInput {
  // Client identity
  clientName: string;
  role: string;
  industry: string;
  bizSize: string;

  // Intake signals
  areas: string[];
  aiComfort: number;
  hoursLost: number;
  helpStyle: string;
  toolBudget?: string;
  currentSoftware?: string;
  weeklyVolumes?: string;
  timeSinks: string[];
  automateFirst?: string;
  freeText?: string;

  // ATG context
  tier: string;        // SELF_SERVE|GUIDED|WHITE_GLOVE|NONE
  vertical: string;    // vertical id
  adminNotes?: string; // Shea's own prior notes
  /** Recent approved session summaries — inform playbook with what was decided */
  sessionSummaries?: SessionSummarySnippet[];
  /** JSON string of approved ToolPlan.toolsJson — used to derive DFY access checklist */
  toolPlanJson?: string;
  /** JSON string of Intake.answers — used to derive DFY access checklist (aiPlatforms, etc.) */
  answersJson?: string;
}

// ── Install guide section (GUIDED + DFY) ─────────────────────────────────────

export interface InstallGuidePlatformEntry {
  /** grok_bot | claude | chatgpt */
  platform: string;
  platformLabel: string;
  /** Pre-built alternative to show first, when verified and set */
  readyMadeAlternative: { name: string; url: string; note: string } | null;
  /** Copy-paste routine prompt from ROUTINE_PROMPTS[slug][platform] */
  routinePrompt: string;
  /**
   * Operator key steps — Shea-focused. References the client guide by slug
   * rather than duplicating full instructions.
   */
  operatorKeySteps: string[];
  /** What Shea checks / confirms on the call or async */
  operatorNotes: string[];
  /** Confirmation code note (use the portal verify flow) */
  confirmationNote: string;
}

export interface InstallGuideEntry {
  workflowSlug: string;
  workflowName: string;
  /** Connectors needed for this workflow */
  connectorsNeeded: string[];
  /** Per-platform entries for each platform the client uses */
  platforms: InstallGuidePlatformEntry[];
  /** DFY only: extra build notes for Shea performing the install with delegated access */
  dfyBuildNotes?: string[];
}

export interface PlaybookInstallGuides {
  /** Present for GUIDED and WHITE_GLOVE (DFY) */
  applicableTier: string;
  /**
   * General pre-install checklist for Shea to run before the first session or build.
   */
  preInstallChecklist: string[];
  entries: InstallGuideEntry[];
}

// ── DFY account access section ────────────────────────────────────────────────

export interface AccountAccessItem {
  /** e.g. "Google Workspace / Gmail", "Grok Bot workspace", "HubSpot" */
  accountSystem: string;
  /** e.g. "Admin seat", "Invited user (collaborator)", "Delegated access" */
  accessType: string;
  /** Why Shea needs this access for the builds */
  reason: string;
}

export interface AccountAccessSection {
  /** Only included when tier is WHITE_GLOVE (Done-for-you) */
  isDFY: true;
  /**
   * Checklist of accounts Shea needs access to, derived from tool plan and intake.
   * Each entry explains the access method (delegated seat / invited user / never shared passwords).
   */
  accessChecklist: AccountAccessItem[];
  /**
   * Access agreement checkpoint — these points must be confirmed in writing
   * before any build work begins.
   */
  accessAgreement: string[];
  /**
   * Step-by-step build workflow from kickoff to handoff.
   */
  buildWorkflow: string[];
  /**
   * Offboarding procedure — remove access, rotate credentials, confirm in writing.
   */
  offboarding: string[];
}

export interface PlaybookContent {
  /** Plain-words summary: who they are, what they want, inferred situation */
  clientSummary: string;
  /** Risk flags and things to clarify in the first call */
  risksAndClarifications: string[];
  /** Why the recommended tier fits and what to set in writing */
  tierRationale: {
    recommendedTier: string;
    why: string;
    /** Specific expectations to set in the engagement letter/kickoff */
    expectationsToSet: string[];
  };
  /** Tailored agenda for the discovery/first call */
  discoveryAgenda: Array<{ duration: string; topic: string; questions: string[] }>;
  /** Recommended tool stack for this client */
  toolStack: Array<{
    category: string;
    tool: string;
    why: string;
    costNote: string; // "check current pricing" — never invented numbers
  }>;
  /** First 1–3 workflows with step outline */
  workflows: Array<{
    name: string;
    area: string;
    whyFirst: string;
    steps: string[];
  }>;
  /** Tier-specific execution plan */
  tierPlan: {
    selfServeNotes?: string;      // what to cover in tool plan + email support notes
    guidedSessionPlan?: string[]; // session-by-session outline
    dfyBuildPlan?: string[];      // build steps + monitoring cadence
  };
  /** Milestone plan */
  milestones: {
    day30: string;
    day60: string;
    day90: string;
    ongoingCadence: string;
  };
  /** What to watch for */
  kpisAndUpsell: {
    kpis: string[];             // runs, approvals, edits — no invented hour figures
    upgradesTriggers: string[]; // signals client is ready for next tier
    scopeCreepWatchOuts: string[];
  };
  /**
   * Account access & build workflow — only present when tier is WHITE_GLOVE.
   * Guides Shea through access request, agreement, build, and offboarding.
   * ATG app never stores client credentials; this section stores no secrets.
   */
  accountAccess?: AccountAccessSection;
  /**
   * Per-workflow install guides — only present for GUIDED and WHITE_GLOVE.
   * Reuses ROUTINE_PROMPTS as the source of truth — no duplicated text.
   */
  installGuides?: PlaybookInstallGuides;
}

const AccountAccessItemZod = z.object({
  accountSystem: z.string().min(1).max(120),
  accessType:    z.string().min(1).max(120),
  reason:        z.string().min(1).max(400),
});

const AccountAccessSectionZod = z.object({
  isDFY:           z.literal(true),
  accessChecklist: z.array(AccountAccessItemZod).min(1).max(15),
  accessAgreement: z.array(z.string().min(1)).min(1).max(10),
  buildWorkflow:   z.array(z.string().min(1)).min(1).max(15),
  offboarding:     z.array(z.string().min(1)).min(1).max(10),
});

const PlaybookZod = z.object({
  clientSummary: z.string().min(1),
  risksAndClarifications: z.array(z.string()),
  tierRationale: z.object({
    recommendedTier: z.string(),
    why: z.string(),
    expectationsToSet: z.array(z.string()),
  }),
  discoveryAgenda: z.array(z.object({
    duration: z.string(),
    topic: z.string(),
    questions: z.array(z.string()),
  })),
  toolStack: z.array(z.object({
    category: z.string(),
    tool: z.string(),
    why: z.string(),
    costNote: z.string(),
  })).min(1),
  workflows: z.array(z.object({
    name: z.string(),
    area: z.string(),
    whyFirst: z.string(),
    steps: z.array(z.string()),
  })).min(1),
  tierPlan: z.object({
    selfServeNotes: z.string().optional(),
    guidedSessionPlan: z.array(z.string()).optional(),
    dfyBuildPlan: z.array(z.string()).optional(),
  }),
  milestones: z.object({
    day30: z.string(),
    day60: z.string(),
    day90: z.string(),
    ongoingCadence: z.string(),
  }),
  kpisAndUpsell: z.object({
    kpis: z.array(z.string()),
    upgradesTriggers: z.array(z.string()),
    scopeCreepWatchOuts: z.array(z.string()),
  }),
  accountAccess: AccountAccessSectionZod.optional(),
  // installGuides is always built from the template (not from LLM) for consistency
  // The LLM is not instructed to generate it; it's appended post-generation.
});

const PLAYBOOK_SYSTEM = `You are writing a confidential operator playbook for Shea Curran (ATG Consulting) to use internally when running a client engagement. This document is never shown to clients.

ATG positioning:
- Three tiers: Self-serve (tool plan + email support, no calls), Guided (1:1 build sessions with Shea), Done-for-you (Shea builds and runs up to 3 custom workflows).
- Audience: anyone not tech-savvy, across six verticals (trades, real estate, hospitality, professional services, independent sales reps, coaches/creators).
- Account ownership: client owns all accounts. Shea is added as a collaborator/helper. Nothing sends without client approval.
- Grok Bot is a capable AI automation tool alongside ChatGPT, Claude, Cursor, Replit — recommend it where it genuinely fits.
- Never invent prices, testimonials, client names, or hour-saved statistics. Say "check current pricing" for tools.
- No jargon: no "agentic", "RAG", "LLM", "vector DB".
- KPIs to track: workflow runs, output approvals, output edits (not invented hours-saved figures).

When tier is WHITE_GLOVE (Done-for-you), include an "accountAccess" section with:
1. accessChecklist: list every account Shea needs. Always request delegated/admin seats or invited-user roles (e.g., Google Workspace admin seat, Grok Bot workspace collaborator). Never shared passwords. If credential sharing is unavoidable, use the client's password manager sharing feature, enable 2FA, and note it.
2. accessAgreement: 4–6 bullet points the client must confirm in writing before work begins. Include: exact scope of access, duration (engagement period only), client can revoke at any time, no credentials stored by ATG, Shea will not use access beyond the agreed workflows.
3. buildWorkflow: step-by-step from kickoff to handoff. Include: kickoff call, access granted and verified, install skills/routines in client's own platform (never in ATG), connect their connectors, test each output with client approval before anything sends, handoff walkthrough + recording, sign-off.
4. offboarding: step-by-step. Include: remove Shea's access from each account, rotate any shared credentials, client confirms removal in writing, log the date. Add a note that ATG app stores no secrets — only the access log metadata.

For Guided and Self-serve tiers, omit the accountAccess field entirely.

Return ONLY valid JSON matching the output schema. No prose outside JSON.`;

function buildPlaybookPrompt(input: PlaybookInput): string {
  const lines = [
    `Client: ${promptSafe(input.clientName, "name")}`,
    `Role: ${promptSafe(input.role, "role")}`,
    `Industry/vertical: ${promptSafe(input.industry, "industry")} (${input.vertical})`,
    `Business size: ${input.bizSize}`,
    `ATG tier: ${input.tier}`,
    `Areas wanting help: ${input.areas.join(", ")}`,
    `AI comfort (0-4): ${input.aiComfort}`,
    `Hours/week lost to repetitive work: ${input.hoursLost}`,
    `Preferred engagement style: ${input.helpStyle}`,
    `Monthly tool budget: ${input.toolBudget ?? "not stated"}`,
    `Current software: ${input.currentSoftware ? promptSafe(input.currentSoftware, "software") : "not stated"}`,
    `Weekly volumes: ${input.weeklyVolumes ?? "not stated"}`,
    `Biggest time sinks: ${input.timeSinks.join(", ")}`,
    input.automateFirst ? `Would automate first: ${promptSafe(input.automateFirst, "automate")}` : "",
    input.freeText ? `Additional context: ${promptSafe(input.freeText, "context")}` : "",
    input.adminNotes ? `Shea's prior notes: ${promptSafe(input.adminNotes, "notes")}` : "",
    ...(input.sessionSummaries?.length
      ? [
          `\nSession history (${input.sessionSummaries.length} session(s) so far):`,
          ...input.sessionSummaries.slice(0, 5).map((s, i) =>
            `  Session ${s.sessionNumber ?? i + 1} (${s.sessionType}, ${s.sessionDate}): ` +
            `Decisions: ${s.decisions.slice(0, 3).join("; ")}. ` +
            `Actions: ${s.actionItems.slice(0, 3).join("; ")}. ` +
            (s.workflowsBuiltOrChanged.length ? `Workflows: ${s.workflowsBuiltOrChanged.join("; ")}.` : "") +
            (s.openQuestions.length ? ` Open: ${s.openQuestions[0]}.` : "")
          ),
          "When generating the playbook, cite which sessions informed key decisions.",
        ]
      : []),
  ].filter(Boolean);
  return `Generate a client operator playbook:\n${lines.join("\n")}\n\nReturn ONLY valid JSON.`;
}

function buildTemplatePlaybook(input: PlaybookInput): PlaybookContent {
  const AREA_FULL: Record<string, string> = {
    executive_assistant: "Executive assistant", marketing: "Marketing",
    sales: "Sales", customer_support: "Customer support",
  };
  const TIER_FULL: Record<string, string> = {
    SELF_SERVE: "Self-serve", GUIDED: "Guided",
    WHITE_GLOVE: "Done-for-you", NONE: "No plan yet",
  };
  const tierLabel = TIER_FULL[input.tier] ?? input.tier;
  const primaryArea = input.areas[0] ?? "sales";

  return {
    clientSummary: `${input.clientName} is a ${input.role} in the ${input.industry} space (${input.bizSize}-person business). They selected ${input.areas.map((a) => AREA_FULL[a] ?? a).join(" and ")} as priority areas and report losing ~${input.hoursLost} hours/week to repetitive work. Their preferred engagement is ${input.helpStyle}. AI comfort: ${input.aiComfort}/4. ${input.currentSoftware ? `Currently using: ${input.currentSoftware}.` : "Current software not stated."} ${input.toolBudget ? `Budget: ${input.toolBudget}.` : ""}`,

    risksAndClarifications: [
      `Clarify exact workflows they want automated — "email" can mean inbox triage, campaigns, or replies.`,
      input.aiComfort <= 1 ? "Low AI comfort — frame everything as 'you review and approve; nothing happens automatically'." : "Mid-to-high AI comfort — check if they've tried automating before and what broke.",
      input.hoursLost >= 20 ? "High reported hours lost — validate the estimate on the call; often a sign of broader ops issues beyond automation." : "",
      input.toolBudget === "<$50/mo" ? "Very limited tool budget — prioritise free tools and what they already pay for." : "",
      `Confirm client owns all accounts (email, CRM, calendar). Shea joins as a collaborator/admin, not the owner.`,
      `Confirm they understand nothing sends without their explicit approval.`,
      `Ask whether they have or have had a VA or contractor handle any of this.`,
    ].filter(Boolean),

    tierRationale: {
      recommendedTier: tierLabel,
      why: input.tier === "WHITE_GLOVE"
        ? `Done-for-you suits this client based on their comfort level (${input.aiComfort}/4), hours at stake (${input.hoursLost}/wk), and engagement preference. Shea designs, builds, and monitors — client approves output.`
        : input.tier === "GUIDED"
        ? `Guided is the right fit: they want to be involved in building, have reasonable comfort (${input.aiComfort}/4), and benefit from live sessions to build the right habits.`
        : `Self-serve fits: higher AI comfort (${input.aiComfort}/4) and a clear sense of what they want to automate. Personalised plan + email support should cover their needs without live sessions.`,
      expectationsToSet: [
        `Response times: ${input.tier === "GUIDED" || input.tier === "WHITE_GLOVE" ? "Direct message thread (same-day for Guided/DFY). " : "Email support — reply within 2 business days. "}`,
        `Inclusions: ${input.tier === "WHITE_GLOVE" ? "Up to 3 custom workflows, built and run by Shea. Monthly tuning." : input.tier === "GUIDED" ? `Package of ${input.aiComfort <= 1 ? "4–6" : "3–4"} live sessions.` : "Tool plan, setup guide, ready-made workflows, email support."}`,
        `Exclusions: ${input.tier === "SELF_SERVE" ? "No 1:1 calls with Shea." : "Ongoing work beyond the agreed scope will be quoted separately."}`,
        `Client responsibilities: provide access to accounts, attend sessions, review and approve all outputs within 3 business days.`,
        `Account ownership: client owns all accounts. Shea is added as a collaborator and can be removed at any time.`,
        `Approval gate: nothing is sent, posted, or filed without the client explicitly copying and sending it themselves.`,
      ],
    },

    discoveryAgenda: [
      { duration: "5 min",  topic: "Introductions and call goals", questions: ["What's the one outcome that would make this worth it?"] },
      { duration: "10 min", topic: "Walk through their week", questions: [`Which of these tasks (${input.timeSinks.slice(0, 3).join(", ")}) costs the most time?`, "What does a bad week look like vs. a normal one?"] },
      {
        duration: "15 min", topic: "Current tools and processes",
        questions: [
          input.currentSoftware ? `You mentioned you use ${input.currentSoftware.split(",")[0]}. Walk me through how you use it day to day.` : "What software do you use most — email, calendar, CRM?",
          "What have you tried automating before? What worked or didn't?",
          "Who else touches these processes — employees, VAs, contractors?",
        ],
      },
      {
        duration: "10 min", topic: "Define success and scope",
        questions: [
          `If we built a workflow for "${input.automateFirst ?? input.timeSinks[0]}", what would done look like?`,
          "What would make you nervous about handing something to a workflow?",
          `Budget confirmed as ${input.toolBudget ?? "to be discussed"} — does that cover new tools or is it existing spend?`,
        ],
      },
      { duration: "5 min", topic: "Next steps and timeline", questions: ["When do you want to see the first output?", "Who else needs to be looped in before we start?"] },
    ],

    toolStack: [
      ...(input.areas.includes("executive_assistant") || input.areas.includes("sales")
        ? [{ category: "AI drafting", tool: "Grok Bot or Claude", why: "Drafts emails, follow-ups, and summaries in their voice — approachable for lower AI comfort.", costNote: "Check current pricing; free tiers available." }]
        : [{ category: "AI drafting", tool: "ChatGPT or Claude", why: "Versatile starting point for drafting and research tasks.", costNote: "Check current pricing; free tiers available." }]),
      ...(input.areas.includes("sales")
        ? [{ category: "CRM/pipeline", tool: input.currentSoftware?.toLowerCase().includes("hubspot") ? "HubSpot (existing)" : "HubSpot CRM or Pipedrive", why: "Tracks contacts and follow-ups so nothing slips.", costNote: "Free tier available (HubSpot) — check current pricing for upgrades." }]
        : []),
      ...(input.areas.includes("marketing")
        ? [{ category: "Content scheduling", tool: "Buffer or Later", why: "Schedules posts in advance across platforms.", costNote: "Free tiers available — check current pricing." }]
        : []),
      { category: "Workflow automation", tool: input.toolBudget === "<$50/mo" ? "Make (free tier)" : "Zapier or Make", why: "Connects tools so data moves automatically without copy-paste.", costNote: "Free tiers available for simple flows — check current pricing." },
      ...(input.areas.includes("customer_support")
        ? [{ category: "Support/inbox", tool: "Grok Bot or Gmail labels + automation", why: "Routes and drafts support replies consistently.", costNote: "Check current pricing." }]
        : []),
    ],

    workflows: [
      {
        name: "Follow-up email drafter",
        area: primaryArea,
        whyFirst: "Lowest barrier to value: demonstrates the human-in-the-loop model immediately and builds trust in the system.",
        steps: [
          "Shea configures the follow-up context form in the Workbench.",
          `Client enters: who they're writing to, what happened last, what they want to say.`,
          "Grok Bot or Claude drafts the email in their voice.",
          "Client reviews in the Workbench and copies it into their own mail app. Nothing is sent automatically.",
          "Shea reviews the first 3 outputs and adjusts the prompt tone based on feedback.",
        ],
      },
      ...(input.areas.includes("sales") && input.areas.length > 1
        ? [{
          name: "Weekly prospect briefing",
          area: "sales",
          whyFirst: "High time-sink with clear, repeatable output — good second workflow once follow-up is dialled in.",
          steps: [
            "Shea sets up a weekly trigger (scheduled run).",
            "Workflow pulls new contacts or events from the client's CRM or territory source.",
            "AI writes a short brief per contact (recent events, suggested angle).",
            "Client reviews the briefing in the Workbench on Monday morning.",
          ],
        }]
        : []),
    ],

    tierPlan: {
      selfServeNotes: input.tier === "SELF_SERVE"
        ? `Tool plan should cover: ${input.timeSinks.slice(0, 3).join(", ") ?? "key time sinks identified above"}, setup steps for connecting to ${input.currentSoftware ?? "their existing tools"}, and a quick-reference guide for the follow-up workflow. Email support: reply within 2 business days; escalate to Guided if they're stuck after 3 exchanges on the same issue.`
        : undefined,
      guidedSessionPlan: input.tier === "GUIDED"
        ? [
          "Session 1 (90 min): Discovery walkthrough, account audit, agree on first workflow. Outcome: client has accounts ready and understands the approval model.",
          "Session 2 (90 min): Build follow-up workflow live. Test with a real contact. Outcome: first output in their Workbench.",
          "Session 3 (90 min): Review first week of use, tune prompts, start second workflow. Outcome: two workflows running.",
          "Session 4 (90 min): Build second workflow, review metrics (runs, approvals, edits), identify third if time allows. Outcome: system running independently.",
        ]
        : undefined,
      dfyBuildPlan: input.tier === "WHITE_GLOVE"
        ? [
          "Week 1: Account access setup. Shea maps current toolstack and confirms build plan.",
          "Week 2-3: Build workflow 1 (follow-up drafter). Test with 3 real outputs. Client approves or requests adjustments.",
          "Week 3-4: Build workflow 2 (based on intake priorities). Test and tune.",
          "Week 5-6: Build workflow 3 if in scope. Monthly tuning cadence established.",
          "Ongoing: weekly output review, monthly tune session (30 min), escalation path for issues.",
        ]
        : undefined,
    },

    milestones: {
      day30: `First workflow running. At least 5 outputs reviewed and approved. Client familiar with the Workbench approval flow.`,
      day60: `Second workflow live${input.tier === "WHITE_GLOVE" ? ". Third in build or running." : ". Prompt tuning based on first-month feedback complete."}. Run count and approval rate stable.`,
      day90: `${input.tier === "WHITE_GLOVE" ? "All 3 workflows running. Monthly tuning cadence established." : "System running independently. Client handling edge cases. Evaluate upgrade if volume or complexity has grown."} Scope review: are there new time sinks the system should address?`,
      ongoingCadence: input.tier === "WHITE_GLOVE"
        ? "Monthly tuning session (30 min). Weekly output queue review. Shea monitors run failures proactively."
        : input.tier === "GUIDED"
        ? "Post-session async check-ins via operator thread. 30-day follow-up after final session."
        : "Email support available. Prompt client to check in after 30 days of use.",
    },

    kpisAndUpsell: {
      kpis: [
        "Number of workflow runs per week",
        "Outputs approved vs. edited vs. dismissed (edit rate signals prompt tuning needed)",
        "Support ticket volume (high volume in self-serve → Guided upgrade signal)",
        "Session attendance and participation (Guided)",
      ],
      upgradesTriggers: [
        "Self-serve: 3+ support tickets on the same workflow → offer Guided tune-up session",
        "Self-serve: client wants a second workflow → Guided package",
        "Guided: client wants ongoing monitoring without self-managing → Done-for-you",
        "Any tier: new business line or vertical expands scope beyond current workflows",
      ],
      scopeCreepWatchOuts: [
        "Requests to connect tools not in the original stack (add to scope before building)",
        "Requests to auto-send (not just draft) — this changes the risk profile significantly",
        "Adding team members to the workflow without a scope discussion",
        "Expecting Shea to respond to client messages outside agreed hours/SLA",
      ],
    },

    // ── Account access & build workflow (DFY / WHITE_GLOVE only) ─────────────
    accountAccess: input.tier === "WHITE_GLOVE"
      ? buildTemplateAccountAccess(input)
      : undefined,
  };
}

/** Derives the DFY access section from tool plan / intake data. */
function buildTemplateAccountAccess(input: PlaybookInput): AccountAccessSection {
  const tools: { name: string; category?: string }[] = (() => {
    try { return JSON.parse(input.toolPlanJson ?? "[]") as { name: string; category?: string }[]; } catch { return []; }
  })();

  // Derive which AI platforms the client uses from intake answers
  const answers: Record<string, unknown> = (() => {
    try { return JSON.parse(input.answersJson ?? "{}") as Record<string, unknown>; } catch { return {}; }
  })();
  const aiPlatforms: string[] = Array.isArray(answers.aiPlatforms)
    ? (answers.aiPlatforms as string[]).filter((p) => p !== "none" && p !== "not_sure")
    : [];

  // Build the access checklist from known tool categories + AI platform
  const checklist: AccountAccessItem[] = [];

  // AI platform access (always needed for DFY)
  if (aiPlatforms.includes("grok_bot") || aiPlatforms.length === 0) {
    checklist.push({
      accountSystem: "Grok Bot (xAI)",
      accessType: "Invited collaborator in their workspace (not a new account)",
      reason: "Install and tune workflow skills and scheduled routines in the client's own platform.",
    });
  }
  if (aiPlatforms.includes("claude")) {
    checklist.push({
      accountSystem: "Claude (Anthropic)",
      accessType: "Invited to their Claude Project as a collaborator",
      reason: "Install SKILL.md instructions and scheduled routine configurations.",
    });
  }
  if (aiPlatforms.includes("chatgpt")) {
    checklist.push({
      accountSystem: "ChatGPT (OpenAI)",
      accessType: "Shared GPT collaborator access (not the account password)",
      reason: "Set up and test custom GPT actions and scheduled tasks.",
    });
  }

  // Email / calendar (needed for any workflow that references email or scheduling)
  const needsEmail = input.areas.includes("executive_assistant") || input.areas.includes("sales") || input.areas.includes("customer_support");
  const currentSoftware = (input.currentSoftware ?? "").toLowerCase();
  if (needsEmail || currentSoftware.includes("gmail") || currentSoftware.includes("google workspace")) {
    checklist.push({
      accountSystem: "Google Workspace / Gmail",
      accessType: "Admin console delegated access or invited admin seat (not the account password)",
      reason: "Connect Gmail to workflow routines so drafts appear for approval. Access limited to connector configuration — no reading of email content by ATG.",
    });
  }
  if (currentSoftware.includes("outlook") || currentSoftware.includes("microsoft 365") || currentSoftware.includes("m365")) {
    checklist.push({
      accountSystem: "Microsoft 365 / Outlook",
      accessType: "Delegated admin access via Azure AD or invited admin seat",
      reason: "Connect Outlook to workflow routines. ATG does not read or store email content.",
    });
  }

  // CRM
  const hasCrm = tools.some((t) => t.category === "crm") ||
    currentSoftware.includes("hubspot") || currentSoftware.includes("pipedrive") || currentSoftware.includes("salesforce");
  if (hasCrm || input.areas.includes("sales")) {
    const crmName = currentSoftware.includes("hubspot") ? "HubSpot CRM"
      : currentSoftware.includes("salesforce") ? "Salesforce"
      : currentSoftware.includes("pipedrive") ? "Pipedrive"
      : "CRM (name TBC)";
    checklist.push({
      accountSystem: crmName,
      accessType: "Super-admin or invited admin user (not the account password)",
      reason: "Set up workflow triggers and read contact data for follow-up drafts. No data is exported to ATG servers.",
    });
  }

  // Scheduling tool
  const hasScheduler = currentSoftware.includes("calendly") || input.areas.includes("executive_assistant");
  if (hasScheduler) {
    checklist.push({
      accountSystem: "Calendly (or equivalent scheduler)",
      accessType: "Invited admin team member",
      reason: "Configure reminder and follow-up workflow triggers from booking events.",
    });
  }

  // Automation platform
  const hasAutomation = tools.some((t) => t.category === "automation") ||
    currentSoftware.includes("zapier") || currentSoftware.includes("make");
  if (hasAutomation) {
    const automationName = currentSoftware.includes("zapier") ? "Zapier" : currentSoftware.includes("make") ? "Make (Integromat)" : "Zapier or Make";
    checklist.push({
      accountSystem: automationName,
      accessType: "Invited team member (not the account password)",
      reason: "Build and configure Zap/scenario triggers for scheduled workflow routines.",
    });
  }

  // Fallback — always add a generic note if nothing detected
  if (checklist.length === 0) {
    checklist.push({
      accountSystem: "AI platform (TBC at kickoff)",
      accessType: "Invited collaborator / delegated admin seat",
      reason: "Install skills and routines in the client's chosen AI platform.",
    });
  }

  return {
    isDFY: true,
    accessChecklist: checklist,

    accessAgreement: [
      "Scope: Shea's access is limited to the accounts and workflows listed above. No other systems will be accessed.",
      "Duration: access is granted for the engagement period only and will be removed at offboarding.",
      "Revocation: the client can revoke any access at any time without notice and without affecting the engagement outcome.",
      "No credentials stored: ATG's app stores no passwords, tokens, or API keys. Only metadata (account name, access type, grant/revoke date) is logged.",
      "No automatic sending: Shea will not configure any system to send, post, or book on the client's behalf without a test-and-approval step the client can observe.",
      "Password sharing (if unavoidable): use the client's existing password manager sharing feature (1Password, Bitwarden, etc.), enable 2FA on the account, and note the date. Rotate credentials at offboarding.",
      "Authorisation to grant access: the person inviting Shea to each account must be the account owner or hold admin rights to grant delegated access. If they do not, the account owner must explicitly grant the invitation before work begins.",
    ],

    buildWorkflow: [
      "Kickoff call (30–60 min): confirm scope, review access list, answer questions. Client agrees to the access agreement in writing (email is sufficient).",
      "⚠ Signer check (before any access steps): confirm that the person who signed the proposal is either (a) the account owner for each system in the access list, or (b) has explicit written permission from the account owner to grant delegated access. If there is a separate approver listed in the proposal, get their written confirmation before proceeding.",
      "Access granted: client invites Shea to each account using their admin console or team invite (no shared passwords). Shea confirms access in the client's Workbench chat.",
      "Environment review: Shea audits the current tool state, notes existing automations or workflows that could conflict.",
      "Skill installation: Shea installs the customised SKILL.md files in the client's AI platform (Grok Bot / Claude / ChatGPT). Follow the 'Install guides' section of this playbook for per-workflow step-by-step instructions. Nothing runs until the test step.",
      "Connector configuration: Shea connects the client's email, calendar, and CRM connectors inside their chosen AI platform. ATG app is not used for this — all connections are in the client's own platform.",
      "Dry run (first 3 outputs): each workflow generates output for client review. Client approves, edits, or requests changes before Shea marks the workflow as live.",
      "Schedule setup: Shea configures the scheduled task / routine in the client's platform. Client confirms the schedule is correct.",
      "Handoff walkthrough: Shea records a short screen share showing the client exactly where to find outputs, how to approve or edit, and how to pause or disable a workflow.",
      "Sign-off: client confirms in writing that workflows are running as expected and they can manage approvals independently.",
    ],

    offboarding: [
      "Shea removes herself from each account in the access log (admin console, team settings, or contact support for platforms with no self-serve removal).",
      "If any credentials were shared via a password manager, revoke Shea's access in the sharing settings and rotate the credentials.",
      "Client confirms in writing (email or Workbench message) that Shea's access has been removed from each account.",
      "Shea logs the revocation date in the client's Access Log in ATG admin.",
      "Final check: run a test output on each live workflow to confirm it still runs correctly without Shea's access.",
      "Archive note: retain the access log for 1 year per ATG records policy, then delete.",
    ],
  };
}

// ── Install guides builder ────────────────────────────────────────────────────

const PLATFORM_LABELS_PB: Record<string, string> = {
  grok_bot: "Grok Bot",
  claude:   "Claude",
  chatgpt:  "ChatGPT",
};

/**
 * Per-platform operator key steps — Shea-focused, not duplicating the full client guide.
 * These tell Shea what to do on the live call or when building with delegated access.
 */
const OPERATOR_KEY_STEPS: Record<string, Record<string, string[]>> = {
  default: {
    grok_bot: [
      "Confirm the client has an X Premium subscription active.",
      "Open grok.com, go to the Skills tab, click 'Add skill → Import from file'.",
      "Upload the personalised SKILL.md (downloaded from ATG portal for this client).",
      "Test by typing '/' in a Grok chat — skill name should appear in the list.",
      "Create a routine: ask Grok 'Create a routine that runs [skill name] every [schedule].'",
      "Run the skill once, review output with the client present, confirm they approve the format.",
    ],
    claude: [
      "Open claude.ai, go to the client's Project (or create one named after the engagement).",
      "Click Project Settings → Skills → Upload ZIP (pack SKILL.md as skill.md inside a folder named after the slug).",
      "Alternatively paste SKILL.md into Project Instructions if Skills tab is unavailable.",
      "Set up a Zapier Zap: Schedule trigger → Claude 'Send message' action → Gmail 'Create draft' action.",
      "Test the full chain with a sample input, confirm draft appears in client's Gmail Drafts.",
      "Walk the client through finding the draft and copying it.",
    ],
    chatgpt: [
      "Open chatgpt.com, go to My GPTs → Create a GPT.",
      "Name it after the workflow; paste System Prompt from SKILL.md into Instructions.",
      "If client has Business/Enterprise: add a Skill (not a GPT) for a cleaner interface.",
      "For scheduling: open a regular ChatGPT chat and ask it to create a Scheduled Task.",
      "Test: trigger the task, confirm output appears, review with client.",
      "Note: Scheduled Tasks run in main chat, not inside GPTs — confirm client understands.",
    ],
  },
};

const OPERATOR_NOTES: Record<string, string[]> = {
  "follow-up":        ["Check that the client's contact name and last touchpoint produce a realistic email. Adjust the prompt tone if output sounds too formal/informal.", "Ask the client to copy a real draft from the output into their email app to confirm the copy flow works."],
  "inbox-triage":     ["Paste a sample inbox summary yourself to test before the call. Confirm the urgency ranking makes sense for this client's actual workload.", "Have client paste 3 real (anonymised) emails during the call to verify the flow."],
  "review-request":   ["Confirm the client has a Google Business / Yelp / platform URL to link. The routine prompt includes a placeholder — update it to the real URL.", "Have client read the draft aloud to check it sounds like them."],
  "social-calendar":  ["Generate one week of posts live on the call. Review tone, hashtag count, and character limits for each platform the client uses.", "Confirm the client's Buffer or scheduling tool is connected if they want to queue posts."],
  "seo-audit":        ["Run the audit against their actual URL during the call. Flag any critical P0 items for the action plan.", "Confirm they have access to Google Search Console — walk them through it if not."],
  "money-snapshot":   ["Have client paste a real week's transactions (redacted) during the call. Check that the numbers in the summary match their actual figures.", "Clarify this is a summary only — not accounting advice."],
  "booking-flow":     ["Confirm their calendar tool (Calendly, Google Calendar) is connected in their AI platform.", "Test a confirmation and reminder message with a real (past) appointment."],
  "quote-proposal":   ["Run a sample quote with realistic numbers during the call. Client should read the full proposal before approving.", "Confirm the output includes all required fields (scope, price, payment terms)."],
  "prospect-research":["Run a sample search for a real prospect type in their territory. Verify at least 2 results are real businesses.", "Remind client to verify contact info before outreach — AI can hallucinate details."],
  "faq-support":      ["Paste 3 real support questions from the client's inbox. Check that answers match their actual policies.", "Confirm they have a FAQ doc or knowledge base the skill can reference."],
};

function buildInstallGuides(input: PlaybookInput): PlaybookInstallGuides | undefined {
  const isEligible = input.tier === "GUIDED" || input.tier === "WHITE_GLOVE";
  if (!isEligible) return undefined;

  // Derive which workflows to include from the tool plan
  const toolPlanTools: { name: string; slug?: string }[] = (() => {
    try { return JSON.parse(input.toolPlanJson ?? "[]") as { name: string; slug?: string }[]; } catch { return []; }
  })();

  // Derive which platforms the client uses from intake
  const answers: Record<string, unknown> = (() => {
    try { return JSON.parse(input.answersJson ?? "{}") as Record<string, unknown>; } catch { return {}; }
  })();
  const aiPlatforms: string[] = Array.isArray(answers.aiPlatforms)
    ? (answers.aiPlatforms as string[]).filter((p) => p !== "none" && p !== "not_sure")
    : ["grok_bot"]; // default to Grok Bot if no preference

  // Use the module-level imports (shared source of truth with client SKILL.md exports)
  const ROUTINE_PROMPTS = _ROUTINE_PROMPTS as unknown as Record<string, Record<string, string>>;
  const CONNECTORS_NEEDED = _CONNECTORS_NEEDED;

  // Deduplicate to known ATG workflow slugs (tool plan may include non-ATG tools)
  const knownSlugs = new Set(Object.keys(ROUTINE_PROMPTS));
  const workflows = toolPlanTools
    .filter((t) => t.slug && knownSlugs.has(t.slug))
    .slice(0, 5); // max 5 workflows in the playbook guide

  // If no matching slugs, use the first 3 from intake areas
  const AREA_DEFAULTS: Record<string, string[]> = {
    sales: ["follow-up", "prospect-research"],
    executive_assistant: ["inbox-triage", "booking-flow"],
    marketing: ["social-calendar", "review-request"],
    customer_support: ["faq-support", "inbox-triage"],
  };
  if (workflows.length === 0) {
    const slugs = input.areas.flatMap((a) => AREA_DEFAULTS[a] ?? [])
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .slice(0, 3);
    for (const s of slugs) {
      if (knownSlugs.has(s)) workflows.push({ name: s.split("-").map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" "), slug: s });
    }
  }

  const entries: InstallGuideEntry[] = workflows.map((wf) => {
    const slug = wf.slug!;
    const connectors = CONNECTORS_NEEDED[slug] ?? [];
    const wfOperatorNotes = OPERATOR_NOTES[slug] ?? ["Review the output with the client before marking complete.", "Confirm the approval flow is clear to the client."];
    const isDFY = input.tier === "WHITE_GLOVE";

    const platforms: InstallGuidePlatformEntry[] = aiPlatforms.map((platform) => {
      const routinePrompt = ROUTINE_PROMPTS[slug]?.[platform as keyof typeof ROUTINE_PROMPTS[string]] ?? "";
      const keySteps = OPERATOR_KEY_STEPS[slug]?.[platform] ?? OPERATOR_KEY_STEPS.default[platform] ?? [];
      return {
        platform,
        platformLabel: PLATFORM_LABELS_PB[platform] ?? platform,
        readyMadeAlternative: null, // admin can set in platformReadyMade field
        routinePrompt,
        operatorKeySteps: keySteps,
        operatorNotes: wfOperatorNotes,
        confirmationNote: `After install, ask the client to run the skill once and copy the ATG verification code (ATG-XXXX) that appears. Have them paste it into ATG portal → My Workflows → ↓ Install → Paste verification code. This confirms the skill is live in their own platform.`,
      };
    });

    return {
      workflowSlug: slug,
      workflowName: wf.name,
      connectorsNeeded: connectors,
      platforms,
      dfyBuildNotes: isDFY ? [
        `With delegated access, install this skill in the client's ${aiPlatforms.map((p) => PLATFORM_LABELS_PB[p] ?? p).join(" / ")} account directly — do not install in your own ATG account.`,
        `Follow the account access section: confirm access is granted before beginning the install.`,
        `After install and test, walk the client through finding the output and how to approve or dismiss it.`,
        `Log the installation date in the admin access log for this client.`,
      ] : undefined,
    };
  });

  return {
    applicableTier: input.tier,
    preInstallChecklist: [
      `Confirm the client has an active subscription to each AI platform listed (${aiPlatforms.map((p) => PLATFORM_LABELS_PB[p] ?? p).join(", ")}).`,
      "Download personalised SKILL.md files for each workflow from the ATG admin portal before the call.",
      "Verify the client's email and calendar accounts are accessible (for connector setup).",
      "Have the ATG verification code flow ready — explain to client what to expect.",
      "For each workflow: know the connectors needed and confirm they're available in the client's platform.",
      "Set expectation: every output is a draft for their review — nothing sends automatically.",
    ],
    entries,
  };
}

export async function generateClientPlaybook(input: PlaybookInput): Promise<PlaybookContent & { source: "LLM" | "TEMPLATE" }> {
  const llm = getClient();

  // installGuides is always built from the template (not LLM) — consistent source of truth
  const installGuides = buildInstallGuides(input);

  if (!llm) return { ...buildTemplatePlaybook(input), installGuides, source: "TEMPLATE" };

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PLAYBOOK_SYSTEM },
        { role: "user",   content: buildPlaybookPrompt(input) },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const parsed = PlaybookZod.safeParse(raw);
    if (!parsed.success) {
      logFallback("generateClientPlaybook", "schema_mismatch");
      return { ...buildTemplatePlaybook(input), installGuides, source: "TEMPLATE" };
    }
    // Merge LLM output with template-built installGuides
    return { ...parsed.data, installGuides, source: "LLM" };
  } catch (err) {
    logFallback("generateClientPlaybook", "llm_error", err instanceof Error ? err.message : String(err));
    return { ...buildTemplatePlaybook(input), installGuides, source: "TEMPLATE" };
  }
}

// ── Session summarization ─────────────────────────────────────────────────────

export interface SessionSummary {
  decisions: string[];
  actionItems: Array<{ owner: "Shea" | "Client"; item: string; dueHint?: string }>;
  workflowsBuiltOrChanged: string[];
  openQuestions: string[];
  risks: string[];
  nextSessionAgenda: string[];
  /** 2-3 sentence client-facing recap (shown only when admin enables shareRecap) */
  shortRecap: string;
  source: "LLM" | "TEMPLATE";
}

const SessionSummaryZod = z.object({
  decisions: z.array(z.string()),
  actionItems: z.array(z.object({
    owner: z.enum(["Shea", "Client"]),
    item: z.string().min(1),
    dueHint: z.string().optional(),
  })),
  workflowsBuiltOrChanged: z.array(z.string()),
  openQuestions: z.array(z.string()),
  risks: z.array(z.string()),
  nextSessionAgenda: z.array(z.string()),
  shortRecap: z.string().min(1).max(600),
});

const SESSION_SYSTEM = `You summarise a work session between Shea Curran (ATG Consulting) and a client.
Extract structured information from the transcript or notes.

Rules:
- Decisions: concrete commitments made in the session.
- Action items: specific to-do items with a clear owner (Shea or Client).
- Workflows built or changed: name of workflow and what changed.
- Open questions: unresolved items needing follow-up.
- Risks: anything that could slow down or derail progress.
- Next session agenda: suggested items for the next call.
- Short recap: 2-3 plain sentences summarising the session for the client (no jargon, no tool names unless already agreed).
- Do NOT invent facts not present in the transcript. If a field has nothing, return an empty array or brief "n/a".
Return ONLY valid JSON. No prose outside JSON.`;

function buildSessionPrompt(transcript: string, sessionType: string, sessionNumber?: number): string {
  const label = sessionNumber ? `Session ${sessionNumber} (${sessionType})` : sessionType;
  return `Summarise this ${label} session.\n\nTranscript/notes:\n${transcript.slice(0, 20_000)}\n\nReturn ONLY valid JSON.`;
}

function buildTemplateSessionSummary(transcript: string, sessionType: string): SessionSummary {
  // Extract bullet-like lines as heuristic fallback
  const lines = transcript.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[-*•→>]/.test(l)).map((l) => l.replace(/^[-*•→>]\s*/, "")).slice(0, 20);

  return {
    decisions: bullets.slice(0, 4).length ? bullets.slice(0, 4) : ["See notes for decisions made in this session."],
    actionItems: [
      { owner: "Shea", item: "Review session notes and update the playbook." },
      { owner: "Client", item: "Follow up on any items agreed in the session." },
    ],
    workflowsBuiltOrChanged: [],
    openQuestions: bullets.slice(4, 7).length ? bullets.slice(4, 7) : [],
    risks: [],
    nextSessionAgenda: ["Review progress on action items.", "Address any open questions from this session."],
    shortRecap: `We met for a ${sessionType.replace("_", " ")} session. Key decisions and next steps were captured. Shea will follow up shortly.`,
    source: "TEMPLATE",
  };
}

export async function summarizeSession(
  transcript: string,
  sessionType: string,
  sessionNumber?: number
): Promise<SessionSummary> {
  if (!transcript.trim()) {
    return {
      decisions: [], actionItems: [], workflowsBuiltOrChanged: [],
      openQuestions: [], risks: [], nextSessionAgenda: [],
      shortRecap: "No transcript was provided for this session.",
      source: "TEMPLATE",
    };
  }

  const llm = getClient();
  if (!llm) return buildTemplateSessionSummary(transcript, sessionType);

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SESSION_SYSTEM },
        { role: "user",   content: buildSessionPrompt(transcript, sessionType, sessionNumber) },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const parsed = SessionSummaryZod.safeParse(raw);
    if (!parsed.success) {
      console.error("[llm] session summary schema mismatch, using template");
      return buildTemplateSessionSummary(transcript, sessionType);
    }
    return { ...parsed.data, source: "LLM" };
  } catch (err) {
    console.error("[llm] session summarization failed:", err);
    return buildTemplateSessionSummary(transcript, sessionType);
  }
}

// ── Phase 1 workflow LLM functions ────────────────────────────────────────────
// Each loads the active WorkflowTemplate from DB, falls back to TEMPLATE_SEEDS.
// Client approval of output is always on. Nothing is sent automatically.

import { TEMPLATE_SEEDS, ROUTINE_PROMPTS as _ROUTINE_PROMPTS, CONNECTORS_NEEDED as _CONNECTORS_NEEDED } from "./templates";

async function getSystemPrompt(slug: string): Promise<string> {
  const tpl = await loadWorkflowTemplate(slug);
  if (tpl?.systemPrompt) return tpl.systemPrompt;
  return TEMPLATE_SEEDS.find((s) => s.slug === slug)?.systemPrompt ?? "";
}

// ── 1. Inbox triage ───────────────────────────────────────────────────────────

export interface InboxTriageOutput {
  items: Array<{
    index: number;
    preview: string;
    urgency: "urgent" | "normal" | "low";
    type: "inquiry" | "complaint" | "compliment" | "request" | "other";
    draftReply: string;
  }>;
  source: "LLM" | "TEMPLATE";
}

const InboxTriageZod = z.object({
  items: z.array(z.object({
    index:      z.number(),
    preview:    z.string(),
    urgency:    z.enum(["urgent", "normal", "low"]),
    type:       z.enum(["inquiry", "complaint", "compliment", "request", "other"]),
    draftReply: z.string(),
  })).min(1),
});

export async function triageInbox(input: {
  messages: string;
  businessDescription?: string;
  senderName?: string;
}): Promise<InboxTriageOutput> {
  const systemPrompt = await getSystemPrompt("inbox-triage");
  const lines = input.messages.split(/\r?\n/).filter((l) => l.trim());
  const numbered = lines.map((l, i) => `${i + 1}. ${l}`).join("\n");

  const fallback = (): InboxTriageOutput => ({
    items: lines.slice(0, 10).map((l, i) => ({
      index: i + 1,
      preview: l.slice(0, 60),
      urgency: "normal" as const,
      type: "inquiry" as const,
      draftReply: `Hi, thank you for reaching out. I'll follow up shortly.\n\nBest,\n${input.senderName ?? "Shea"}`,
    })),
    source: "TEMPLATE",
  });

  const llm = getClient();
  if (!llm || !systemPrompt) return fallback();

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL, temperature: 0.3, max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `My name: ${promptSafe(input.senderName ?? "Me", "name")}\nBusiness: ${promptSafe(input.businessDescription ?? "", "biz")}\nMessages:\n${promptSafe(numbered, "messages")}` },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const p = InboxTriageZod.safeParse(raw);
    return p.success ? { ...p.data, source: "LLM" } : fallback();
  } catch { return fallback(); }
}

// ── 2. Review requests + reply drafts ─────────────────────────────────────────

export interface ReviewRequestOutput {
  requestMessages: Array<{ channel: string; message: string }>;
  reviewReplies: Array<{ review: string; reply: string }>;
  source: "LLM" | "TEMPLATE";
}

const ReviewRequestZod = z.object({
  requestMessages: z.array(z.object({ channel: z.string(), message: z.string() })),
  reviewReplies:   z.array(z.object({ review: z.string(), reply: z.string() })),
});

export async function generateReviewContent(input: {
  businessName: string;
  businessType: string;
  channels: string;
  reviews?: string;
  senderName?: string;
}): Promise<ReviewRequestOutput> {
  const systemPrompt = await getSystemPrompt("review-request");

  const fallback = (): ReviewRequestOutput => {
    const channels = input.channels.split(/[,;]/).map((c) => c.trim()).filter(Boolean);
    return {
      requestMessages: channels.map((ch) => ({
        channel: ch,
        message: `Hi! We really enjoyed working with you. If you have a moment, leaving us a review on ${ch === "SMS" ? "Google" : ch} would mean a lot. Thanks so much!\n— ${input.senderName ?? input.businessName}`,
      })),
      reviewReplies: [],
      source: "TEMPLATE",
    };
  };

  const llm = getClient();
  if (!llm || !systemPrompt) return fallback();

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL, temperature: 0.5, max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Business name: ${promptSafe(input.businessName, "biz")}\nType: ${promptSafe(input.businessType, "type")}\nChannels: ${promptSafe(input.channels, "channels")}\nSender: ${promptSafe(input.senderName ?? input.businessName, "sender")}${input.reviews ? `\nReviews to reply to:\n${promptSafe(input.reviews.slice(0, 3000), "reviews")}` : ""}` },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const p = ReviewRequestZod.safeParse(raw);
    return p.success ? { ...p.data, source: "LLM" } : fallback();
  } catch { return fallback(); }
}

// ── 3. Social content calendar ─────────────────────────────────────────────────

export interface SocialCalendarOutput {
  calendarWeeks: Array<{
    week: number;
    posts: Array<{ day: string; platform: string; topic: string; draft: string }>;
  }>;
  source: "LLM" | "TEMPLATE";
}

const SocialCalendarZod = z.object({
  calendarWeeks: z.array(z.object({
    week:  z.number(),
    posts: z.array(z.object({ day: z.string(), platform: z.string(), topic: z.string(), draft: z.string() })),
  })),
});

const DAYS = ["Monday", "Wednesday", "Friday"];

export async function generateSocialCalendar(input: {
  businessDescription: string;
  offers?: string;
  platforms: string;
  cadence: number;
  weeks: number;
}): Promise<SocialCalendarOutput> {
  const systemPrompt = await getSystemPrompt("social-calendar");
  const platforms = input.platforms.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
  const fallbackWeeks = Math.min(input.weeks, 4);

  const fallback = (): SocialCalendarOutput => ({
    calendarWeeks: Array.from({ length: fallbackWeeks }, (_, wi) => ({
      week: wi + 1,
      posts: platforms.slice(0, 2).flatMap((platform) =>
        DAYS.slice(0, Math.min(input.cadence, 3)).map((day) => ({
          day, platform,
          topic: `Week ${wi + 1} content for ${input.businessDescription.slice(0, 40)}`,
          draft: `[Draft for ${day} on ${platform} — add your specific content here. Review before posting.]`,
        }))
      ),
    })),
    source: "TEMPLATE",
  });

  const llm = getClient();
  if (!llm || !systemPrompt) return fallback();

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL, temperature: 0.7, max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Business: ${promptSafe(input.businessDescription.slice(0, 400), "biz")}\nOffers: ${promptSafe((input.offers ?? "").slice(0, 300), "offers")}\nPlatforms: ${promptSafe(input.platforms, "platforms")}\nPosts per week per platform: ${input.cadence}\nWeeks to plan: ${input.weeks}` },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const p = SocialCalendarZod.safeParse(raw);
    return p.success ? { ...p.data, source: "LLM" } : fallback();
  } catch { return fallback(); }
}

// ── 4. Local SEO audit ─────────────────────────────────────────────────────────

export interface SeoAuditOutput {
  pageTitle: string;
  metaDescription: string;
  h1: string;
  findings: Array<{
    priority: "P0" | "P1" | "P2";
    category: string;
    issue: string;
    fix: string;
    toolNote: string | null;
  }>;
  gbpChecklist: Array<{ item: string; done: boolean | null }>;
  source: "LLM" | "TEMPLATE";
}

const SeoAuditZod = z.object({
  pageTitle:       z.string(),
  metaDescription: z.string(),
  h1:              z.string(),
  findings: z.array(z.object({
    priority: z.enum(["P0", "P1", "P2"]),
    category: z.string(),
    issue:    z.string(),
    fix:      z.string(),
    toolNote: z.string().nullable(),
  })).min(1),
  gbpChecklist: z.array(z.object({ item: z.string(), done: z.boolean().nullable() })),
});

const GBP_CHECKLIST = [
  "Google Business Profile claimed and verified",
  "Business name, address, and phone match the website",
  "Business hours accurate and up to date",
  "Primary category set correctly",
  "At least 5 recent photos uploaded",
  "Review responses posted within 1 week",
];

function buildSeoFallback(html: string, businessType: string, cityArea: string): SeoAuditOutput {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const metaMatch  = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i);
  const h1Match    = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);

  const pageTitle       = titleMatch?.[1]?.trim() ?? "";
  const metaDescription = metaMatch?.[1]?.trim() ?? "";
  const h1              = h1Match?.[1]?.trim() ?? "";

  const findings: SeoAuditOutput["findings"] = [];
  if (!pageTitle) findings.push({ priority: "P0", category: "Title tag", issue: "Title tag is missing", fix: `Add a title like "${businessType} in ${cityArea || "your city"}"`, toolNote: null });
  else if (pageTitle.length < 30 || pageTitle.length > 60) findings.push({ priority: "P1", category: "Title tag", issue: `Title is ${pageTitle.length} chars (aim for 30-60)`, fix: "Rewrite to 30-60 chars including business type and city", toolNote: null });
  if (!metaDescription) findings.push({ priority: "P0", category: "Meta description", issue: "Meta description is missing", fix: "Add a 120-160 char description with business type, city, and primary service", toolNote: null });
  if (!h1) findings.push({ priority: "P0", category: "H1", issue: "H1 heading is missing", fix: "Add one H1 heading with the primary keyword and city", toolNote: null });
  if (!html.includes("LocalBusiness") && !html.includes("schema.org")) findings.push({ priority: "P1", category: "Schema markup", issue: "No LocalBusiness schema found", fix: "Add JSON-LD LocalBusiness schema with name, address, phone, and hours", toolNote: null });
  findings.push({ priority: "P2", category: "Page speed", issue: "Page speed not assessed (HTML-only audit)", fix: "Run Google PageSpeed Insights for Core Web Vitals", toolNote: "Use PageSpeed Insights (free) for full report" });
  findings.push({ priority: "P2", category: "Backlinks", issue: "Backlink data not available in HTML-only audit", fix: "Check Ahrefs or Google Search Console for link authority", toolNote: "Use Ahrefs or GSC for backlink data" });

  return { pageTitle, metaDescription, h1, findings, gbpChecklist: GBP_CHECKLIST.map((item) => ({ item, done: null })), source: "TEMPLATE" };
}

export async function runSeoAudit(input: {
  html: string;  // already fetched server-side, max 20k chars
  businessType: string;
  cityArea?: string;
}): Promise<SeoAuditOutput> {
  const systemPrompt = await getSystemPrompt("seo-audit");
  const truncated = input.html.slice(0, 20_000);
  const cityArea = input.cityArea ?? "";

  const fallback = () => buildSeoFallback(truncated, input.businessType, cityArea);

  const llm = getClient();
  if (!llm || !systemPrompt) return fallback();

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL, temperature: 0.3, max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Business type: ${promptSafe(input.businessType, "type")}\nCity/area: ${promptSafe(cityArea, "city")}\nPage HTML:\n${truncated}` },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const p = SeoAuditZod.safeParse(raw);
    return p.success ? { ...p.data, source: "LLM" } : fallback();
  } catch { return fallback(); }
}

// ── Phase 2 workflow LLM functions ─────────────────────────────────────────────

// ── 5. Weekly money snapshot ───────────────────────────────────────────────────

export interface MoneySnapshotOutput {
  summary: string;
  cashFlags: string[];
  accountantQuestions: string[];
  source: "LLM" | "TEMPLATE";
}

const MoneySnapshotZod = z.object({
  summary:              z.string().min(1),
  cashFlags:            z.array(z.string()),
  accountantQuestions:  z.array(z.string()),
});

/** Simple CSV parser — date, description, amount. No external libraries. */
function parseSimpleCsv(raw: string): string {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length <= 1) return raw; // treat as plain text
  return lines
    .slice(0, 200) // cap rows
    .map((l) => l.replace(/"/g, "").trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

export async function generateMoneySnapshot(input: {
  data: string;
  weekEnding?: string;
  businessName?: string;
}): Promise<MoneySnapshotOutput> {
  const systemPrompt = await getSystemPrompt("money-snapshot");
  const clean = parseSimpleCsv(sanitiseText(input.data, 20_000));

  const fallback = (): MoneySnapshotOutput => ({
    summary: "Your financial data has been received. Review the rows below and share with your accountant for a detailed summary.",
    cashFlags: ["Review each transaction manually before discussing with your accountant."],
    accountantQuestions: ["Are there any transactions I should categorize differently?", "What is my net position for the week?", "Are there any deductions I may be missing?"],
    source: "TEMPLATE",
  });

  const llm = getClient();
  if (!llm || !systemPrompt) return fallback();
  try {
    const completion = await llm.chat.completions.create({
      model: MODEL, temperature: 0.3, max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Week ending: ${input.weekEnding ?? "not specified"}\nBusiness: ${promptSafe(input.businessName ?? "", "biz")}\n\nData:\n${clean}` },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const p = MoneySnapshotZod.safeParse(raw);
    return p.success ? { ...p.data, source: "LLM" } : fallback();
  } catch { return fallback(); }
}

// ── 6. Booking and reminder flow ───────────────────────────────────────────────

export interface BookingFlowOutput {
  bookingPageCopy: { headline: string; subheadline: string; body: string };
  sequences: Array<{ trigger: string; channel: string; message: string }>;
  setupChecklist: string[];
  source: "LLM" | "TEMPLATE";
}

const BookingFlowZod = z.object({
  bookingPageCopy: z.object({ headline: z.string(), subheadline: z.string(), body: z.string() }),
  sequences: z.array(z.object({ trigger: z.string(), channel: z.string(), message: z.string() })),
  setupChecklist: z.array(z.string()),
});

export async function generateBookingFlow(input: {
  businessName: string;
  serviceTypes: string;
  platform: string;
  channels: string;
  senderName?: string;
}): Promise<BookingFlowOutput> {
  const systemPrompt = await getSystemPrompt("booking-flow");

  const fallback = (): BookingFlowOutput => ({
    bookingPageCopy: {
      headline: `Book a ${input.serviceTypes.split(",")[0]?.trim() ?? "session"} with ${input.businessName}`,
      subheadline: "Choose a time that works for you. We'll confirm right away.",
      body: `${input.businessName} offers ${input.serviceTypes}. Book online and get an instant confirmation.\n\nHave a question before booking? Contact us directly.`,
    },
    sequences: [
      { trigger: "Booking confirmed", channel: input.channels.split(",")[0]?.trim() ?? "email", message: `Your booking is confirmed! We look forward to seeing you. Reply to this message if you need to make any changes.\n\n— ${input.senderName ?? input.businessName}` },
      { trigger: "24 hours before", channel: input.channels.split(",")[0]?.trim() ?? "email", message: `Reminder: your appointment is tomorrow. See you then!\n\n— ${input.senderName ?? input.businessName}` },
      { trigger: "Day-of reminder", channel: input.channels.split(",")[0]?.trim() ?? "SMS", message: `Your appointment is today! Looking forward to it.\n— ${input.senderName ?? input.businessName}` },
      { trigger: "No-show (2 hours after)", channel: input.channels.split(",")[0]?.trim() ?? "SMS", message: `Hi, we missed you today. Would you like to reschedule? Just reply to book a new time.\n— ${input.senderName ?? input.businessName}` },
      { trigger: "Rebook offer (7 days after)", channel: input.channels.split(",")[0]?.trim() ?? "email", message: `It was great working with you! Ready to book your next appointment? Use the same link to choose a time.\n— ${input.senderName ?? input.businessName}` },
    ],
    setupChecklist: [
      `Set up your ${input.platform} account and connect your calendar`,
      "Set your availability and buffer times between appointments",
      "Add your service types and durations",
      "Enable automated confirmation emails in your scheduler",
      "Test a booking yourself before sharing the link",
      "Paste the message sequences above into your scheduler's automated message settings",
    ],
    source: "TEMPLATE",
  });

  const llm = getClient();
  if (!llm || !systemPrompt) return fallback();
  try {
    const completion = await llm.chat.completions.create({
      model: MODEL, temperature: 0.5, max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Business: ${promptSafe(input.businessName, "biz")}\nServices: ${promptSafe(input.serviceTypes, "svcs")}\nPlatform: ${promptSafe(input.platform, "platform")}\nChannels: ${promptSafe(input.channels, "channels")}\nSender: ${promptSafe(input.senderName ?? input.businessName, "sender")}` },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const p = BookingFlowZod.safeParse(raw);
    return p.success ? { ...p.data, source: "LLM" } : fallback();
  } catch { return fallback(); }
}

// ── 7. Quote / proposal draft ──────────────────────────────────────────────────

export interface QuoteProposalOutput {
  proposalMarkdown: string;
  scopeChecklist: string[];
  termsChecklist: string[];
  source: "LLM" | "TEMPLATE";
}

const QuoteProposalZod = z.object({
  proposalMarkdown: z.string().min(1),
  scopeChecklist:   z.array(z.string()),
  termsChecklist:   z.array(z.string()),
});

export function proposalToHtml(md: string, clientName: string, businessName: string): string {
  const lines = md.split("\n").map((l) => {
    if (l.startsWith("## ")) return `<h2>${l.slice(3)}</h2>`;
    if (l.startsWith("# "))  return `<h1>${l.slice(2)}</h1>`;
    if (l.startsWith("- "))  return `<li>${l.slice(2)}</li>`;
    if (l.trim() === "")     return "<br/>";
    return `<p>${l}</p>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Proposal for ${clientName}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:auto;padding:2rem;color:#0A0A0B}h1,h2{letter-spacing:-0.02em}li{margin:0.25rem 0}@media print{body{padding:1rem}}</style>
</head>
<body>
<p style="color:#6B6B6E;font-size:0.9rem">Prepared by ${businessName} for ${clientName}</p>
${lines}
<p style="margin-top:3rem;color:#9E9EA1;font-size:0.8rem">This document was drafted for review. Please verify all details before sending.</p>
</body></html>`;
}

export async function generateQuoteProposal(input: {
  clientName: string;
  businessName?: string;
  servicesAndPricing: string;
  scopeDescription: string;
  termsNotes?: string;
  senderName?: string;
}): Promise<QuoteProposalOutput> {
  const systemPrompt = await getSystemPrompt("quote-proposal");

  const fallback = (): QuoteProposalOutput => ({
    proposalMarkdown: `# Proposal: ${input.clientName}\n\nPrepared by ${input.businessName ?? input.senderName ?? "ATG Consulting"}\n\n## Services and Pricing\n\n${input.servicesAndPricing}\n\n## Scope\n\n${input.scopeDescription}\n\n## Payment Terms\n\n[Add payment terms here]\n\n## Questions or changes? Contact us before signing.`,
    scopeChecklist: ["Confirm deliverables with client before starting", "Agree on revision rounds and timeline", "Confirm who provides assets or access"],
    termsChecklist: ["Payment schedule agreed in writing", "Revision limit specified", "Cancellation clause included", "IP ownership clarified"],
    source: "TEMPLATE",
  });

  const llm = getClient();
  if (!llm || !systemPrompt) return fallback();
  try {
    const completion = await llm.chat.completions.create({
      model: MODEL, temperature: 0.5, max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Proposal for: ${promptSafe(input.clientName, "client")}\nPrepared by: ${promptSafe(input.senderName ?? "", "sender")}, ${promptSafe(input.businessName ?? "", "biz")}\nServices and pricing:\n${promptSafe(input.servicesAndPricing.slice(0, 3000), "services")}\nScope:\n${promptSafe(input.scopeDescription.slice(0, 2000), "scope")}\nTerms notes: ${promptSafe(input.termsNotes ?? "", "terms")}` },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const p = QuoteProposalZod.safeParse(raw);
    return p.success ? { ...p.data, source: "LLM" } : fallback();
  } catch { return fallback(); }
}

// ── 8. Prospect research and outreach drafts ──────────────────────────────────

export interface ProspectResearchOutput {
  prospects: Array<{
    name: string;
    url: string;
    summary: string;
    outreachEmail: { subject: string; body: string };
  }>;
  complianceNote: string;
  source: "LLM" | "TEMPLATE";
}

const ProspectResearchZod = z.object({
  prospects: z.array(z.object({
    name:  z.string(),
    url:   z.string(),
    summary: z.string(),
    outreachEmail: z.object({ subject: z.string(), body: z.string() }),
  })),
  complianceNote: z.string(),
});

const PROSPECT_FETCH_TIMEOUT = 10_000;
const COMPLIANCE_NOTE = "CAN-SPAM reminder: before sending, add your physical mailing address and an unsubscribe mechanism to each email. Do not send to addresses obtained without consent.";

async function fetchProspectHtml(url: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PROSPECT_FETCH_TIMEOUT);
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "ATG-Research/1.0 (public page summary; contact shea@atgconsulting.io)" } });
    clearTimeout(t);
    if (!r.ok) return "";
    const text = await r.text();
    return text.slice(0, 15_000);
  } catch { return ""; }
}

function extractProspectName(line: string): { name: string; url: string } {
  const urlMatch = line.match(/https?:\/\/[^\s]+/);
  const url = urlMatch?.[0] ?? "";
  const name = url ? line.replace(url, "").trim().replace(/^[,\s]+|[,\s]+$/g, "") || url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]! : line.trim();
  return { name: name || line.trim(), url };
}

export async function generateProspectResearch(input: {
  icp: string;
  prospects: string; // one per line, name or URL
  businessName?: string;
  senderName?: string;
}): Promise<ProspectResearchOutput> {
  const systemPrompt = await getSystemPrompt("prospect-research");

  const lines = input.prospects.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 5);

  // Fetch public pages for URL-based prospects
  const fetched = await Promise.all(lines.map(async (line) => {
    const { name, url } = extractProspectName(line);
    const html = url ? await fetchProspectHtml(url) : "";
    return { name, url, html };
  }));

  const fallback = (): ProspectResearchOutput => ({
    prospects: fetched.map(({ name, url }) => ({
      name, url,
      summary: url ? "Public page was not accessible — research this prospect manually before outreach." : "Add a URL to enable automated research.",
      outreachEmail: {
        subject: `${input.businessName ?? "Our team"} — quick question for ${name}`,
        body: `Hi,\n\nI came across ${name} and wanted to reach out.\n\n${input.icp ? `We help businesses like yours with: ${input.icp.slice(0, 200)}.` : ""}\n\nWould you be open to a quick call?\n\nBest,\n${input.senderName ?? input.businessName ?? ""}`,
      },
    })),
    complianceNote: COMPLIANCE_NOTE,
    source: "TEMPLATE",
  });

  const llm = getClient();
  if (!llm || !systemPrompt) return fallback();

  const prospectBlock = fetched.map(({ name, url, html }) =>
    `--- Prospect: ${name}${url ? ` (${url})` : ""} ---\n${html ? html.slice(0, 3000) : "(no page content available)"}`
  ).join("\n\n");

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL, temperature: 0.6, max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `My ICP:\n${promptSafe(input.icp.slice(0, 500), "icp")}\n\nSender: ${promptSafe(input.senderName ?? "", "sender")}, ${promptSafe(input.businessName ?? "", "biz")}\n\nProspects:\n${promptSafe(prospectBlock, "prospects")}` },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const p = ProspectResearchZod.safeParse(raw);
    return p.success ? { ...p.data, complianceNote: COMPLIANCE_NOTE, source: "LLM" } : fallback();
  } catch { return fallback(); }
}

// ── Phase 3 workflow LLM functions ─────────────────────────────────────────────

// ── 9. Customer FAQ and support replies ────────────────────────────────────────

export interface FaqSupportOutput {
  faqItems: Array<{ question: string; answer: string }>;
  replyDraft: string | null;
  lowConfidence: boolean;
  lowConfidenceReason: string | null;
  source: "LLM" | "TEMPLATE";
}

const FaqSupportZod = z.object({
  faqItems: z.array(z.object({ question: z.string(), answer: z.string() })),
  replyDraft: z.string().nullable(),
  lowConfidence: z.boolean(),
  lowConfidenceReason: z.string().nullable(),
});

export async function buildFaqAndReply(input: {
  faqSource: string;
  customerQuestion?: string;
}): Promise<FaqSupportOutput> {
  const systemPrompt = await getSystemPrompt("faq-support");
  const source = sanitiseText(input.faqSource, 10_000);
  const question = input.customerQuestion ? sanitiseShortText(input.customerQuestion) : null;

  const fallback = (): FaqSupportOutput => {
    const lines = source.split(/\r?\n/).filter((l) => l.trim().length > 10).slice(0, 15);
    const faqItems = lines.slice(0, 8).map((l, i) => ({
      question: l.trim().slice(0, 80) + (l.length > 80 ? "…" : ""),
      answer: `[Add your answer for item ${i + 1} here]`,
    }));
    return {
      faqItems,
      replyDraft: question ? `Thank you for reaching out. ${question.trim().endsWith("?") ? "Great question." : ""} Let me get back to you shortly with the right information.` : null,
      lowConfidence: !!question,
      lowConfidenceReason: question ? "Template fallback — review and personalise before sending." : null,
      source: "TEMPLATE",
    };
  };

  const llm = getClient();
  if (!llm || !systemPrompt) return fallback();
  try {
    const completion = await llm.chat.completions.create({
      model: MODEL, temperature: 0.3, max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `FAQ source text:\n${promptSafe(source, "source")}${question ? `\n\nCustomer question: ${promptSafe(question, "question")}` : ""}` },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const p = FaqSupportZod.safeParse(raw);
    return p.success ? { ...p.data, source: "LLM" } : fallback();
  } catch { return fallback(); }
}

// ── 10. Agent pipeline (single step) ──────────────────────────────────────────

export interface PipelineStepOutput {
  stepOutput: string;
  qualityFlags: string[];
  readyForNextStep: boolean;
  source: "LLM" | "TEMPLATE";
}

const PipelineStepZod = z.object({
  stepOutput:       z.string().min(1),
  qualityFlags:     z.array(z.string()),
  readyForNextStep: z.boolean(),
});

export async function runPipelineStep(input: {
  stepName: string;
  stepInstructions: string;
  previousOutput?: string;
  currentInput: string;
}): Promise<PipelineStepOutput> {
  const systemPrompt = await getSystemPrompt("agent-pipeline");

  const fallback = (): PipelineStepOutput => ({
    stepOutput: `[Step "${input.stepName}" output placeholder — configure LLM key to generate automatically.\n\nInstructions were: ${input.stepInstructions.slice(0, 200)}\n\nInput was: ${input.currentInput.slice(0, 200)}]`,
    qualityFlags: ["LLM not configured — review manually before proceeding"],
    readyForNextStep: false,
    source: "TEMPLATE",
  });

  const llm = getClient();
  if (!llm || !systemPrompt) return fallback();
  try {
    const completion = await llm.chat.completions.create({
      model: MODEL, temperature: 0.5, max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Step: ${promptSafe(input.stepName, "step")}\nInstructions: ${promptSafe(input.stepInstructions.slice(0, 2000), "instructions")}\nPrevious output: ${promptSafe((input.previousOutput ?? "none").slice(0, 5000), "previous")}\nCurrent input: ${promptSafe(input.currentInput.slice(0, 5000), "input")}` },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const p = PipelineStepZod.safeParse(raw);
    return p.success ? { ...p.data, source: "LLM" } : fallback();
  } catch { return fallback(); }
}
