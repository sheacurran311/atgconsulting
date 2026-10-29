/**
 * Pull catalog candidates from real public listings.
 *
 * Sources that publish a machine-readable or HTML listing:
 *   - MCP registry: https://registry.modelcontextprotocol.io/v0.1/servers
 *   - Claude plugins: https://github.com/anthropics/claude-plugins-official (.claude-plugin/marketplace.json)
 *   - Claude skills: https://github.com/anthropics/skills/tree/main/skills
 *   - Grok Bot templates: https://x.ai/bot/marketplace (JSON-LD ListItem URLs only)
 *
 * GPT Store: no unauthenticated public catalog. The discovery endpoint
 * returns 403 without a session, so that source is skipped. URLs are never invented.
 *
 * Each kept URL is link-checked. Grok tags it when XAI_API_KEY is set.
 * New rows are reviewStatus=pending and show up on Admin Today.
 */

import { prisma } from "./db";
import { getGrokClient, GROK_MODEL, logFallback } from "./grokClient";

const UA = "ATG-Consulting-Bot/1.0 (+https://atgconsulting.io)";
const MAX_NEW_PER_RUN = 12;
const MAX_PER_SOURCE = 4;
const SCAN_LIMIT = 40;
const PENDING_CAP = 40;
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;

export interface HarvestCandidate {
  name: string;
  sourceType: string;
  sourceUrl: string;
  description: string;
  sourceLabel: string;
}

export interface SkippedSource {
  source: string;
  reason: string;
}

export interface HarvestReport {
  status: "ok" | "skipped" | "running";
  startedAt: string;
  finishedAt: string;
  inserted: number;
  linkFailures: number;
  skippedSources: SkippedSource[];
  note?: string;
}

export interface HarvestDeps {
  fetch: typeof fetch;
  pendingCount: () => Promise<number>;
  existingUrls: () => Promise<Set<string>>;
  insert: (row: {
    name: string;
    sourceType: string;
    sourceUrl: string;
    description: string;
    howItHelps: string;
    tags: string;
    reviewNotes: string;
  }) => Promise<void>;
  tag: (item: HarvestCandidate) => Promise<{ howItHelps: string; tags: string } | null>;
}

let lastReport: HarvestReport | null = null;
let lastRunAt = 0;
let inFlight: Promise<HarvestReport> | null = null;

export function lastHarvestReport(): HarvestReport | null {
  return lastReport;
}

export function isPublicHttpsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
    if (host === "0.0.0.0" || host === "metadata.google.internal") return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
    if (host.includes(":")) return false;
    return true;
  } catch {
    return false;
  }
}

export function parseMcpServers(body: unknown): HarvestCandidate[] {
  const servers = (body as { servers?: unknown[] } | null)?.servers;
  if (!Array.isArray(servers)) return [];
  const out: HarvestCandidate[] = [];
  for (const row of servers) {
    const server = (row as { server?: { name?: string; title?: string; description?: string } })?.server;
    const meta = (row as { _meta?: Record<string, { status?: string }> })._meta?.["io.modelcontextprotocol.registry/official"];
    if (!server?.name || meta?.status === "deleted") continue;
    const sourceUrl = `https://registry.modelcontextprotocol.io/v0.1/servers/${encodeURIComponent(server.name)}/versions/latest`;
    if (!isPublicHttpsUrl(sourceUrl)) continue;
    out.push({
      name: (server.title || server.name).slice(0, 180),
      sourceType: "mcp_connector",
      sourceUrl,
      description: (server.description ?? "").slice(0, 500),
      sourceLabel: "MCP registry",
    });
  }
  return out;
}

