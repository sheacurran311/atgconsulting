import { prisma } from "./db";

export async function recentCompletedWork(now = new Date()) {
  const since = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const [content, catalog, intakes, proposals, tickets, requests, applications, messages, consultations, sessions] = await Promise.all([
    prisma.content.findMany({ where: { status: { in: ["approved", "published"] }, updatedAt: { gte: since } }, select: { id: true, title: true, status: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.catalogItem.findMany({ where: { reviewStatus: { in: ["approved", "rejected"] }, updatedAt: { gte: since } }, select: { id: true, name: true, reviewStatus: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.discoveryIntake.findMany({ where: { status: { in: ["reviewed", "report_sent", "converted"] }, updatedAt: { gte: since } }, select: { id: true, contactName: true, contactEmail: true, status: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.discoveryProposal.findMany({ where: { status: { in: ["approved", "portal_published"] }, updatedAt: { gte: since } }, select: { id: true, discoveryIntakeId: true, status: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.supportTicket.findMany({ where: { status: { in: ["replied", "closed"] }, updatedAt: { gte: since } }, select: { id: true, subject: true, status: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.workflowRequest.findMany({ where: { status: { in: ["acknowledged", "designing", "done"] }, updatedAt: { gte: since } }, select: { id: true, clientId: true, status: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.dfyApplication.findMany({ where: { status: { in: ["accepted", "declined"] }, updatedAt: { gte: since } }, select: { id: true, status: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.clientMessage.findMany({ where: { fromAdmin: false, readAt: { gte: since } }, select: { id: true, clientId: true, readAt: true }, orderBy: { readAt: "desc" }, take: 10 }),
    prisma.consultation.findMany({ where: { status: "COMPLETED", updatedAt: { gte: since } }, select: { id: true, clientId: true, title: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.sessionRecord.findMany({ where: { shareRecap: true, updatedAt: { gte: since } }, select: { id: true, clientId: true, sessionType: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
  ]);
  const tasks = [
    ...content.map((r) => ({ type: r.status === "published" ? "content_publish" : "content_draft", id: r.id, label: r.title, meta: r.status === "published" ? "Published on ATG blog" : "Draft approved; publication is a separate step", url: `/admin/content?item=${encodeURIComponent(r.id)}`, completedAt: r.updatedAt })),
    ...catalog.map((r) => ({ type: "catalog_verify", id: r.id, label: r.name, meta: r.reviewStatus === "approved" ? "Catalogue item verified" : "Catalogue item rejected", url: `/admin/catalog?item=${encodeURIComponent(r.id)}`, completedAt: r.updatedAt })),
    ...intakes.map((r) => ({ type: "intake_review", id: r.id, label: r.contactName ?? r.contactEmail ?? "Intake", meta: `Intake ${r.status.replaceAll("_", " ")}`, url: `/admin/discovery?intake=${encodeURIComponent(r.id)}`, completedAt: r.updatedAt })),
    ...proposals.map((r) => ({ type: "proposal_draft", id: r.id, label: "Proposal reviewed", meta: r.status.replaceAll("_", " "), url: `/admin/discovery?intake=${encodeURIComponent(r.discoveryIntakeId)}`, completedAt: r.updatedAt })),
    ...tickets.map((r) => ({ type: "support_ticket", id: r.id, label: r.subject, meta: `Support ${r.status}`, url: `/admin/tiers?tab=support&filter=${r.status}&item=${encodeURIComponent(r.id)}`, completedAt: r.updatedAt })),
    ...requests.map((r) => ({ type: "workflow_request", id: r.id, label: "Workflow request", meta: `Request ${r.status} (not a claim of installation)`, url: `/admin/messages?tab=requests&item=${encodeURIComponent(r.id)}`, completedAt: r.updatedAt })),
    ...applications.map((r) => ({ type: "dfy_application", id: r.id, label: "Done-for-you application", meta: `Application ${r.status}`, url: `/admin/tiers?tab=dfy&item=${encodeURIComponent(r.id)}`, completedAt: r.updatedAt })),
    ...messages.map((r) => ({ type: "client_message", id: r.id, label: "Client message read", meta: "Read; this does not imply a reply was sent", url: `/admin/messages?client=${encodeURIComponent(r.clientId)}`, completedAt: r.readAt! })),
    ...consultations.map((r) => ({ type: "upcoming_session", id: r.id, label: r.title, meta: "Consultation marked completed", url: `/admin/clients/${r.clientId}/consultations?item=${encodeURIComponent(r.id)}`, completedAt: r.updatedAt })),
    ...sessions.map((r) => ({ type: "upcoming_session", id: r.id, label: `${r.sessionType} session recap`, meta: "Reviewed session recap published", url: `/admin/clients/${r.clientId}/sessions?session=${encodeURIComponent(r.id)}`, completedAt: r.updatedAt })),
  ];
  return tasks.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime()).slice(0, 20);
}
