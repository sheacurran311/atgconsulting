/**
 * Content engine AI functions.
 *
 * generateContentDraft(topic) — Grok writes a blog post draft.
 * seedInitialContent()       — generates 10 ATG-relevant topic drafts on first boot.
 * generateWeeklyContent()    — scheduled job: 1-2 new drafts per week.
 *
 * Rules (hard in every prompt):
 * - No invented statistics, quotes, or testimonials.
 * - No claims that any AI tool can't connect to apps.
 * - Plain English, 8th-grade reading level, no jargon.
 * - Cite only real linked sources, or none.
 * - All posts status='draft' until Shea approves.
 */

import { getGrokClient, GROK_MODEL, logFallback } from "./grokClient";
import { prisma } from "./db";

export interface ContentDraft {
  topic: string;
  slug: string;
  title: string;
  metaDescription: string;
  body: string;          // markdown
  tags: string[];
  tokensUsed: number;
}

const CONTENT_RULES = `Rules (strictly enforced):
- No invented statistics, surveys, case studies, or testimonials.
- No claims that AI tools cannot connect to apps — they can.
- Plain English, 8th-grade reading level. No jargon: no 'agentic', 'LLM', 'vector DB', 'RAG'.
- No fake quotes. If you cite a source, it must be a real, publicly verifiable one.
- Keep posts practical and specific to small-business owners.
- ATG is mentioned only as the context for setup help — not praised or plugged.`;

const INITIAL_TOPICS: Array<{ topic: string; angle: string }> = [
  { topic: "ops-exception-alerts", angle: "Why most small business ops problems come from missed exceptions, not missing tools — and how AI alert workflows catch them before they cost you." },
  { topic: "ai-prospecting-sales", angle: "A practical guide to using AI for sales prospecting: what it can do (research, draft outreach), what it can't replace (relationships), and how to set it up." },
  { topic: "contractor-scheduling", angle: "How field service and install businesses use automated reminders and dispatch notifications to cut scheduling phone calls in half." },
  { topic: "erp-alerts-small-business", angle: "Even a small business with QuickBooks or a spreadsheet can set up exception alerts — here's what to watch for and how." },
  { topic: "grok-vs-claude-vs-chatgpt", angle: "Choosing between Grok Bot, Claude, and ChatGPT for your business workflows: what each does well, which connects to what, and how to pick." },
  { topic: "invoice-follow-up-automation", angle: "The most common invoice follow-up mistake (waiting too long) and how an AI routine can send the right message at the right time." },
  { topic: "review-requests-home-services", angle: "Why timing matters for review requests and how a simple AI workflow can ask at the exact right moment without sounding robotic." },
  { topic: "email-overload-small-business", angle: "How to triage your inbox with AI: sorting, drafting, and prioritising — without giving AI access to send anything." },
  { topic: "ai-content-calendar-for-local-business", angle: "A one-week social content calendar you can generate in minutes with AI, tailored to your local business and current events." },
  { topic: "what-approval-first-means", angle: "Why 'approval-first' AI workflows matter and how they protect you from costly automated mistakes — with examples from real use cases." },
];

function toSlug(topic: string): string {
  return topic.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function generateContentDraft(
  topic: string,
  angle: string,
): Promise<ContentDraft> {
  const slug = toSlug(topic);
  const fallback: ContentDraft = {
    topic,
    slug,
    title: angle.split(" — ")[0] ?? topic,
    metaDescription: angle.slice(0, 160),
    body: `# ${angle.split(" — ")[0] ?? topic}\n\n${angle}\n\n*This draft is awaiting Shea's review and expansion.*`,
    tags: [topic],
    tokensUsed: 0,
  };

  const llm = getGrokClient();
  if (!llm) { logFallback("generateContentDraft", "no_api_key"); return fallback; }

  try {
    const completion = await llm.chat.completions.create({
      model: GROK_MODEL,
      max_tokens: 1200,
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `Write a practical blog post for ATG Consulting.

Topic: ${topic}
Angle: ${angle}

${CONTENT_RULES}

Target audience: small-business owners, solo operators, and ops managers who are not technical.
Length: 400-600 words.
Format: use markdown headings (## for sections), short paragraphs, and bullet points where helpful.
End with a clear next step (never 'contact us' — point to a practical action).

Return ONLY valid JSON:
{
  "title": "SEO-friendly title (under 65 chars)",
  "metaDescription": "Meta description (120-155 chars, includes the main keyword)",
  "body": "Full markdown post",
  "tags": ["tag1","tag2","tag3"]
}`,
      }],
    });

    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<ContentDraft>;
    return {
      topic,
      slug,
      title: raw.title ?? fallback.title,
      metaDescription: raw.metaDescription ?? fallback.metaDescription,
      body: raw.body ?? fallback.body,
      tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 8) : fallback.tags,
      tokensUsed: completion.usage?.total_tokens ?? 0,
    };
  } catch (err) {
    logFallback("generateContentDraft", "llm_error", err instanceof Error ? err.message : String(err));
    return fallback;
  }
}

/** Called on server start — generates 10 drafts if Content table is empty. */
export async function seedInitialContent(): Promise<void> {
  const count = await prisma.content.count();
  if (count > 0) return;

  const aiEnabled = process.env.AI_ASSIST_ENABLED !== "false";
  for (const { topic, angle } of INITIAL_TOPICS) {
    const draft = aiEnabled
      ? await generateContentDraft(topic, angle).catch(() => null)
      : null;

    await prisma.content.create({
      data: {
        topic,
        slug: toSlug(topic),
        title:           draft?.title           ?? angle.split(" — ")[0] ?? topic,
        metaDescription: draft?.metaDescription ?? angle.slice(0, 160),
        body:            draft?.body            ?? `# ${topic}\n\n${angle}\n\n*Awaiting Shea's review.*`,
        tags:            JSON.stringify(draft?.tags ?? [topic]),
        status:          "draft",
        source:          "grok",
        tokensUsed:      draft?.tokensUsed ?? 0,
      },
    });
  }
}

/** Generates 1-2 new draft posts. Called by the weekly cron. */
export async function generateWeeklyContent(): Promise<{ created: number; tokensUsed: number }> {
  const perWeek = parseInt(process.env.CONTENT_DRAFTS_PER_WEEK ?? "2", 10);
  const existing = await prisma.content.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existing.map((c) => c.slug));

  const candidates = INITIAL_TOPICS.filter((t) => !existingSlugs.has(toSlug(t.topic)));
  const toGenerate = candidates.slice(0, perWeek);

  let created = 0;
  let tokensUsed = 0;

  for (const { topic, angle } of toGenerate) {
    const draft = await generateContentDraft(topic, angle).catch(() => null);
    if (!draft) continue;
    try {
      await prisma.content.create({
        data: {
          topic, slug: draft.slug, title: draft.title,
          metaDescription: draft.metaDescription, body: draft.body,
          tags: JSON.stringify(draft.tags), status: "draft", source: "grok",
          tokensUsed: draft.tokensUsed,
        },
      });
      created++;
      tokensUsed += draft.tokensUsed;
    } catch { /* slug conflict — skip */ }
  }
  return { created, tokensUsed };
}