export function parseClaudeMarketplace(body: unknown): HarvestCandidate[] {
  const plugins = (body as { plugins?: unknown[] } | null)?.plugins;
  if (!Array.isArray(plugins)) return [];
  const out: HarvestCandidate[] = [];
  for (const plugin of plugins) {
    const row = plugin as {
      name?: string;
      description?: string;
      homepage?: string;
      source?: { url?: string };
    };
    const git = row.source?.url ?? "";
    const home = row.homepage ?? "";
    const sourceUrl = isPublicHttpsUrl(git) ? git : isPublicHttpsUrl(home) ? home : "";
    if (!sourceUrl || !row.name) continue;
    out.push({
      name: row.name.slice(0, 180),
      sourceType: "claude_plugin",
      sourceUrl,
      description: (row.description ?? "").slice(0, 500),
      sourceLabel: "Claude plugin marketplace",
    });
  }
  return out;
}

export function parseClaudeSkills(body: unknown): HarvestCandidate[] {
  if (!Array.isArray(body)) return [];
  const out: HarvestCandidate[] = [];
  for (const entry of body) {
    const row = entry as { name?: string; type?: string };
    if (row.type !== "dir" || !row.name || row.name.startsWith(".")) continue;
    if (!/^[a-z0-9-]+$/i.test(row.name)) continue;
    const sourceUrl = `https://github.com/anthropics/skills/tree/main/skills/${row.name}`;
    out.push({
      name: row.name,
      sourceType: "claude_skill",
      sourceUrl,
      description: `Public skill directory in anthropics/skills.`,
      sourceLabel: "Claude skills repository",
    });
  }
  return out;
}

export function parseGrokMarketplace(html: string): HarvestCandidate[] {
  const out: HarvestCandidate[] = [];
  const seen = new Set<string>();
  const re = /\{"@type":"ListItem","position":\d+,"name":"([^"\\]+)","url":"(https:\/\/x\.ai\/bot\/marketplace\/bots\/[a-z0-9-]+)"\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const sourceUrl = match[2]!;
    if (seen.has(sourceUrl) || !isPublicHttpsUrl(sourceUrl)) continue;
    seen.add(sourceUrl);
    out.push({
      name: match[1]!.slice(0, 180),
      sourceType: "grok_bot_template",
      sourceUrl,
      description: `Public Grok Bot template listed at ${sourceUrl}.`,
      sourceLabel: "Grok Bot marketplace",
    });
  }
  return out;
}

