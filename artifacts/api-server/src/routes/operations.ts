import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";
import { audit } from "../lib/audit";
import { buildOperatingPlan, OperatingPlanSchema, operatingPlanMarkdown } from "../lib/operatingPlan";

export function createOperationsRouter(resolve: RequestHandler = withUser) {
  const router = Router();
  const adminPath = "/admin/clients/:id/operations";
  const clientPath = "/client/operations";
  router.use([adminPath, clientPath], resolve);
  const clientId = (req: AuthedRequest) => req.atgUser?.clientId;

  router.get(adminPath, requireAdmin, async (req, res) => {
    const plan = await prisma.operatingPlan.findUnique({ where: { clientId: req.params.id as string }, include: { events: { orderBy: { createdAt: "desc" }, take: 50 } } });
    res.json({ plan });
  });
  router.post(adminPath, requireAdmin, async (req, res) => {
    const id = req.params.id as string;
    if (!await prisma.client.findUnique({ where: { id }, select: { id: true } })) { res.status(404).json({ error: "Client not found." }); return; }
    if (await prisma.operatingPlan.findUnique({ where: { clientId: id } })) { res.status(409).json({ error: "A plan already exists. Edit it rather than overwriting progress." }); return; }
    const intake = await prisma.discoveryIntake.findFirst({ where: { clientId: id, consentGiven: true }, orderBy: { createdAt: "desc" } });
    try {
      const plan = await prisma.operatingPlan.create({ data: { clientId: id, content: JSON.stringify(buildOperatingPlan(intake?.answers)) } });
      await audit({ actorUserId: (req as AuthedRequest).atgUser!.id, action: "OPERATING_PLAN_CREATED", entity: "OperatingPlan", entityId: plan.id });
      res.status(201).json({ plan });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") { res.status(409).json({ error: "A plan was just created. Reload it." }); return; }
      throw err;
    }
  });
  router.put(adminPath, requireAdmin, async (req, res) => {
    const body = z.object({ version: z.number().int().positive(), content: OperatingPlanSchema, internalNotes: z.string().max(10000) }).safeParse(req.body);
    if (!body.success) { res.status(422).json({ error: body.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }); return; }
    const updated = await prisma.operatingPlan.updateMany({ where: { clientId: req.params.id as string, version: body.data.version }, data: { content: JSON.stringify(body.data.content), internalNotes: body.data.internalNotes, version: { increment: 1 } } });
    if (!updated.count) { res.status(409).json({ error: "This plan changed elsewhere. Reload before saving." }); return; }
    await audit({ actorUserId: (req as AuthedRequest).atgUser!.id, action: "OPERATING_PLAN_UPDATED", entity: "Client", entityId: req.params.id as string });
    res.json({ ok: true });
  });
  router.post(`${adminPath}/publish`, requireAdmin, async (req, res) => {
    const body = z.object({ version: z.number().int().positive() }).safeParse(req.body);
    if (!body.success) { res.status(422).json({ error: "A saved version is required." }); return; }
    const plan = await prisma.operatingPlan.findUnique({ where: { clientId: req.params.id as string } });
    if (!plan) { res.status(404).json({ error: "No plan yet." }); return; }
    if (!OperatingPlanSchema.safeParse(JSON.parse(plan.content)).success) { res.status(422).json({ error: "Review and save a valid plan first." }); return; }
    const result = await prisma.operatingPlan.updateMany({ where: { id: plan.id, version: body.data.version }, data: { publishedContent: plan.content, publishedVersion: plan.version, publishedAt: new Date() } });
    if (!result.count) { res.status(409).json({ error: "The plan changed. Reload and review before publishing." }); return; }
    await audit({ actorUserId: (req as AuthedRequest).atgUser!.id, action: "OPERATING_PLAN_PUBLISHED", entity: "OperatingPlan", entityId: plan.id });
    res.json({ ok: true });
  });
  router.get(clientPath, requireAuth, async (req, res) => {
    const id = clientId(req as AuthedRequest);
    if (!id) { res.status(404).json({ error: "No client profile." }); return; }
    const plan = await prisma.operatingPlan.findUnique({ where: { clientId: id }, select: { id: true, publishedContent: true, publishedVersion: true, publishedAt: true, acceptedVersion: true, acceptedAt: true, events: { orderBy: { createdAt: "desc" }, take: 50 } } });
    // Never serialize draft content or operator notes to a customer.
    res.json({ plan: plan?.publishedContent ? plan : null });
  });
  router.get(`${clientPath}/download`, requireAuth, async (req, res) => {
    const id = clientId(req as AuthedRequest);
    if (!id) { res.status(404).json({ error: "No client profile." }); return; }
    const plan = await prisma.operatingPlan.findUnique({ where: { clientId: id }, select: { publishedContent: true } });
    if (!plan?.publishedContent) { res.status(404).json({ error: "Your guide has not been published yet." }); return; }
    const content = OperatingPlanSchema.parse(JSON.parse(plan.publishedContent));
    const workflowId = typeof req.query.workflow === "string" ? req.query.workflow : null;
    const workflow = workflowId ? content.workflows.find((w) => w.id === workflowId) : null;
    if (workflowId && !workflow) { res.status(404).json({ error: "Workflow not found in your published guide." }); return; }
    res.setHeader("Content-Disposition", `attachment; filename="ATG-${workflow ? workflow.id : "operating-guide"}.md"`);
    const output = operatingPlanMarkdown(workflow ? { ...content, workflows: [workflow] } : content);
    res.type("text/markdown").send(workflow ? `${output}\n\n## Installation checklist\n\n1. Confirm the platform supports every required read/write action.\n2. Connect only the customer's authorized accounts; keep personal and business contexts separate.\n3. Configure the trigger, instructions, permissions, and approval gates above.\n4. Test a normal case, duplicate input, changed date, missing information, revoked access, and failed write.\n5. Check the resulting records, not just the agent's response.\n6. Demonstrate pause, retry, and manual recovery to the owner.\n7. Record dated evidence and obtain acceptance before enabling the agreed schedule.\n\nThis is a setup brief, not executable software. Importing text alone does not connect accounts or activate automation.\n` : output);
  });
  router.post(`${clientPath}/accept`, requireAuth, async (req, res) => {
    const body = z.object({ version: z.number().int().positive(), confirmed: z.literal(true) }).safeParse(req.body);
    const id = clientId(req as AuthedRequest);
    if (!id || !body.success) { res.status(422).json({ error: "Confirm that you reviewed this published version." }); return; }
    const result = await prisma.operatingPlan.updateMany({ where: { clientId: id, publishedVersion: body.data.version, publishedContent: { not: null } }, data: { acceptedVersion: body.data.version, acceptedAt: new Date() } });
    if (!result.count) { res.status(409).json({ error: "The published guide changed. Reload before confirming." }); return; }
    await audit({ actorUserId: (req as AuthedRequest).atgUser!.id, action: "OPERATING_PLAN_ACCEPTED", entity: "Client", entityId: id });
    res.json({ ok: true });
  });
  const EventBody = z.object({ kind: z.enum(["feedback", "test_result", "incident", "successful_run", "measurement"]), note: z.string().trim().min(5).max(2000) });
  router.post(`${clientPath}/events`, requireAuth, async (req, res) => {
    const body = EventBody.safeParse(req.body);
    const id = clientId(req as AuthedRequest);
    if (!id || !body.success) { res.status(422).json({ error: "Choose a report type and enter 5–2,000 characters." }); return; }
    const plan = await prisma.operatingPlan.findUnique({ where: { clientId: id }, select: { id: true, publishedContent: true } });
    if (!plan?.publishedContent) { res.status(404).json({ error: "No published operating guide." }); return; }
    const event = await prisma.operatingEvent.create({ data: { planId: plan.id, actorUserId: (req as AuthedRequest).atgUser!.id, ...body.data } });
    res.status(201).json({ event });
  });
  router.patch(`${adminPath}/events/:eventId`, requireAdmin, async (req, res) => {
    const body = z.object({ resolved: z.boolean() }).safeParse(req.body);
    if (!body.success) { res.status(422).json({ error: "A resolution status is required." }); return; }
    const result = await prisma.operatingEvent.updateMany({ where: { id: req.params.eventId as string, plan: { clientId: req.params.id as string } }, data: { resolvedAt: body.data.resolved ? new Date() : null } });
    if (!result.count) { res.status(404).json({ error: "Report not found." }); return; }
    res.json({ ok: true });
  });
  return router;
}
export default createOperationsRouter();
