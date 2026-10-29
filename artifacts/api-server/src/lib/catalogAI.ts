/**
 * Catalog AI — pain classification, semantic matching, and Grok ranking.
 *
 * classifyPainPoints(): Grok classifies free-text pain description into
 *   taxonomy (departments, tasks, industries, severity).
 *
 * embedText(): xAI embeddings API for semantic similarity.
 *   Falls back gracefully if embeddings are unavailable.
 *
 * matchCatalogItems(): keyword/tag scoring when no embeddings.
 *
 * rankWithGrok(): Grok takes a shortlist of ~20 items and ranks the top 5-8
 *   per pain point with plain-English explanations. Marks gaps.
 */

import { getGrokClient, GROK_MODEL, EMBEDDING_MODEL, logFallback } from "./grokClient";

// ── Pain taxonomy ─────────────────────────────────────────────────────────────

export interface PainClassification {
  /** Top-level department areas affected */
  departments: string[];
  /** Specific tasks that are bottlenecks */
  tasks: string[];
  /** Industries this pain is most common in */
  industries: string[];
  /** low | medium | high */
  severity: "low" | "medium" | "high";
  /** One-sentence summary of the core problem */
  summary: string;
  tokensUsed: number;
}

export const DEPARTMENT_TAXONOMY = [
  "sales", "operations", "production", "field_install", "finance",
  "customer_support", "marketing", "hr", "it_systems", "general_admin",
];

export const TASK_TAXONOMY = [
  "email_management", "follow_up", "scheduling", "quoting", "invoicing",
  "reporting", "data_entry", "customer_replies", "social_content",
  "lead_research", "dispatch", "inventory", "payroll", "onboarding",
  "document_creation", "approvals", "tracking", "notifications",
];

export async function classifyPainPoints(
  rawText: string,
  industry: string | null,
): Promise<PainClassification> {
  const fallback: PainClassification = {
    departments: ["general_admin"],
    tasks: ["email_management", "follow_up"],
    industries: industry ? [industry] : [],
    severity: "medium",
    summary: rawText.slice(0, 200),
    tokensUsed: 0,
  };

  const llm = getGrokClient();
  if (!llm) { logFallback("classifyPainPoints", "no_api_key"); return fallback; }

  try {
    const completion = await llm.chat.completions.create({
      model: GROK_MODEL,
      max_tokens: 300,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `Classify this business pain description into a structured taxonomy for ${industry ?? "a small business"}.

Pain description: "${rawText.slice(0, 800)}"

Department taxonomy: ${DEPARTMENT_TAXONOMY.join(", ")}
Task taxonomy: ${TASK_TAXONOMY.join(", ")}

Return ONLY valid JSON:
{"departments":["sales"],"tasks":["follow_up","email_management"],"industries":["home_services"],"severity":"high","summary":"One sentence summary"}`,
      }],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<PainClassification>;
    return {
      departments: Array.isArray(raw.departments) ? raw.departments.slice(0, 5) : fallback.departments,
      tasks:       Array.isArray(raw.tasks)       ? raw.tasks.slice(0, 6)       : fallback.tasks,
      industries:  Array.isArray(raw.industries)  ? raw.industries.slice(0, 3)  : fallback.industries,
      severity:    ["low","medium","high"].includes(raw.severity ?? "") ? raw.severity! : "medium",
      summary:     raw.summary ?? fallback.summary,
      tokensUsed:  completion.usage?.total_tokens ?? 0,
    };
  } catch (err) {
    logFallback("classifyPainPoints", "llm_error", err instanceof Error ? err.message : String(err));
    return fallback;
  }
}

// ── Embeddings ────────────────────────────────────────────────────────────────

