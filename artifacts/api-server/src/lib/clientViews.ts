import type { Client, Document, Report, ToolPlan, Consultation } from "@prisma/client";

// Customer contracts deliberately enumerate fields; new database columns stay private.
export function customerProfile(client: Client) {
  return {
    id: client.id, company: client.company, tier: client.tier, status: client.status,
    industry: client.industry, aiLevel: client.aiLevel, createdAt: client.createdAt,
  };
}

export function customerDocument(doc: Document) {
  return { id: doc.id, title: doc.title, type: doc.type, mime: doc.mime, size: doc.size, visibleToClient: doc.visibleToClient, createdAt: doc.createdAt };
}

export function customerReport(report: Report) {
  return { id: report.id, date: report.date, kind: report.kind, contentMarkdown: report.contentMarkdown, status: report.status, publishedAt: report.publishedAt };
}

export function customerConsultation(call: Consultation) {
  return { id: call.id, title: call.title, scheduledAt: call.scheduledAt, durationMin: call.durationMin, notes: call.notes, status: call.status, recordingUrl: call.recordingUrl };
}

export function customerToolPlan(plan: ToolPlan) {
  return { id: plan.id, status: plan.status, toolsJson: plan.toolsJson, stepsJson: plan.stepsJson, source: plan.source, approvedAt: plan.approvedAt, createdAt: plan.createdAt };
}
