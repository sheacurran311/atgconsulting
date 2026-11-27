import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { prisma } from "./lib/db";
import type { AuthedRequest } from "./lib/auth";
import { createDeliveryMilestonesRouter } from "./routes/deliveryMilestones";
import { createClientRouter } from "./routes/client";

test("accepted milestones reuse existing actions with tenant limits and publication controls", {
  skip: !process.env.ATG_INTEGRATION_DATABASE_URL,
}, async () => {
  process.env.DATABASE_URL = process.env.ATG_INTEGRATION_DATABASE_URL;
  const [user, other] = await Promise.all([0, 1].map(() => prisma.user.create({
    data: {email: randomUUID() + "@example.invalid", client: {create: {}}}, include: {client: true},
  })));
  const [clientId, otherId] = [user!.client!.id, other!.client!.id];
  const [meeting, otherMeeting] = await Promise.all([clientId, otherId].map(clientId => prisma.consultation.create({
    data: {clientId, title: "First review"},
  })));
  const intake = await prisma.discoveryIntake.create({data: {clientId, expiresAt: new Date("2030-01-01")}});
  const proposal = await prisma.discoveryProposal.create({data: {discoveryIntakeId: intake.id, status: "approved", approvedAt: new Date(),
    deliveryPlanJson: JSON.stringify({source: "approved_proposal", milestones: [{sequence: 1, title: "Workflow proof", deliverable: "Reviewed trials"}]})}});
  const auth: RequestHandler = (req, _res, next) => {
    const role = req.get("x-fixture");
    if (role) (req as AuthedRequest).atgUser = {id: user!.id, role: role === "admin" ? "ADMIN" : "CLIENT",
      clientId: role === "other" ? otherId : clientId, email: user!.email, isImpersonating: false} as AuthedRequest["atgUser"];
    next();
  };
  const app = express().use(express.json(), createDeliveryMilestonesRouter([auth]), createClientRouter(auth));
  const path = "/admin/clients/" + clientId + "/discovery/" + intake.id + "/delivery";
  const admin = {"x-fixture": "admin"};
  const client = {"x-fixture": "client"};
  const payload = {consultationId: meeting!.id, owner: "CLIENT", dueAt: "2026-12-05", clientVisible: false,
    done: false, evidenceReference: "", expectedUpdatedAt: null};

  try {
    await request(app).put(path + "/1").set(admin).send(payload).expect(404);
    await prisma.discoveryProposal.update({where: {id: proposal.id}, data: {acceptedAt: new Date()}});
    await request(app).put(path + "/1").set(admin).send({...payload, consultationId: otherMeeting!.id}).expect(404);
    await request(app).put(path + "/1").set(admin).send({...payload, done: true}).expect(422);
    const created = await request(app).put(path + "/1").set(admin).send(payload).expect(200);
    assert.equal((await request(app).get("/client/consultations/" + meeting!.id).set(client).expect(200)).body.actionItems.length, 0);
    await request(app).put(path + "/1").set(admin).send(payload).expect(409);
    const published = await request(app).put(path + "/1").set(admin).send({...payload, clientVisible: true, done: true,
      evidenceReference: "private approval log", expectedUpdatedAt: created.body.updatedAt}).expect(200);
    assert.equal(created.body.id, published.body.id);
    const visible = (await request(app).get("/client/consultations/" + meeting!.id).set(client).expect(200)).body.actionItems;
    assert.equal(visible[0].readOnly, true);
    assert.equal(visible[0].done, true);
    assert.doesNotMatch(JSON.stringify(visible), /private approval log/);
    await request(app).patch("/client/action-items/" + created.body.id).set(client).expect(409);
    await request(app).get("/client/consultations/" + meeting!.id).set("x-fixture", "other").expect(404);
  } finally {
    await prisma.discoveryProposal.delete({where: {id: proposal.id}});
    await prisma.discoveryIntake.delete({where: {id: intake.id}});
    await prisma.user.deleteMany({where: {id: {in: [user!.id, other!.id]}}});
    await prisma.$disconnect();
  }
});
