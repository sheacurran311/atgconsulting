/**
 * Shared Grok (xAI) client module.
 *
 * One kill switch for every Grok call (intake, coach, content, catalog):
 *   AI_ASSIST_ENABLED — unset or any value other than "false" means on.
 *                       Set to "false" to turn all AI features off.
 *
 * Caps (the only token budgets):
 *   AI_CAP_INTAKE     — tokens per discovery session (default 60 000)
 *   AI_CAP_SELF_SERVE — monthly assist cap (default 250 000)
 *   AI_CAP_GUIDED     — monthly assist cap (default 750 000)
 *   AI_CAP_DFY        — monthly assist cap (default 2 000 000)
 *
 * Production reads XAI_API_KEY, AI_MODEL_DEFAULT, AI_MODEL_VISION,
 * and optionally XAI_EMBEDDING_MODEL. The API host is https://api.x.ai/v1.
 * LLM_BASE_URL is ignored when NODE_ENV is production. It is a local-dev
 * override only. OPENAI_API_KEY is never read.
 */

import OpenAI from "openai";

export const XAI_BASE_URL = "https://api.x.ai/v1";

export const GROK_MODEL        = process.env.AI_MODEL_DEFAULT ?? "grok-4.7";
export const GROK_VISION_MODEL = process.env.AI_MODEL_VISION  ?? "grok-4.7";
/** xAI embeddings model. Docs use id "v1" at POST /v1/embeddings. */
export const EMBEDDING_MODEL   = process.env.XAI_EMBEDDING_MODEL ?? "v1";

export const AI_CAP_INTAKE = parseInt(process.env.AI_CAP_INTAKE ?? "60000", 10);

const MONTHLY_CAP: Record<string, number> = {
  SELF_SERVE:  parseInt(process.env.AI_CAP_SELF_SERVE ?? "250000", 10),
  GUIDED:      parseInt(process.env.AI_CAP_GUIDED ?? "750000", 10),
  WHITE_GLOVE: parseInt(process.env.AI_CAP_DFY ?? "2000000", 10),
  NONE:        parseInt(process.env.AI_CAP_SELF_SERVE ?? "250000", 10),
};

export function monthlyTokenCap(tier: string): number {
  return MONTHLY_CAP[tier] ?? MONTHLY_CAP.NONE!;
}

/** True unless AI_ASSIST_ENABLED is exactly "false". */
export function isAiEnabled(): boolean {
  return process.env.AI_ASSIST_ENABLED !== "false";
}

export const isGrokEnabled = isAiEnabled;

export function resolveGrokBaseUrl(env: { NODE_ENV?: string; LLM_BASE_URL?: string } = process.env): string {
  const override = env.LLM_BASE_URL?.trim();
  if (override && env.NODE_ENV !== "production") return override;
  return XAI_BASE_URL;
}

/** Returns the xAI client, or null if XAI_API_KEY is not set. */
export function getGrokClient(): OpenAI | null {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    if (!getGrokClient._warned) {
      console.warn("[grok] XAI_API_KEY is not set — all AI features will use template fallbacks.");
      getGrokClient._warned = true;
    }
    return null;
  }
  return new OpenAI({
    apiKey,
    baseURL: resolveGrokBaseUrl(),
    timeout: 25_000,
  });
}
getGrokClient._warned = false;

export interface FallbackEvent {
  at: string;
  feature: string;
  reason: string;
  detail?: string;
}

export interface GrokHealth {
  ok: boolean;
  model: string;
  latencyMs?: number;
  error?: string;
  checkedAt: string;
}

const FALLBACK_LIMIT = 40;
const fallbackEvents: FallbackEvent[] = [];
let cachedHealth: GrokHealth | null = null;

/** Recent fallback events, newest first. In-memory for this process. */
export function recentFallbacks(): FallbackEvent[] {
  return [...fallbackEvents].reverse();
}

export function getCachedHealth(): GrokHealth | null {
  return cachedHealth;
}

/** Log an AI fallback event with a reason. */
export function logFallback(feature: string, reason: string, detail?: string): void {
  const msg = `[grok fallback] feature=${feature} reason=${reason}${detail ? ` detail=${detail}` : ""}`;
  console.warn(msg);
  fallbackEvents.push({ at: new Date().toISOString(), feature, reason, ...(detail ? { detail } : {}) });
  if (fallbackEvents.length > FALLBACK_LIMIT) fallbackEvents.splice(0, fallbackEvents.length - FALLBACK_LIMIT);
}

/** Simple health check — makes a minimal call and returns ok or the error. */
export async function grokHealthCheck(): Promise<GrokHealth> {
  const client = getGrokClient();
  const checkedAt = new Date().toISOString();
  if (!client) {
    cachedHealth = { ok: false, model: GROK_MODEL, error: "XAI_API_KEY is not set", checkedAt };
    return cachedHealth;
  }
  const t0 = Date.now();
  try {
    await client.chat.completions.create({
      model: GROK_MODEL,
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
      max_tokens: 5,
      temperature: 0,
    });
    cachedHealth = { ok: true, model: GROK_MODEL, latencyMs: Date.now() - t0, checkedAt };
    return cachedHealth;
  } catch (err) {
    cachedHealth = {
      ok: false,
      model: GROK_MODEL,
      error: err instanceof Error ? err.message : String(err),
      checkedAt,
    };
    return cachedHealth;
  }
}
