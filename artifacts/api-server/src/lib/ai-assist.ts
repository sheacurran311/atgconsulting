/**
 * AI Assist — core logic for Setup Coach, Skill Customizer, Troubleshooter,
 * and Report Refresh.
 *
 * COST CONTROLS (all configurable via env):
 *   AI_ASSIST_ENABLED        — "true" to enable; default off in production until Shea sets it
 *   AI_MODEL_DEFAULT         — model for text features (default: grok-3-mini-latest)
 *   AI_MODEL_VISION          — model for vision/image (default: grok-2-vision-preview)
 *   AI_CAP_SELF_SERVE        — monthly token cap for Self-serve clients (default: 50 000)
 *   AI_CAP_GUIDED            — monthly token cap for Guided clients (default: 150 000)
 *   AI_CAP_DFY               — monthly token cap for DFY clients (default: 500 000)
 *   AI_TOKEN_PRICE_INPUT     — input token price per 1K, for cost estimates (default: 0.0003)
 *   AI_TOKEN_PRICE_OUTPUT    — output token price per 1K (default: 0.0006)
 *   AI_CHAT_LOG_RETENTION_DAYS — how long to keep chat logs (default: 30)
 *   AI_RATE_LIMIT_PER_MIN    — max messages per client per minute (default: 5)
 *
 * Per-feature max_tokens:
 *   coach: 500  |  customize: 1 200  |  troubleshoot: 700  |  refresh: (via llm.ts)
 *
 * Context strategy:
 *   Send only: summarised tool plan (≤300 chars/tool) + matched articles (≤200 chars each)
 *   Conversation window: last 6 turns only
 *   Prompt cache: 60-second in-process cache keyed on sha256(systemPrompt+userMessage)
 */

import OpenAI from "openai";
import { createHash } from "crypto";
import { prisma } from "./db";

// ── Env helpers ───────────────────────────────────────────────────────────────

export function isEnabled(): boolean {
  return process.env.AI_ASSIST_ENABLED === "true";
}

export const DEFAULT_MODEL    = process.env.AI_MODEL_DEFAULT ?? "grok-3-mini-latest";
export const VISION_MODEL     = process.env.AI_MODEL_VISION  ?? "grok-2-vision-preview";
const RATE_LIMIT_PER_MIN      = parseInt(process.env.AI_RATE_LIMIT_PER_MIN ?? "5", 10);
const RETENTION_DAYS          = parseInt(process.env.AI_CHAT_LOG_RETENTION_DAYS ?? "30", 10);

const CAP: Record<string, number> = {
  SELF_SERVE:  parseInt(process.env.AI_CAP_SELF_SERVE ?? "50000",  10),
  GUIDED:      parseInt(process.env.AI_CAP_GUIDED     ?? "150000", 10),
  WHITE_GLOVE: parseInt(process.env.AI_CAP_DFY        ?? "500000", 10),
  NONE:        parseInt(process.env.AI_CAP_SELF_SERVE ?? "50000",  10), // test mode = self-serve cap
};

export const TOKEN_PRICE_INPUT  = parseFloat(process.env.AI_TOKEN_PRICE_INPUT  ?? "0.0003");
export const TOKEN_PRICE_OUTPUT = parseFloat(process.env.AI_TOKEN_PRICE_OUTPUT ?? "0.0006");

// ── OpenAI client (reuses the same key/base as llm.ts) ───────────────────────

function getClient(): OpenAI | null {
  const apiKey = process.env.XAI_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.LLM_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: process.env.LLM_BASE_URL, timeout: 25_000 });
}

// ── In-process prompt cache (60 s TTL) ───────────────────────────────────────

const promptCache = new Map<string, { content: string; tokens: number; expiresAt: number }>();

function cacheKey(system: string, user: string): string {
  return createHash("sha256").update(system + "\x00" + user).digest("hex");
}