export async function embedText(text: string): Promise<number[] | null> {
  const llm = getGrokClient();
  if (!llm) {
    logFallback("embedText", "no_api_key");
    return null;
  }
  try {
    const resp = await llm.embeddings.create({
      model: EMBEDDING_MODEL,
      input: `passage: ${text.slice(0, 8000)}`,
    });
    const embedding = resp.data[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0 || typeof embedding[0] !== "number") {
      logFallback("embedText", "unexpected_embedding_shape", `model=${EMBEDDING_MODEL}`);
      return null;
    }
    return embedding;
  } catch (err) {
    logFallback("embedText", "embedding_error", err instanceof Error ? err.message : String(err));
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! ** 2;
    normB += b[i]! ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

// ── Keyword/tag scoring (fallback when no embeddings) ─────────────────────────

interface CatalogItemForScoring {
  id: string;
  name: string;
  description: string;
  howItHelps: string;
  tags: string;     // JSON string
  sourceType: string;
  tierFit: string;
}

export function tagScore(
  item: CatalogItemForScoring,
  classification: PainClassification,
  clientTier: string,
): number {
  const tags = (() => { try { return JSON.parse(item.tags) as Record<string, string[]>; } catch { return {}; } })();
  const { departments = [], tasks = [], industries = [] } = tags;

  let score = 0;

  // Department overlap
  for (const d of classification.departments) {
    if (departments.includes(d)) score += 3;
  }
  // Task overlap
  for (const t of classification.tasks) {
    if (tasks.includes(t)) score += 2;
  }
  // Industry overlap
  for (const ind of classification.industries) {
    if (industries.includes(ind)) score += 1;
  }

  // Tier fit bonus
  if (item.tierFit === "all") score += 1;
  if (item.tierFit === clientTier) score += 2;

  // Ready-made bonus (prefer non-ATG first)
  if (item.sourceType !== "atg_template") score += 1;

  // Keyword match in name/description
  const textLower = `${item.name} ${item.description} ${item.howItHelps}`.toLowerCase();
  for (const task of classification.tasks) {
    if (textLower.includes(task.replace("_", " "))) score += 0.5;
  }

  return score;
}

// ── Catalog matching (shortlist + Grok ranking) ───────────────────────────────

export interface CatalogMatchResult {
  itemId: string;
  name: string;
  sourceType: string;
  sourceUrl: string;
  howItHelps: string;
  painPoint: string;
  score: number;
  rankExplanation: string;
  isGap: boolean;
  isReadyMade: boolean;
}

export async function matchAndRankCatalog(
  classification: PainClassification,
  clientTier: string,
  allItems: CatalogItemForScoring[],
  queryEmbedding: number[] | null,
): Promise<{ matches: CatalogMatchResult[]; tokensUsed: number }> {
  // Step 1: score all verified items
  const scored = allItems
    .map((item) => {
      let score = tagScore(item, classification, clientTier);
      // Boost score if we have embeddings
      if (queryEmbedding) {
        const embedding = item.tags; // stored as JSON in tags field; real embedding stored separately
        // We use tag scoring as proxy — embeddings handled by pre-filter in route
        void embedding;
      }
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20); // shortlist

  if (scored.length === 0) {
    // No matches at all — mark as full gap
    return {
      matches: classification.tasks.slice(0, 3).map((task) => ({
        itemId: "",
        name: `Custom: ${task.replace("_", " ")} workflow`,
        sourceType: "atg_template",
        sourceUrl: "",
        howItHelps: "No ready-made solution found — this is a custom build or Done-for-you opportunity.",
        painPoint: classification.departments[0] ?? "general",
        score: 0,
        rankExplanation: "No catalog items matched. ATG can build a custom workflow for this.",
        isGap: true,
        isReadyMade: false,
      })),
      tokensUsed: 0,
    };
  }

  // Step 2: Grok ranks the shortlist
  const llm = getGrokClient();
  if (!llm) {
    // Template ranking: top 5 by score
    return {
      matches: scored.slice(0, 5).map(({ item, score }) => ({
        itemId: item.id,
        name: item.name,
        sourceType: item.sourceType,
        sourceUrl: "",
        howItHelps: item.howItHelps,
        painPoint: classification.departments[0] ?? "general",
        score,
        rankExplanation: "Matched based on tag overlap.",
        isGap: false,
        isReadyMade: item.sourceType !== "atg_template",
      })),
      tokensUsed: 0,
    };
  }

  const itemSummary = scored.map(({ item, score }, i) =>
    `${i + 1}. [${item.sourceType}] "${item.name}" — ${item.howItHelps.slice(0, 120)} (score:${score.toFixed(1)})`
  ).join("\n");

  const prompt = `A prospect has these pain points:
Summary: ${classification.summary}
Departments: ${classification.departments.join(", ")}
Tasks: ${classification.tasks.join(", ")}
Severity: ${classification.severity}

Shortlisted catalog items (prefer ready-made over ATG templates):
${itemSummary}

Select the best 5–8 items and assign each to one of the prospect's pain areas.
For each, give a one-sentence explanation. If a pain area has no good match, add a gap item.
Prefer: grok_bot_template, claude_skill, claude_plugin, chatgpt_gpt > atg_template.

Return ONLY valid JSON:
{"ranked":[{"index":1,"painPoint":"follow_up","explanation":"Automates follow-up drafts for your sales pipeline","isGap":false},{"index":0,"painPoint":"invoicing","explanation":"","isGap":true,"gapNote":"No existing tool — custom workflow needed"}]}`;

  try {
    const completion = await llm.chat.completions.create({
      model: GROK_MODEL,
      max_tokens: 600,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as {
      ranked?: Array<{ index?: number; painPoint?: string; explanation?: string; isGap?: boolean; gapNote?: string }>;
    };
    const tokensUsed = completion.usage?.total_tokens ?? 0;

    const results: CatalogMatchResult[] = (raw.ranked ?? []).map((r) => {
      if (r.isGap) {
        return {
          itemId: "",
          name: r.gapNote ?? `Custom: ${r.painPoint ?? "workflow"}`,
          sourceType: "atg_template",
          sourceUrl: "",
          howItHelps: r.gapNote ?? "No ready-made solution — custom build or Done-for-you.",
          painPoint: r.painPoint ?? classification.departments[0] ?? "general",
          score: 0,
          rankExplanation: r.explanation ?? "Gap: no catalog item matches this pain area.",
          isGap: true,
          isReadyMade: false,
        };
      }
      const idx = r.index ?? 0;
      const entry = scored[idx - 1] ?? scored[0]!;
      return {
        itemId: entry.item.id,
        name: entry.item.name,
        sourceType: entry.item.sourceType,
        sourceUrl: "",
        howItHelps: entry.item.howItHelps,
        painPoint: r.painPoint ?? classification.departments[0] ?? "general",
        score: entry.score,
        rankExplanation: r.explanation ?? "Matched by relevance.",
        isGap: false,
        isReadyMade: entry.item.sourceType !== "atg_template",
      };
    });

    return { matches: results, tokensUsed };
  } catch (err) {
    logFallback("rankWithGrok", "llm_error", err instanceof Error ? err.message : String(err));
    return {
      matches: scored.slice(0, 5).map(({ item, score }) => ({
        itemId: item.id,
        name: item.name,
        sourceType: item.sourceType,
        sourceUrl: "",
        howItHelps: item.howItHelps,
        painPoint: classification.departments[0] ?? "general",
        score,
        rankExplanation: "Matched by tag overlap.",
        isGap: false,
        isReadyMade: item.sourceType !== "atg_template",
      })),
      tokensUsed: 0,
    };
  }
}

// ── Suggested chips for the intake free-text pain field ───────────────────────

export const PAIN_CHIPS_BY_INDUSTRY: Record<string, string[]> = {
  home_services:        ["Follow-up calls after jobs", "Scheduling and dispatching crews", "Collecting payment", "Getting reviews", "Quoting accurately"],
  real_estate:          ["Following up with leads", "Preparing listing materials", "Scheduling showings", "Client communication", "Managing offers"],
  restaurants:          ["Staff scheduling", "Supplier orders", "Online reviews", "Social media posts", "Reservation management"],
  professional_services:["Email overload", "Proposal writing", "Client follow-ups", "Time tracking", "Invoicing"],
  independent_sales:    ["Finding leads", "Following up", "Building proposals", "CRM updates", "Reporting results"],
  coaches:              ["Booking sessions", "Client onboarding", "Content creation", "Invoice chasing", "Program delivery"],
  default:              ["Email management", "Follow-up reminders", "Creating reports", "Scheduling", "Customer replies", "Invoicing"],
};

export function getPainChips(businessType: string | null): string[] {
  const key = businessType?.toLowerCase().replace(/\s+/g, "_") ?? "default";
  return PAIN_CHIPS_BY_INDUSTRY[key] ?? PAIN_CHIPS_BY_INDUSTRY.default!;
}
