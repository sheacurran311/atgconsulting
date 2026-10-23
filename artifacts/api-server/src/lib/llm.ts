// LLM integration – provider-agnostic via the OpenAI-compatible API.
//
// Supported providers (set env vars to switch):
//   OpenAI:  OPENAI_API_KEY              → baseURL defaults to OpenAI
//   xAI:     XAI_API_KEY                 → set LLM_BASE_URL=https://api.x.ai/v1
//   Together/Fireworks/local Ollama etc. → set LLM_BASE_URL and LLM_API_KEY
//
// Model: defaults to "gpt-4o-mini" (low cost, fast). Override with LLM_MODEL.

import OpenAI from "openai";
import { logger } from "./logger";
import { promptSafe } from "./sanitize";
import type { IntakeFormData, TailoredResponse, Area } from "../types/intake";
import {
  AI_COMFORT_LABELS,
  AREA_LABELS,
  AREA_DESCRIPTIONS,
  TIME_SINK_LABELS,
  TOOL_LABELS,
  PREFERRED_HELP_LABELS,
} from "../types/intake";

function getClient(): OpenAI | null {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.XAI_API_KEY ||
    process.env.LLM_API_KEY;
  if (!apiKey) return null;

  return new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL, // undefined → defaults to OpenAI
  });
}

const MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

// ── Prompt builder ──────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are Shea Curran, founder of ATG Consulting. You help small business owners, independent salespeople, and AI beginners set up AI workflows that run their sales, marketing, executive assistant tasks, and customer support.

When a prospective client fills out your intake form you write them a short, plain-English, personalised recommendation. Respond ONLY with a JSON object matching this TypeScript type (no markdown, no prose outside the JSON):

{
  "aiLevelSummary": string,        // 1-2 sentences: where they are on their AI journey
  "workflows": [                   // 3 or 4 items; at least one per selected area
    {
      "area": "executive_assistant"|"marketing"|"sales"|"customer_support",
      "title": string,             // short title
      "description": string        // 2-3 sentences: what the workflow does and the concrete benefit
    }
  ],
  "quickWin": string,              // 1-3 sentences: the single most impactful thing to do THIS week
  "recommendedTier": "self_serve"|"guided"|"done_for_you",
  "tierRationale": string,         // 1-2 sentences: why this tier fits them specifically
  "ctaText": string                // 15-25 words: personalised CTA to book a call or join the seminar
}

Guidelines:
- No jargon (no "LLM", "vector DB", "RAG" etc.)
- Use their name, role, and industry naturally
- Match explanation depth to their AI comfort level (0=very simple, 4=technical is fine)
- Build on the specific tools they already use
- Address their top time-sinks first
- The quick win should be something they can start TODAY with tools they already have
- Keep total response under 500 words across all fields
- Do NOT invent testimonials, stats, or client names`;
}

function buildUserPrompt(data: IntakeFormData): string {
  const areas = data.areas.map((a) => `${AREA_LABELS[a]}: ${AREA_DESCRIPTIONS[a]}`).join("; ");
  const tools = data.tools.map((t) => TOOL_LABELS[t]).join(", ") || "none listed";
  const timeSinks = data.timeSinks.map((s) => TIME_SINK_LABELS[s]).join(", ") || "not specified";
  const comfortLabel = AI_COMFORT_LABELS[data.aiComfort] ?? "unknown";
  const helpLabel = PREFERRED_HELP_LABELS[data.preferredHelp];

  return `Generate a personalised recommendation for this prospective client:

Name: ${promptSafe(data.name, "name")}
Role: ${promptSafe(data.role, "role")}
Industry: ${promptSafe(data.industry, "industry")}
Business size: ${data.bizSize} employees
Areas they want help with: ${areas}

AI comfort level (${data.aiComfort}/4): ${comfortLabel}
Tools they use today: ${tools}
Biggest time sinks: ${timeSinks}
${data.automateFirst ? `The one thing they'd automate first: ${promptSafe(data.automateFirst, "automate_first")}` : ""}
Hours per week lost to repetitive work: ~${data.hoursLost}
Preferred way to get help: ${helpLabel}
${data.freeText ? `Additional context: ${promptSafe(data.freeText, "additional_context")}` : ""}