function fromCache(system: string, user: string): { content: string; tokens: number } | null {
  const entry = promptCache.get(cacheKey(system, user));
  if (!entry || entry.expiresAt < Date.now()) return null;
  return { content: entry.content, tokens: entry.tokens };
}

function toCache(system: string, user: string, content: string, tokens: number): void {
  promptCache.set(cacheKey(system, user), { content, tokens, expiresAt: Date.now() + 60_000 });
  // Evict entries older than TTL (keep cache bounded)
  if (promptCache.size > 500) {
    const now = Date.now();
    promptCache.forEach((v, k) => { if (v.expiresAt < now) promptCache.delete(k); });
  }
}

// ── Rate limiting (in-process sliding window per clientId) ───────────────────

const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const timestamps = (rateLimitMap.get(clientId) ?? []).filter((t) => now - t < window);
  if (timestamps.length >= RATE_LIMIT_PER_MIN) return false;
  timestamps.push(now);
  rateLimitMap.set(clientId, timestamps);
  return true;
}

// ── Monthly token cap ─────────────────────────────────────────────────────────

export async function checkAndUpdateUsage(
  clientId: string, tier: string, feature: string, tokens: number
): Promise<{ allowed: boolean; used: number; cap: number }> {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const cap = CAP[tier] ?? CAP.NONE!;

  const usage = await prisma.aIAssistUsage.findUnique({
    where: { clientId_month_feature: { clientId, month, feature: "all" } },
  });
  const used = usage?.tokenCount ?? 0;
  if (used + tokens > cap) return { allowed: false, used, cap };

  // Upsert "all" (totals) and per-feature
  const month2 = month; // avoid TS shadowing
  await prisma.$transaction([
    prisma.aIAssistUsage.upsert({
      where: { clientId_month_feature: { clientId, month: month2, feature: "all" } },
      create: { clientId, month: month2, feature: "all", messageCount: 1, tokenCount: tokens },
      update: { messageCount: { increment: 1 }, tokenCount: { increment: tokens } },
    }),
    prisma.aIAssistUsage.upsert({
      where: { clientId_month_feature: { clientId, month: month2, feature } },
      create: { clientId, month: month2, feature, messageCount: 1, tokenCount: tokens },
      update: { messageCount: { increment: 1 }, tokenCount: { increment: tokens } },
    }),
  ]);
  return { allowed: true, used: used + tokens, cap };
}

// ── Log a message pair ────────────────────────────────────────────────────────

export async function logMessages(
  clientId: string, feature: string, userContent: string,
  assistantContent: string, tokens: number, model: string
): Promise<void> {
  await prisma.aIAssistMessage.createMany({
    data: [
      { clientId, feature, role: "user", content: userContent, tokens: 0, model },
      { clientId, feature, role: "assistant", content: assistantContent, tokens, model },
    ],
  });
}

// ── Prune old chat logs (called by cron or on startup) ───────────────────────

