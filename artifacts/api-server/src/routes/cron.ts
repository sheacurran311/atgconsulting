/**
 * POST /api/cron/daily-reports
 * Protected by CRON_SECRET header.
 * Idempotent: upserts one DRAFT report per ACTIVE client per day.
 * Auto-publishes if REPORTS_AUTOPUBLISH=true.
 */

import { Router } from "express";
import { prisma } from "../lib/db";
import { generateDailyReport } from "../lib/reports";
import { pruneOldChatLogs } from "../lib/ai-assist";
import { generateWeeklyContent } from "../lib/contentAI";
import { getGrokClient, GROK_MODEL, logFallback } from "../lib/grokClient";
import { harvestCatalogNow } from "../lib/catalogHarvest";
import { publishApprovedContent } from "../lib/contentPublish";
import { notifyShea } from "../lib/email";

const router = Router();

router.post("/cron/daily-reports", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers["x-cron-secret"] as string | undefined;

  if (!secret || !provided || provided !== secret) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in Denver time
  const autoPublish = process.env.REPORTS_AUTOPUBLISH === "true";

  const activeClients = await prisma.client.findMany({ where: { status: "ACTIVE" }, select: { id: true } });

  const results: { clientId: string; status: string }[] = [];

  for (const { id: clientId } of activeClients) {
    try {
      // Check idempotency
      const existing = await prisma.report.findUnique({ where: { clientId_date_kind: { clientId, date: today, kind: "DAILY" } } });
      if (existing) { results.push({ clientId, status: "skipped:exists" }); continue; }

      const contentMarkdown = await generateDailyReport(clientId, today);
      await prisma.report.create({
        data: {
          clientId,
          date: today,
          kind: "DAILY",
          contentMarkdown,
          status: autoPublish ? "PUBLISHED" : "DRAFT",
          publishedAt: autoPublish ? new Date() : null,
        },
      });
      results.push({ clientId, status: autoPublish ? "published" : "draft" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ clientId, status: `error:${msg}` });
    }
  }

  // Prune old AI chat logs after daily reports
  pruneOldChatLogs().catch(console.error);

  // Posts Shea already approved go live. Drafts stay drafts. Nobody is emailed.
  publishApprovedContent().then((count) => {
    if (count > 0) {
      console.info(`[content] Published ${count} approved post(s)`);
      notifyShea("Approved posts published", `${count} approved post(s) are now live on the blog.`).catch(console.error);
    }
  }).catch(console.error);

  // Weekly content: generate new drafts (every 7 calls ~ weekly when cron runs daily)
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 1) { // Monday
    generateWeeklyContent().then(({ created, tokensUsed }) => {
      if (created > 0) console.info(`[content] Generated ${created} new draft(s), ${tokensUsed} tokens`);
    }).catch(console.error);

    // Re-check catalog item URLs for dead links, and pull new public listings.
    checkCatalogLinks().catch(console.error);
    harvestCatalogNow(false).catch(console.error);
  }

  res.json({ ok: true, date: today, processed: results.length, results });
});

// ── Catalog link-check + Grok enrichment ─────────────────────────────────────

async function checkCatalogLinks(): Promise<void> {
  const items = await prisma.catalogItem.findMany({
    where: { enabled: true, sourceUrl: { not: "" } },
    select: { id: true, name: true, sourceUrl: true, tags: true, howItHelps: true },
    orderBy: { lastCheckedAt: "asc" }, // oldest first
    take: 20, // check up to 20 per run
  });

  const llm = getGrokClient();

  for (const item of items) {
    try {
      const r = await fetch(item.sourceUrl, {
        signal: AbortSignal.timeout(6000),
        headers: { "User-Agent": "ATG-Consulting-Bot/1.0" },
      });
      const isAlive = r.ok;
      const html = isAlive ? (await r.text().catch(() => "")) : "";
      const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
      const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ?? "";

      // Mark dead links by disabling
      if (!isAlive) {
        await prisma.catalogItem.update({
          where: { id: item.id },
          data: { enabled: false, reviewNotes: `Dead link detected: HTTP ${r.status}`, lastCheckedAt: new Date() },
        });
        continue;
      }

      // If howItHelps is empty, have Grok fill it in
      let howItHelps = item.howItHelps;
      let tagsJson = item.tags;
      let tokensUsed = 0;
      if (!howItHelps && llm && (title || metaDesc)) {
        try {
          const completion = await llm.chat.completions.create({
            model: GROK_MODEL,
            max_tokens: 200,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [{
              role: "user",
              content: `Fill in catalog metadata for this tool/template.
Name: ${item.name}
Title from page: ${title}
Description from page: ${metaDesc}

Return ONLY valid JSON:
{"howItHelps":"One sentence: how does this specifically help a small business","tags":{"departments":["sales"],"tasks":["follow_up"],"industries":[]}}`,
            }],
          });
          const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as { howItHelps?: string; tags?: Record<string, unknown> };
          if (raw.howItHelps) howItHelps = raw.howItHelps;
          if (raw.tags) tagsJson = JSON.stringify(raw.tags);
          tokensUsed = completion.usage?.total_tokens ?? 0;
        } catch (err) {
          logFallback("checkCatalogLinks", "llm_error", err instanceof Error ? err.message : String(err));
        }
      }

      await prisma.catalogItem.update({
        where: { id: item.id },
        data: {
          lastCheckedAt: new Date(),
          ...(howItHelps !== item.howItHelps ? { howItHelps } : {}),
          ...(tagsJson !== item.tags ? { tags: tagsJson } : {}),
          ...(tokensUsed > 0 ? {} : {}),
        },
      });
    } catch {
      // Network error — skip, try again next week
      await prisma.catalogItem.update({
        where: { id: item.id },
        data: { lastCheckedAt: new Date() },
      }).catch(() => null);
    }
  }
}

export default router;
