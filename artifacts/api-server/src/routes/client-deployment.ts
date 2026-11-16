import { Router, json, type RequestHandler } from "express";
import { z } from "zod";
import { withUser, requireAdmin, type AuthedRequest } from "../lib/auth";
import { prisma } from "../lib/db";
import { DeploymentPlan, buildClientDeployment, validateDeploymentScope } from "../lib/clientDeployment";
import { discoverNativeMarketplaces, rankMarketplaceCandidates } from "../lib/nativeMarketplaces";
import { parseIntakeAnswers } from "../lib/intakeAnswers";

// A detailed 20-workflow plan is larger than Express's default 100 KB JSON limit.
// Mounted only on this exact endpoint, before the app's default parser.
export const deploymentBodyParser = json({ limit: "2mb" });

export function createClientDeploymentRouter(resolve: RequestHandler = withUser, discover = discoverNativeMarketplaces) {
  const router = Router();
  router.get("/admin/clients/:id/deployment-options", resolve, requireAdmin, async (req, res) => {
    const clientId = req.params.id as string;
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) { res.status(404).json({ error: "Client not found." }); return; }
    const intake = await prisma.discoveryIntake.findFirst({ where: { clientId, consentGiven: true, status: { in: ["new", "reviewed", "report_sent", "converted"] } }, orderBy: { createdAt: "desc" }, select: { answers: true } });
    const parsed = parseIntakeAnswers(intake?.answers);
    const query = typeof req.query.q === "string" ? req.query.q.slice(0, 500) : parsed.topProblems ?? "";
    const provider = typeof req.query.provider === "string" ? req.query.provider : "any";
    const snapshots = await discover();
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ query, suggested: buildClientDeployment(intake?.answers), coverage: snapshots.map(({ candidates, ...info }) => info), candidates: rankMarketplaceCandidates(snapshots.flatMap((s) => s.candidates), query, provider, typeof req.query.sort === "string" ? req.query.sort : "installs") });
  });
  router.patch("/admin/clients/:id/playbook/:pbId/deployment", resolve, requireAdmin, async (req, res) => {
    const parsed = z.object({ expectedUpdatedAt: z.string().datetime(), deployment: DeploymentPlan }).safeParse(req.body);
    if (!parsed.success) { res.status(422).json({ error: parsed.error.issues.map((i) => i.message).join(" ") }); return; }
    const clientId = req.params.id as string;
    const pb = await prisma.clientPlaybook.findFirst({ where: { id: req.params.pbId as string, clientId } });
    if (!pb) { res.status(404).json({ error: "Playbook not found." }); return; }
    if (pb.status === "final") { res.status(409).json({ error: "This playbook is final. Regenerate a draft before editing the implementation list." }); return; }
    if (new Date(pb.updatedAt).toISOString() !== parsed.data.expectedUpdatedAt) { res.status(409).json({ error: "The playbook changed. Reload it before saving your implementation list." }); return; }
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { tier: true } });
    const scopeError = validateDeploymentScope(parsed.data.deployment, client?.tier ?? "NONE");
    if (scopeError) { res.status(422).json({ error: scopeError }); return; }
    let content: Record<string, unknown>; try { content = JSON.parse(pb.content); if (!content || typeof content !== "object" || Array.isArray(content)) throw new Error(); } catch { res.status(422).json({ error: "The saved playbook content is invalid. Generate a new draft." }); return; }
    const saved = await prisma.clientPlaybook.updateMany({ where: { id: pb.id, clientId, status: "draft", updatedAt: pb.updatedAt }, data: { content: JSON.stringify({ ...content, deployment: parsed.data.deployment }) } });
    if (saved.count !== 1) { res.status(409).json({ error: "The playbook changed while saving. Reload before retrying." }); return; }
    await prisma.auditLog.create({ data: { actorUserId: (req as AuthedRequest).atgUser!.id, entity: "ClientPlaybook", entityId: pb.id, action: "DEPLOYMENT_LIST_SAVED", meta: JSON.stringify({ clientId, entries: parsed.data.deployment.entries.length }) } });
    res.json(await prisma.clientPlaybook.findFirst({ where: { id: pb.id, clientId } }));
  });
  return router;
}
export default createClientDeploymentRouter();
