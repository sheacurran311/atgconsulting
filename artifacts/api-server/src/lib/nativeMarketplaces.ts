import { type NativePlatform } from "./automationLibrary";

export const marketplaceDirectories = [
  { provider: "chatgpt", name: "ChatGPT plugins", url: "https://chatgpt.com/plugins" },
  { provider: "grok_bot", name: "Grok Bot marketplace", url: "https://x.ai/bot/marketplace" },
  { provider: "claude", name: "Claude plugins", url: "https://claude.com/marketplace/plugins" },
] as const;
export type MarketplaceCandidate = {
  id: string; provider: NativePlatform; name: string; description: string; url: string;
  installs: number | null; rating: number | null; ratingCount: number | null;
  surfaces: string[]; officialVerified: boolean; sourceOrder: number;
};
export type MarketplaceSnapshot = { provider: string; url: string; checkedAt: string; status: "available" | "account_required" | "unavailable"; count: number; note: string; candidates: MarketplaceCandidate[] };

// Read JSON payloads from public Next pages; never evaluate vendor scripts.
export function publicPageObjects(html: string): Record<string, any>[] {
  const chunks: string[] = [];
  for (const m of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?)\)<\/script>/g)) {
    try { const row = JSON.parse(m[1]!); if (typeof row[1] === "string") chunks.push(row[1]); } catch { /* changed markup is reported as unavailable */ }
  }
  const roots: unknown[] = [];
  for (const line of chunks.join("").split("\n")) {
    const colon = line.indexOf(":"); if (colon < 0) continue;
    try { roots.push(JSON.parse(line.slice(colon + 1))); } catch { /* non-JSON flight record */ }
  }
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)) {
    try { roots.push(JSON.parse(m[1]!)); } catch { /* optional structured data */ }
  }
  const objects: Record<string, any>[] = [];
  function visit(value: unknown, depth = 0) { if (!value || typeof value !== "object" || depth > 60) return; if (!Array.isArray(value)) objects.push(value as Record<string, any>); for (const v of Object.values(value)) visit(v, depth + 1); }
  roots.forEach((v) => visit(v)); return objects;
}

export function parseMarketplace(provider: NativePlatform, html: string): MarketplaceCandidate[] {
  const rows = publicPageObjects(html); const out: MarketplaceCandidate[] = []; const seen = new Set<string>();
  const grokCounts = rows.filter((r) => typeof r.installCount === "number").some((r) => r.installCount > 0);
  for (const r of rows) {
    let item: MarketplaceCandidate | undefined;
    if (provider === "claude" && typeof r._id === "string" && (r._id.startsWith("directoryPlugin.") || r._id.startsWith("wf.")) && typeof r.slug === "string" && /^[a-z0-9-]+$/i.test(r.slug) && typeof r.title === "string") {
      item = { id: `claude:${r.slug}`, provider, name: r.title, description: typeof r.subheading === "string" ? r.subheading : "", url: `https://claude.com/marketplace/plugins/${r.slug}`, installs: Number.isSafeInteger(r.installs) && r.installs > 0 ? r.installs : null, rating: null, ratingCount: null, surfaces: Array.isArray(r.worksWith) ? r.worksWith.map((s: any) => s.label).filter((s: unknown) => typeof s === "string") : [], officialVerified: r.anthropicVerified === true, sourceOrder: out.length };
    }
    if (provider === "grok_bot" && typeof r.id === "string" && /^[a-z0-9-]+$/i.test(r.id) && typeof r.name === "string" && typeof r.addHref === "string" && typeof r.description === "string") {
      item = { id: `grok_bot:${r.id}`, provider, name: r.name, description: r.description, url: `https://x.ai/bot/marketplace/bots/${r.id}`, installs: grokCounts && Number.isSafeInteger(r.installCount) && r.installCount >= 0 ? r.installCount : null, rating: null, ratingCount: null, surfaces: ["Grok Bot"], officialVerified: false, sourceOrder: out.length };
    }
    if (item && !seen.has(item.id)) { seen.add(item.id); out.push(item); }
  }
  return out;
}

let cache: { at: number; result: MarketplaceSnapshot[] } | undefined;
let pending: Promise<MarketplaceSnapshot[]> | undefined;
export async function discoverNativeMarketplaces(fetcher: typeof fetch = fetch): Promise<MarketplaceSnapshot[]> {
  if (fetcher === fetch && cache && Date.now() - cache.at < 10 * 60_000) return cache.result;
  if (fetcher === fetch && pending) return pending;
  const run = async () => Promise.all(marketplaceDirectories.map(async (directory): Promise<MarketplaceSnapshot> => {
    const checkedAt = new Date().toISOString();
    if (directory.provider === "chatgpt") return { ...directory, checkedAt, status: "account_required", count: 0, candidates: [], note: "Browse the full Plugins directory in the customer's account, including Popular and workspace listings. Public page data does not expose a usable listing feed here. Add exact listing links below; no ratings or install counts are assumed." };
    try {
      // Fixed official URLs only: no customer intake, arbitrary URLs, cookies or credentials go upstream.
      const response = await fetcher(directory.url, { signal: AbortSignal.timeout(15_000), redirect: "error", headers: { Accept: "text/html", "User-Agent": "ATG-Consulting/1.0 (+https://atgconsulting.io)" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text(); if (html.length > 8_000_000) throw new Error("Listing response too large");
      const candidates = parseMarketplace(directory.provider, html);
      if (!candidates.length) throw new Error("Provider listing format changed or requires a signed-in account");
      return { ...directory, checkedAt, status: "available", count: candidates.length, candidates, note: "All entries exposed in this public page snapshot; private/workspace listings and later catalog changes require an in-account check. Ratings are unavailable in this source. Install counts appear only where the provider publishes usable values; an all-zero placeholder field is treated as unknown. Listing order is not a popularity score. Check Claude / Claude Code compatibility before choosing." };
    } catch (error) { return { ...directory, checkedAt, status: "unavailable", count: 0, candidates: [], note: `Live listings unavailable: ${error instanceof Error ? error.message : "network error"}. Open the official directory and add exact selections manually.` }; }
  }));
  if (fetcher !== fetch) return run();
  pending = run(); try { const result = await pending; cache = { at: Date.now(), result }; return result; } finally { pending = undefined; }
}

export function rankMarketplaceCandidates(rows: MarketplaceCandidate[], query: string, provider: string, sort: string) {
  const words = [...new Set(query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].filter((w) => !["the", "and", "for", "with", "that", "from", "this", "need", "want", "help", "business", "personal", "both"].includes(w));
  const candidates = rows.filter((r) => !provider || provider === "any" || r.provider === provider).map((r) => ({ ...r, fit: words.filter((w) => `${r.name} ${r.description}`.toLowerCase().includes(w)).length }));
  return candidates.filter((r) => !words.length || r.fit > 0).sort((a, b) => {
    // Provider counts describe different populations, so group them, never invent a cross-provider score.
    if (provider === "any" && a.provider !== b.provider) return a.provider.localeCompare(b.provider);
    if (sort === "rating" && a.rating !== b.rating) return (b.rating ?? -1) - (a.rating ?? -1);
    return (b.installs ?? -1) - (a.installs ?? -1) || a.sourceOrder - b.sourceOrder;
  });
}