export async function pruneOldChatLogs(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  await prisma.aIAssistMessage.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

// ── Context builders ──────────────────────────────────────────────────────────

export interface ClientContext {
  name: string;
  tier: string;
  industry: string | null;
  aiComfort: number;
  areas: string[];
  aiPlatforms: string[];
  toolPlanSummary: string;       // compressed ≤ 1000 chars
  relevantArticles: { title: string; snippet: string }[];
  isGuided: boolean;
}

export async function buildClientContext(clientId: string): Promise<ClientContext | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true, tier: true, industry: true, aiLevel: true, areas: true,
      user: { select: { name: true } },
    },
  });
  if (!client) return null;

  // Fetch intake and tool plan separately
  const [intake, toolPlan] = await Promise.all([
    prisma.intake.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" }, select: { answers: true, areas: true, aiComfort: true } }),
    prisma.toolPlan.findFirst({ where: { clientId, status: { in: ["approved", "draft"] } }, orderBy: { createdAt: "desc" }, select: { toolsJson: true } }),
  ]);

  const answers: Record<string, unknown> = (() => { try { return JSON.parse(intake?.answers ?? "{}") as Record<string, unknown>; } catch { return {}; } })();
  const aiPlatforms: string[] = Array.isArray(answers.aiPlatforms) ? (answers.aiPlatforms as string[]).filter((p) => p !== "none" && p !== "not_sure") : [];
  const areas: string[] = (() => { try { return JSON.parse(intake?.areas ?? "[]") as string[]; } catch { return []; } })();

  // Compressed tool plan
  let toolPlanSummary = "";
  if (toolPlan?.toolsJson) {
    const tools: { name: string; slug?: string; why: string }[] = (() => {
      try { return JSON.parse(toolPlan.toolsJson) as { name: string; slug?: string; why: string }[]; } catch { return []; }
    })();
    toolPlanSummary = tools.slice(0, 6).map((t) =>
      `${t.name}${t.slug ? ` (/go/${t.slug})` : ""}: ${t.why.slice(0, 180)}`
    ).join("\n");
  }

  // Fetch relevant articles (match client's platforms)
  const platformSlugs = aiPlatforms.map((p) => ({
    grok_bot: "grok-bot-getting-started",
    claude: "claude-getting-started",
    chatgpt: "chatgpt-getting-started",
  }[p])).filter(Boolean);

  const articles = await prisma.knowledgeArticle.findMany({
    where: { enabled: true, ...(platformSlugs.length > 0 ? { slug: { in: platformSlugs as string[] } } : {}) },
    orderBy: { sortOrder: "asc" },
    take: 4,
  });

  const relevantArticles = articles.map((a) => ({
    title: a.title,
    snippet: a.body.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.slice(0, 200) ?? "",
  }));

  return {
    name: (client as { user?: { name: string | null } | null }).user?.name ?? "there",
    tier: client.tier,
    industry: client.industry,
    aiComfort: intake?.aiComfort ?? client.aiLevel ?? 1,
    areas,
    aiPlatforms,
    toolPlanSummary,
    relevantArticles,
    isGuided: client.tier === "GUIDED" || client.tier === "WHITE_GLOVE",
  };
}

// ── Conversation history (last 6 turns) ───────────────────────────────────────

