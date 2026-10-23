/**
 * Daily report generator.
 * Compiles last-24h activity for a client and asks the LLM for a short digest.
 * Falls back to a template if no LLM key is set or the call fails.
 */

import { prisma } from "./db";

interface ReportData {
  workflowsDone: number;
  workflowsPending: number;
  actionItemsDue: number;
  actionItemsOverdue: number;
  newDocuments: number;
  upcomingConsultation: string | null;
}

async function compileReportData(clientId: string, since: Date): Promise<ReportData> {
  const [wfDone, wfPending, aiDue, aiOverdue, docs, nextConsult] = await Promise.all([
    prisma.workflowItem.count({ where: { clientId, done: true, updatedAt: { gte: since } } }),
    prisma.workflowItem.count({ where: { clientId, done: false } }),
    prisma.actionItem.count({
      where: {
        consultation: { clientId },
        done: false,
        dueAt: { gte: since, lte: new Date() },
      },
    }),
    prisma.actionItem.count({
      where: {
        consultation: { clientId },
        done: false,
        dueAt: { lt: new Date() },
      },
    }),
    prisma.document.count({ where: { clientId, createdAt: { gte: since } } }),
    prisma.consultation.findFirst({
      where: { clientId, scheduledAt: { gte: new Date() }, status: "SCHEDULED" },
      orderBy: { scheduledAt: "asc" },
      select: { scheduledAt: true, title: true },
    }),
  ]);

  return {
    workflowsDone: wfDone,
    workflowsPending: wfPending,
    actionItemsDue: aiDue,
    actionItemsOverdue: aiOverdue,
    newDocuments: docs,
    upcomingConsultation: nextConsult
      ? `"${nextConsult.title}" on ${nextConsult.scheduledAt?.toLocaleDateString("en-US")}`
      : null,
  };
}

function buildTemplateDigest(clientName: string, data: ReportData, date: string): string {
  const lines: string[] = [
    `# Your daily digest — ${date}`,
    `Hi ${clientName},`,
    "",
    "Here's what's on your plate today:",
    "",
  ];

  if (data.workflowsDone > 0)
    lines.push(`✅ You completed **${data.workflowsDone}** workflow item${data.workflowsDone !== 1 ? "s" : ""} yesterday — great progress.`);
  if (data.workflowsPending > 0)
    lines.push(`📋 You have **${data.workflowsPending}** open workflow item${data.workflowsPending !== 1 ? "s" : ""} remaining.`);
  if (data.actionItemsOverdue > 0)
    lines.push(`⚠️ **${data.actionItemsOverdue}** action item${data.actionItemsOverdue !== 1 ? "s are" : " is"} overdue.`);
  if (data.actionItemsDue > 0)
    lines.push(`📌 **${data.actionItemsDue}** action item${data.actionItemsDue !== 1 ? "s are" : " is"} due soon.`);
  if (data.newDocuments > 0)
    lines.push(`📄 **${data.newDocuments}** new document${data.newDocuments !== 1 ? "s were" : " was"} added to your library.`);
  if (data.upcomingConsultation)
    lines.push(`📅 Upcoming consultation: ${data.upcomingConsultation}.`);

  if (lines.length === 5) {
    lines.push("Nothing urgent today. Stay consistent — your workflows are running in the background.");
  }

  lines.push("", "— Shea @ ATG Consulting");
  return lines.join("\n");
}

export async function generateDailyReport(clientId: string, date: string): Promise<string> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: true },
  });
  if (!client) throw new Error(`Client ${clientId} not found`);

  const data = await compileReportData(clientId, since);
  const clientName = client.user.name?.split(" ")[0] ?? "there";

  return buildTemplateDigest(clientName, data, date);
}
