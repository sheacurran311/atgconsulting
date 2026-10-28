/**
 * Shared Grok (xAI) client module.
 *
 * Production environment provides ONLY:
 *   XAI_API_KEY      — required (xAI API key)
 *   AI_MODEL_DEFAULT — model for all text calls (default: grok-4.7)
 *   AI_MODEL_VISION  — model for vision/image calls (default: grok-4.7)
 *   AI_ASSIST_ENABLED — global kill switch
 *
 * No OPENAI_API_KEY, LLM_BASE_URL, or LLM_MODEL are read anywhere.
 * The xAI base URL is hardcoded; it can be overridden by LLM_BASE_URL
 * for local development only — not needed in production.
 */

import OpenAI from "openai";

const XAI_BASE_URL = "https://api.x.ai/v1";

export const GROK_MODEL        = process.env.AI_MODEL_DEFAULT ?? "grok-4.7";
export const GROK_VISION_MODEL = process.env.AI_MODEL_VISION  ?? "grok-4.7";

/** Returns the xAI client, or null if XAI_API_KEY is not set. */
export function getGrokClient(): OpenAI | null {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    // Log once per process, not per request
    if (!getGrokClient._warned) {
      console.warn("[grok] XAI_API_KEY is not set — all AI features will use template fallbacks.");
      getGrokClient._warned = true;
    }
    return null;
  }
  return new OpenAI({
    apiKey,
    // Use the override only for local dev; production hardcodes xAI
    baseURL: process.env.LLM_BASE_URL ?? XAI_BASE_URL,
    timeout: 25_000,
  });
}
getGrokClient._warned = false;

/** True when AI features are enabled (global kill switch). */
export function isGrokEnabled(): boolean {
  return process.env.AI_ASSIST_ENABLED !== "false";
}

/** Log an AI fallback event with a reason. */
export function logFallback(feature: string, reason: string, detail?: string): void {
  const msg = `[grok fallback] feature=${feature} reason=${reason}${detail ? ` detail=${detail}` : ""}`;
  console.warn(msg);
}

/** Simple health check — makes a minimal call and returns ok or the error. */
export async function grokHealthCheck(): Promise<{ ok: boolean; model: string; latencyMs?: number; error?: string }> {
  const client = getGrokClient();
  if (!client) return { ok: false, model: GROK_MODEL, error: "XAI_API_KEY is not set" };
  const t0 = Date.now();
  try {
    await client.chat.completions.create({
      model: GROK_MODEL,
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
      max_tokens: 5,
      temperature: 0,
    });
    return { ok: true, model: GROK_MODEL, latencyMs: Date.now() - t0 };
  } catch (err) {
    return { ok: false, model: GROK_MODEL, error: err instanceof Error ? err.message : String(err) };
  }
}