export async function getRecentHistory(
  clientId: string, feature: string
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const messages = await prisma.aIAssistMessage.findMany({
    where: { clientId, feature },
    orderBy: { createdAt: "desc" },
    take: 12, // 6 pairs
    select: { role: true, content: true },
  });
  return messages.reverse().map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

// ── Core LLM call ─────────────────────────────────────────────────────────────

export interface AssistResult {
  content: string;
  tokens: number;
  model: string;
  fromCache: boolean;
}

export async function callAssist(opts: {
  system: string;
  history: { role: "user" | "assistant"; content: string }[];
  user: string;
  maxTokens: number;
  model?: string;
  imageBase64?: string;
  imageMime?: string;
}): Promise<AssistResult> {
  const model = opts.model ?? DEFAULT_MODEL;
  const llm = getClient();
  if (!llm) throw new Error("No AI API key configured (set XAI_API_KEY).");

  // Check cache for simple (no-image, no-history) requests
  if (!opts.imageBase64 && opts.history.length === 0) {
    const cached = fromCache(opts.system, opts.user);
    if (cached) return { content: cached.content, tokens: cached.tokens, model, fromCache: true };
  }

  const userMessage: OpenAI.ChatCompletionMessageParam = opts.imageBase64
    ? {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${opts.imageMime ?? "image/png"};base64,${opts.imageBase64}`, detail: "low" } },
          { type: "text", text: opts.user },
        ],
      }
    : { role: "user", content: opts.user };

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.system },
    ...opts.history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content } as OpenAI.ChatCompletionMessageParam)),
    userMessage,
  ];

  const completion = await llm.chat.completions.create({
    model,
    messages,
    max_tokens: opts.maxTokens,
    temperature: 0.4,
  });

  const content = completion.choices[0]?.message?.content ?? "";
  const tokens = (completion.usage?.total_tokens ?? 0);

  if (!opts.imageBase64 && opts.history.length === 0) {
    toCache(opts.system, opts.user, content, tokens);
  }

  return { content, tokens, model, fromCache: false };
}

// ── System prompt builders ────────────────────────────────────────────────────

export function coachSystemPrompt(ctx: ClientContext): string {
  const platformList = ctx.aiPlatforms.length > 0
    ? ctx.aiPlatforms.map((p) => ({ grok_bot: "Grok Bot", claude: "Claude", chatgpt: "ChatGPT" }[p] ?? p)).join(", ")
    : "your AI platform";

  const supportLine = ctx.isGuided
    ? "For anything outside this scope, tell them to message Shea directly or request a session."
    : "For anything outside this scope, tell them to use the support form in their dashboard.";

  const toolBlock = ctx.toolPlanSummary
    ? `\nRecommended tools (with referral links):\n${ctx.toolPlanSummary}`
    : "";

  const articleBlock = ctx.relevantArticles.length > 0
    ? `\nRelevant guides:\n${ctx.relevantArticles.map((a) => `- ${a.title}: ${a.snippet}`).join("\n")}`
    : "";

  return `You are the ATG Setup Coach, a focused assistant for ${ctx.name}.
Your ONLY topics are:
1. Setting up ${platformList} for their specific workflows
2. Installing workflow skills from their ATG Workbench
3. Their recommended tools and how to connect them
4. Troubleshooting their specific setup (errors, connection issues)

STRICT RULES:
- Never discuss other clients, pricing beyond "check their site", or topics unrelated to their setup.
- Do not write code, SQL, shell commands, or claim to connect to external services.
- Never access, send, or read their email or calendar — guide them to do it themselves.
- Keep answers concise (≤200 words). Use numbered steps for instructions.
- If asked off-topic: "I'm your ATG Setup Coach — I can only help with your ${platformList} setup. ${supportLine}"
${toolBlock}${articleBlock}

Client context: tier=${ctx.tier}, industry=${ctx.industry ?? "unknown"}, AI comfort=level ${ctx.aiComfort}/4, focus areas=${ctx.areas.join(", ") || "general"}.`;
}

export function customizerSystemPrompt(): string {
  return `You are an ATG workflow skill customizer.
Given a workflow template and a client context, output ONLY a customized SKILL.md file followed by a platform-specific routine/scheduled-task prompt.

Output format (two sections, separated by ---ROUTINE---):
Section 1: The customized SKILL.md (markdown)
Section 2: The platform routine prompt (plain text, copy-paste ready)

STRICT RULES:
- SKILL.md must include the approval-before-send rule: "Before any email, post, or booking is sent, output the draft and wait for explicit user approval."
- Never include code that accesses external services directly.
- Keep SKILL.md under 800 words.
- Routine prompt must include: trigger description, approval step, what to do with output.`;
}

export function troubleshooterSystemPrompt(ctx: ClientContext): string {
  const platforms = ctx.aiPlatforms.length > 0
    ? ctx.aiPlatforms.map((p) => ({ grok_bot: "Grok Bot", claude: "Claude", chatgpt: "ChatGPT" }[p] ?? p)).join("/")
    : "their AI platform";
  return `You are an ATG troubleshooting assistant for ${ctx.name}.
Their platform: ${platforms}. Their tools: ${ctx.toolPlanSummary ? ctx.toolPlanSummary.split("\n")[0] : "see tool plan"}.

Given an error description and optionally a screenshot, provide:
1. Plain-English explanation of what went wrong (1-2 sentences)
2. Step-by-step fix (numbered, specific to their platform)
3. If still stuck: direct to the support form or (for Guided) session request

STRICT RULES:
- Stay focused on their specific platform and tools.
- Never claim to fix the issue remotely — guide them through the steps.
- Do not write shell commands or code beyond copy-paste prompts.
- Maximum 250 words.`;
}