async function readText(fetchImpl: typeof fetch, url: string): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const response = await fetchImpl(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": UA, Accept: "application/json, text/html;q=0.9, */*;q=0.8" },
    });
    const text = response.ok ? await response.text() : "";
    return { ok: response.ok, status: response.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  }
}

async function linkAlive(fetchImpl: typeof fetch, url: string): Promise<boolean> {
  if (!isPublicHttpsUrl(url)) return false;
  const result = await readText(fetchImpl, url);
  return result.ok;
}

let notedMissingKey = false;

async function tagWithGrok(item: HarvestCandidate): Promise<{ howItHelps: string; tags: string } | null> {
  const client = getGrokClient();
  if (!client) {
    if (!notedMissingKey) {
      notedMissingKey = true;
      logFallback("catalogHarvest", "no_api_key");
    }
    return null;
  }
  try {
    const completion = await client.chat.completions.create({
      model: GROK_MODEL,
      max_tokens: 220,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `Tag this public catalog listing for a small-business AI consultant.
Use only the name and description given. Do not invent features, prices, stats, or URLs.
Name: ${item.name}
Source: ${item.sourceLabel}
Description: ${item.description.slice(0, 500)}

Return ONLY JSON:
{"howItHelps":"one plain sentence","tags":{"departments":["sales"],"tasks":["follow_up"],"industries":[]}}
departments are a subset of sales, marketing, customer_support, operations, general_admin.
tasks are a subset of follow_up, email_management, social_content, document_creation, reporting, customer_replies, scheduling, research.
industries may be empty.`,
      }],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as {
      howItHelps?: string;
      tags?: { departments?: unknown; tasks?: unknown; industries?: unknown };
    };
    const howItHelps = (raw.howItHelps ?? "").trim().slice(0, 280);
    if (!howItHelps) return null;
    const tags = {
      departments: Array.isArray(raw.tags?.departments) ? raw.tags.departments.filter((v) => typeof v === "string").slice(0, 6) : [],
      tasks: Array.isArray(raw.tags?.tasks) ? raw.tags.tasks.filter((v) => typeof v === "string").slice(0, 6) : [],
      industries: Array.isArray(raw.tags?.industries) ? raw.tags.industries.filter((v) => typeof v === "string").slice(0, 6) : [],
    };
    return { howItHelps, tags: JSON.stringify(tags) };
  } catch (err) {
    logFallback("catalogHarvest", "llm_error", err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function loadSources(fetchImpl: typeof fetch): Promise<{ candidates: HarvestCandidate[]; skipped: SkippedSource[] }> {
  const skipped: SkippedSource[] = [];
  const candidates: HarvestCandidate[] = [];

  const mcp = await readText(fetchImpl, "https://registry.modelcontextprotocol.io/v0.1/servers?limit=50&version=latest");
  if (!mcp.ok) {
    skipped.push({ source: "MCP registry", reason: `Public registry did not respond (HTTP ${mcp.status || "network"}).` });
  } else {
    try {
      candidates.push(...parseMcpServers(JSON.parse(mcp.text)));
    } catch {
      skipped.push({ source: "MCP registry", reason: "Registry response was not JSON." });
    }
  }

  const plugins = await readText(
    fetchImpl,
    "https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/.claude-plugin/marketplace.json",
  );
  if (!plugins.ok) {
    skipped.push({ source: "Claude plugin marketplace", reason: `Official marketplace.json was not reachable (HTTP ${plugins.status || "network"}).` });
  } else {
    try {
      candidates.push(...parseClaudeMarketplace(JSON.parse(plugins.text)));
    } catch {
      skipped.push({ source: "Claude plugin marketplace", reason: "marketplace.json was not valid JSON." });
    }
  }

  const skills = await readText(
    fetchImpl,
    "https://api.github.com/repos/anthropics/skills/contents/skills?ref=main",
  );
  if (!skills.ok) {
    skipped.push({ source: "Claude skills repository", reason: `GitHub contents API was not reachable (HTTP ${skills.status || "network"}).` });
  } else {
    try {
      candidates.push(...parseClaudeSkills(JSON.parse(skills.text)));
    } catch {
      skipped.push({ source: "Claude skills repository", reason: "GitHub contents response was not JSON." });
    }
  }

  const grok = await readText(fetchImpl, "https://x.ai/bot/marketplace");
  if (!grok.ok) {
    skipped.push({ source: "Grok Bot marketplace", reason: `https://x.ai/bot/marketplace was not reachable (HTTP ${grok.status || "network"}).` });
  } else {
    const listed = parseGrokMarketplace(grok.text);
    if (listed.length === 0) {
      skipped.push({ source: "Grok Bot marketplace", reason: "The public page did not include template listing URLs, so none were added." });
    } else {
      candidates.push(...listed);
    }
  }

  const gpt = await readText(
    fetchImpl,
    "https://chatgpt.com/public-api/gizmos/discovery/productivity?limit=5&locale=en",
  );
  if (!gpt.ok) {
    skipped.push({
      source: "GPT Store",
      reason: `No unauthenticated public catalog (discovery endpoint HTTP ${gpt.status || "network"}). No GPT URLs were added.`,
    });
  } else {
    skipped.push({
      source: "GPT Store",
      reason: "The discovery response did not include a documented public listing of GPT URLs, so none were added.",
    });
  }

  return { candidates, skipped };
}

export async function runCatalogHarvest(deps: HarvestDeps): Promise<HarvestReport> {
  const startedAt = new Date().toISOString();
  const pending = await deps.pendingCount();
  if (pending >= PENDING_CAP) {
    return {
      status: "skipped",
      startedAt,
      finishedAt: new Date().toISOString(),
      inserted: 0,
      linkFailures: 0,
      skippedSources: [],
      note: `Pending harvest queue is full (${PENDING_CAP}). Approve or reject items on Today before more are added.`,
    };
  }

  const { candidates, skipped } = await loadSources(deps.fetch);
  const existing = await deps.existingUrls();
  const addedBySource = new Map<string, number>();
  const scannedBySource = new Map<string, number>();
  let inserted = 0;
  let linkFailures = 0;

  for (const candidate of candidates) {
    if (inserted >= MAX_NEW_PER_RUN) break;
    const seen = scannedBySource.get(candidate.sourceLabel) ?? 0;
    if (seen >= SCAN_LIMIT) continue;
    scannedBySource.set(candidate.sourceLabel, seen + 1);
    const added = addedBySource.get(candidate.sourceLabel) ?? 0;
    if (added >= MAX_PER_SOURCE) continue;
    if (existing.has(candidate.sourceUrl)) continue;
    if (!isPublicHttpsUrl(candidate.sourceUrl)) continue;

    const alive = await linkAlive(deps.fetch, candidate.sourceUrl);
    if (!alive) {
      linkFailures += 1;
      continue;
    }

    let tagged = await deps.tag(candidate);
    if (!tagged) {
      tagged = {
        howItHelps: candidate.description.slice(0, 280),
        tags: JSON.stringify({ departments: [], tasks: [], industries: [] }),
      };
    }

    await deps.insert({
      name: candidate.name,
      sourceType: candidate.sourceType,
      sourceUrl: candidate.sourceUrl,
      description: candidate.description,
      howItHelps: tagged.howItHelps,
      tags: tagged.tags,
      reviewNotes: `Harvested from ${candidate.sourceLabel} on ${startedAt.slice(0, 10)}. Link check passed.`,
    });
    existing.add(candidate.sourceUrl);
    addedBySource.set(candidate.sourceLabel, added + 1);
    inserted += 1;
  }

  return {
    status: "ok",
    startedAt,
    finishedAt: new Date().toISOString(),
    inserted,
    linkFailures,
    skippedSources: skipped,
  };
}

function prismaDeps(): HarvestDeps {
  return {
    fetch: globalThis.fetch,
    pendingCount: async () => prisma.catalogItem.count({
      where: { reviewStatus: "pending", reviewNotes: { contains: "Harvested from" } },
    }),
    existingUrls: async () => {
      const rows = await prisma.catalogItem.findMany({
        where: { sourceUrl: { not: "" } },
        select: { sourceUrl: true },
      });
      return new Set(rows.map((row) => row.sourceUrl));
    },
    insert: async (row) => {
      await prisma.catalogItem.create({
        data: {
          ...row,
          tierFit: "all",
          verified: false,
          enabled: true,
          reviewStatus: "pending",
        },
      });
    },
    tag: tagWithGrok,
  };
}

/** Run the harvest. Boot passes force=true. Later calls inside 12 hours return the last report. */
export function harvestCatalogNow(force = false): Promise<HarvestReport> {
  if (inFlight) return inFlight;
  if (!force && lastReport && Date.now() - lastRunAt < MIN_INTERVAL_MS) return Promise.resolve(lastReport);
  lastReport = {
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: "",
    inserted: 0,
    linkFailures: 0,
    skippedSources: [],
  };
  inFlight = runCatalogHarvest(prismaDeps())
    .then((report) => {
      lastReport = report;
      lastRunAt = Date.now();
      const skipped = report.skippedSources.map((item) => `${item.source}: ${item.reason}`).join(" | ");
      console.info(`[catalog-harvest] inserted=${report.inserted} linkFailures=${report.linkFailures}${report.note ? ` note=${report.note}` : ""}${skipped ? ` skipped=${skipped}` : ""}`);
      return report;
    })
    .catch((err: unknown) => {
      const report: HarvestReport = {
        status: "skipped",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        inserted: 0,
        linkFailures: 0,
        skippedSources: [],
        note: err instanceof Error ? err.message : String(err),
      };
      lastReport = report;
      lastRunAt = Date.now();
      console.error("[catalog-harvest] failed:", report.note);
      return report;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function startCatalogHarvestSchedule(): void {
  void harvestCatalogNow(true);
  const timer = setInterval(() => {
    void harvestCatalogNow(false);
  }, 24 * 60 * 60 * 1000);
  timer.unref?.();
}
