import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, type AuthedRequest } from "../lib/auth";
import { audit } from "../lib/audit";

const path = "/admin/clients/:clientId/discovery/:intakeId/delivery";
const milestoneSchema = z.object({
  source: z.literal("approved_proposal"),
  milestones: z.array(z.object({sequence: z.number().int().positive(), title: z.string(), deliverable: z.string()})).max(50),
});
const assignment = z.object({
  consultationId: z.string().min(1).max(100), owner: z.enum(["CLIENT", "ADMIN"]), dueAt: z.string().date(),
  clientVisible: z.boolean(), done: z.boolean(), evidenceReference: z.string().trim().max(500),
  expectedUpdatedAt: z.string().datetime().nullable(),
}).strict().refine(item => !item.done || !!item.evidenceReference, "Completed milestones require verification evidence.");
const action = {id: true, consultationId: true, owner: true, done: true, dueAt: true,
  clientVisible: true, evidenceReference: true, updatedAt: true, sourceMilestoneKey: true} as const;

type Database = Pick<Prisma.TransactionClient, "discoveryIntake" | "discoveryProposal" | "consultation" | "actionItem">;
async function contract(db: Database, clientId: string, intakeId: string) {
  if (!await db.discoveryIntake.findFirst({where: {id: intakeId, clientId}, select: {id: true}})) return null;
  const proposal = await db.discoveryProposal.findUnique({where: {discoveryIntakeId: intakeId}});
  if (!proposal?.acceptedAt || !proposal.approvedAt || !["approved", "portal_published"].includes(proposal.status)) return null;
  try {
    const parsed = milestoneSchema.safeParse(JSON.parse(proposal.deliveryPlanJson));
    return parsed.success ? {id: proposal.id, approvedAt: proposal.approvedAt, milestones: parsed.data.milestones} : null;
  } catch {return null;}
}

export function createDeliveryMilestonesRouter(auth = [withUser, requireAdmin]) {
  const router = Router();
  router.use(path, ...auth, (req, res, next) => {
    const actor = (req as AuthedRequest).atgUser;
    res.set("Cache-Control", "private, no-store");
    if (!actor || actor.role !== "ADMIN" || actor.isImpersonating) {res.sendStatus(403); return;}
    next();
  });
  router.get(path, async (req, res) => {
    const clientId = String(req.params.clientId);
    const accepted = await contract(prisma, clientId, String(req.params.intakeId));
    const consultations = accepted ? await prisma.consultation.findMany({
      where: {clientId, status: {not: "CANCELLED"}}, orderBy: {createdAt: "desc"}, take: 100, select: {id: true, title: true},
    }) : [];
    const rows = accepted ? await prisma.actionItem.findMany({
      where: {consultation: {clientId}, sourceMilestoneKey: {in: accepted.milestones.map(item => accepted.id + ":" + item.sequence)}}, select: action,
    }) : [];
    res.json({consultations, milestones: accepted?.milestones.map(item => ({...item,
      assignment: rows.find(row => row.sourceMilestoneKey === accepted.id + ":" + item.sequence) ?? null})) ?? []});
  });
  router.put(path + "/:sequence", async (req, res) => {
    const input = assignment.safeParse(req.body);
    if (!input.success) {res.status(422).json({error: input.error.issues.map(item => item.message).join(" · ")}); return;}
    const clientId = String(req.params.clientId);
    const intakeId = String(req.params.intakeId);
    const actor = (req as AuthedRequest).atgUser!;
    try {
      const result = await prisma.$transaction(async db => {
        const accepted = await contract(db, clientId, intakeId);
        const sequence = Number(req.params.sequence);
        const milestone = accepted?.milestones.find(item => item.sequence === sequence);
        if (!accepted || !milestone || !await db.consultation.findFirst({
          where: {id: input.data.consultationId, clientId, status: {not: "CANCELLED"}}, select: {id: true},
        })) return "missing";
        const sourceMilestoneKey = accepted.id + ":" + milestone.sequence;
        const item = await db.actionItem.findUnique({where: {sourceMilestoneKey}});
        if ((item?.updatedAt?.toISOString() ?? null) !== input.data.expectedUpdatedAt) return "stale";
        const data = {
          consultationId: input.data.consultationId, owner: input.data.owner, done: input.data.done,
          clientVisible: input.data.clientVisible, evidenceReference: input.data.evidenceReference || null,
          dueAt: new Date(input.data.dueAt + "T00:00:00.000Z"),
        };
        return item ? db.actionItem.update({where: {id: item.id}, data, select: action}) : db.actionItem.create({
          data: {...data, sourceMilestoneKey, text: (milestone.title + " · " + milestone.deliverable).slice(0, 500)}, select: action,
        });
      }, {isolationLevel: Prisma.TransactionIsolationLevel.Serializable});
      if (result === "missing") {res.status(404).json({error: "An accepted milestone and a consultation for this client are required."}); return;}
      if (result === "stale") {res.status(409).json({error: "This assignment changed. Reload before saving."}); return;}
      await audit({actorUserId: actor.id, action: "DELIVERY_MILESTONE_ASSIGNED", entity: "ActionItem", entityId: result.id,
        meta: {clientId, intakeId, clientVisible: result.clientVisible}});
      res.json(result);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
        res.status(409).json({error: "This assignment changed. Reload before saving."}); return;
      }
      throw error;
    }
  });
  return router;
}
export default createDeliveryMilestonesRouter();
