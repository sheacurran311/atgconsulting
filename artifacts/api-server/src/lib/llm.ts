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
}

const ToolPlanSchema = z.object({
  tools: z.array(z.object({
    name:     z.string().min(1).max(100),
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

export async function generateToolPlan(input: ToolPlanInput): Promise<ToolPlanOutput> {
  const llm = getClient();
  if (!llm) return buildTemplatePlan(input);

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TOOL_PLAN_SYSTEM },
        { role: "user",   content: buildToolPlanPrompt(input) },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const parsed = ToolPlanSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("[llm] tool plan schema mismatch, using template fallback");
      return buildTemplatePlan(input);
    }
    return { ...parsed.data, source: "LLM" };
  } catch (err) {
    console.error("[llm] tool plan generation failed:", err);
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
}

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
  };
}

export async function generateClientPlaybook(input: PlaybookInput): Promise<PlaybookContent & { source: "LLM" | "TEMPLATE" }> {
  const llm = getClient();
  if (!llm) return { ...buildTemplatePlaybook(input), source: "TEMPLATE" };

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
      console.error("[llm] playbook schema mismatch, using template");
      return { ...buildTemplatePlaybook(input), source: "TEMPLATE" };
    }
    return { ...parsed.data, source: "LLM" };
  } catch (err) {
    console.error("[llm] playbook generation error:", err);
    return { ...buildTemplatePlaybook(input), source: "TEMPLATE" };
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

import { TEMPLATE_SEEDS } from "./templates";

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