Return ONLY the JSON object. No other text.`;
}

// ── Main export ─────────────────────────────────────────────────────────────

export async function generateTailoredResponse(
  data: IntakeFormData
): Promise<TailoredResponse> {
  const client = getClient();

  if (!client) {
    return buildFallbackResponse(data);
  }

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(data) },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as TailoredResponse;
    return { ...parsed, type: "llm" };
  } catch (err) {
    logger.warn({ err }, "Recommendation provider failed; using original rule-based recommendations");
    return buildFallbackResponse(data);
  }
}

// ── Rule-based fallback ──────────────────────────────────────────────────────

function buildFallbackResponse(data: IntakeFormData): TailoredResponse {
  const comfortLabel = AI_COMFORT_LABELS[data.aiComfort] ?? "familiar with AI";
  const name = data.name.split(" ")[0];

  const aiLevelSummary =
    data.aiComfort <= 1
      ? `${name}, you're at the very beginning of your AI journey — and that's the perfect place to start. Everything we'll set up together will be explained in plain English.`
      : data.aiComfort <= 3
      ? `${name}, you've already got some hands-on experience with AI, which means we can skip the basics and move straight to building workflows that save you real hours.`
      : `${name}, you're already running automations — we'll build on what you know and layer in more powerful, connected workflows.`;

  // Build one workflow per selected area (max 4)
  const workflows = buildFallbackWorkflows(data);

  const quickWin = buildQuickWin(data);

  const recommendedTier: TailoredResponse["recommendedTier"] =
    data.preferredHelp === "done_for_you" || data.aiComfort <= 1
      ? "done_for_you"
      : data.preferredHelp === "self_serve" && data.aiComfort >= 3
      ? "self_serve"
      : "guided";

  const tierRationale =
    recommendedTier === "done_for_you"
      ? "Given your comfort level and preference, the White Glove tier makes the most sense: I'll set everything up and hand you a working system."
      : recommendedTier === "self_serve"
      ? "You have the technical confidence to build this yourself. The Self-Serve tier gets you the templates and checklists to move fast."
      : "The Guided tier is the best fit: we'll build your workflows together on live calls so it actually gets done.";

  const ctaText = `Book a free 20-minute call and let's map exactly where AI can take ${data.hoursLost}+ hours a week off your plate.`;

  return {
    aiLevelSummary,
    workflows,
    quickWin,
    recommendedTier,
    tierRationale,
    ctaText,
    type: "fallback",
  };
}

function buildFallbackWorkflows(data: IntakeFormData): TailoredResponse["workflows"] {
  const areaWorkflows: Record<Area, TailoredResponse["workflows"][number]> = {
    sales: {
      area: "sales",
      title: "Weekly prospect list builder",
      description: `Each week, an AI workflow finds new ${data.industry} prospects that match your ideal client profile and builds a list you review on Monday morning. No more blank-page prospecting.`,
    },
    marketing: {
      area: "marketing",
      title: "Content repurposing pipeline",
      description: `Turn one piece of content into a week of social posts, a newsletter snippet, and an SEO summary — automatically. You approve, then publish.`,
    },
    executive_assistant: {
      area: "executive_assistant",
      title: "Smart inbox triage and draft replies",
      description: `Your inbox is scanned each morning: urgent emails are flagged, routine ones get a draft reply ready for one-click send. You stay in control without living in your inbox.`,
    },
    customer_support: {
      area: "customer_support",
      title: "First-response draft generator",
      description: `When a support request comes in, AI drafts a personalised first response based on your FAQ and past replies. You review and send — response times drop without more effort.`,
    },
  };

  return data.areas.slice(0, 4).map((a) => areaWorkflows[a]);
}

function buildQuickWin(data: IntakeFormData): string {
  const topSink = data.timeSinks[0];

  if (topSink === "prospecting" || data.areas.includes("sales")) {
    return `This week: open ChatGPT and paste in the description of your single best client. Ask it to "write 10 search queries I can use to find companies just like this one." That's your prospecting shortlist for the week.`;
  }
  if (topSink === "email" || topSink === "followups") {
    return `This week: pick your most common follow-up situation and ask ChatGPT to write three versions of that email in your voice. Save the best one as a template — you'll send it in seconds next time.`;
  }
  if (topSink === "social_content" || data.areas.includes("marketing")) {
    return `This week: take your last blog post or newsletter and ask ChatGPT to turn it into five LinkedIn posts and three tweet-length ideas. That's a week of content done in 20 minutes.`;
  }
  if (data.areas.includes("executive_assistant")) {
    return `This week: write out the three emails you send most often. Ask ChatGPT to draft a reusable template for each. Paste them into your email client as canned responses — you'll save 20 minutes tomorrow.`;
  }
  return `This week: write down the single task that eats the most time in your week. Ask ChatGPT to suggest three ways AI could handle part of it. Pick the one that sounds easiest and try it today.`;
}
