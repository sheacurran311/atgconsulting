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

  res.json({ ok: true, date: today, processed: results.length, results });
});

export default router;
