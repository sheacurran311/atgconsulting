import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type RequestHandler } from "express";
import request from "supertest";
import Stripe from "stripe";
import { prisma } from "./lib/db";
import type { AuthedRequest } from "./lib/auth";
import { reviewedInvestment } from "./lib/customQuote";
import { createQuotePaymentsRouter, quoteLiveWebhook, quoteTestWebhook } from "./routes/quotePayments";

const webhookSecret = "whsec_fixture";
const signing = new Stripe("sk_test_fixture");
const modeEnv = {
  ATG_LIVE_QUOTE_PAYMENTS: "true", ATG_QUOTE_STRIPE_LIVE_KEY: "sk_live_synthetic",
  ATG_QUOTE_STRIPE_LIVE_WEBHOOK_SECRET: webhookSecret, ATG_TEST_QUOTE_PAYMENTS: "false",
};

test("one-time live billing cannot be enabled by a test key or without a signing secret", async () => {
  const saved = Object.fromEntries(Object.keys(modeEnv).map(name => [name, process.env[name]]));
  try {
    Object.assign(process.env, {...modeEnv, ATG_QUOTE_STRIPE_LIVE_KEY: "sk_test_fixture"});
    const app = express().use(express.json(), createQuotePaymentsRouter([], []));
    await request(app).post("/portal/proposal/x/installments/0/checkout").send({}).expect(404);
    Object.assign(process.env, {...modeEnv, ATG_QUOTE_STRIPE_LIVE_WEBHOOK_SECRET: ""});
    await request(app).post("/portal/proposal/x/installments/0/checkout").send({}).expect(404);
  } finally {Object.entries(saved).forEach(([key, value]) => value === undefined ? delete process.env[key] : process.env[key] = value);}
});

test("one-time Stripe installment requires operator authorization and reconciles signed duplicate and refund events", {
  skip: !process.env.ATG_INTEGRATION_DATABASE_URL,
}, async () => {
  process.env.DATABASE_URL = process.env.ATG_INTEGRATION_DATABASE_URL;
  const saved = Object.fromEntries(Object.keys(modeEnv).map(name => [name, process.env[name]]));
  Object.assign(process.env, modeEnv);
  const [owner, other] = await Promise.all([0, 1].map(() => prisma.user.create({
    data: {email: randomUUID() + "@example.invalid", client: {create: {}}}, include: {client: true},
  })));
  const clientId = owner!.client!.id;
  const intake = await prisma.discoveryIntake.create({data: {clientId, expiresAt: new Date("2030-01-01"), consentGiven: true}});
  const proposal = await prisma.discoveryProposal.create({data: {
    discoveryIntakeId: intake.id, status: "approved", approvedAt: new Date(),
    investment: JSON.stringify(reviewedInvestment({workstreams: [{label: "Setup", amount: "1000"}], installments: [{label: "Deposit", amount: "1000"}]})),
  }});
  const auth: RequestHandler = (req, _res, next) => {
    const kind = req.get("x-fixture");
    const user = kind === "other" ? other! : owner!;
    if (kind) (req as AuthedRequest).atgUser = {id: user.id, clientId: user.client!.id,
      role: kind === "admin" ? "ADMIN" : "CLIENT", isImpersonating: kind === "impersonator"} as AuthedRequest["atgUser"];
    next();
  };
  let payload: Stripe.Checkout.SessionCreateParams | undefined;
  let idempotencyKey: string | undefined;
  let calls = 0;
  const stripe = () => ({checkout: {sessions: {
    create: async (input: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions) => {
      calls++; payload = input; idempotencyKey = options.idempotencyKey;
      return {id: "cs_fixture", livemode: true, url: "https://checkout.stripe.com/c/pay/cs_fixture"};
    },
  }}} as unknown as Stripe);
  const app = express();
  app.post("/stripe/live", express.raw({type: "application/json"}), quoteLiveWebhook);
  app.post("/stripe/test", express.raw({type: "application/json"}), quoteTestWebhook);
  app.use(express.json(), createQuotePaymentsRouter([auth], [auth], stripe));
  const checkout = "/portal/proposal/" + proposal.id + "/installments/0/checkout";
  const authorize = "/admin/clients/" + clientId + "/discovery/" + intake.id + "/billing/0/authorize";
  const admin = {"x-fixture": "admin"};
  const client = {"x-fixture": "client"};
  const event = (type: string, data: unknown, livemode = true) => JSON.stringify({id: "evt_fixture", type, livemode, data: {object: data}});
  const webhook = (event: string, route = "/stripe/live") => request(app).post(route).set("Content-Type", "application/json")
    .set("Stripe-Signature", signing.webhooks.generateTestHeaderString({payload: event, secret: webhookSecret})).send(event);

  try {
    await request(app).post(authorize).set(admin).send({confirm: true}).expect(404);
    await prisma.discoveryProposal.update({where: {id: proposal.id}, data: {acceptedAt: new Date()}});
    await request(app).post(checkout).set(client).send({}).expect(404);
    await request(app).post(authorize).set(client).send({confirm: true}).expect(403);
    await request(app).post(authorize).set(admin).send({confirm: false}).expect(403);
    await request(app).post(authorize).set(admin).send({confirm: true}).expect(200);
    await request(app).post(checkout).set({"x-fixture": "other"}).send({}).expect(404);
    await request(app).post(checkout).set({"x-fixture": "impersonator"}).send({}).expect(403);
    await request(app).post(checkout).set({...client, "sec-fetch-site": "cross-site"}).send({}).expect(403);
    await request(app).post(checkout).set(client).send({}).expect(200);
    assert.equal(calls, 1);
    assert.match(idempotencyKey ?? "", /^quote-/);
    assert.equal(payload?.mode, "payment");
    assert.equal(payload?.line_items?.[0]?.price_data?.unit_amount, 100000);
    assert.equal(payload?.invoice_creation?.enabled, true);
    const entry = await prisma.quoteInstallment.findFirstOrThrow({where: {proposalId: proposal.id}});
    const session = {
      id: "cs_fixture", mode: "payment", currency: "usd", payment_status: "paid",
      metadata: payload?.metadata, client_reference_id: clientId, amount_total: 100000, livemode: true, invoice: "in_fixture",
    };
    await request(app).post("/stripe/live").set("Content-Type", "application/json").send(event("checkout.session.completed", session)).expect(400);
    await webhook(event("checkout.session.completed", {...session, amount_total: 1})).expect(200);
    assert.equal((await prisma.quoteInstallment.findUniqueOrThrow({where: {id: entry.id}})).paidAt, null);
    await webhook(event("checkout.session.completed", session, false)).expect(200);
    assert.equal((await prisma.quoteInstallment.findUniqueOrThrow({where: {id: entry.id}})).paidAt, null);
    await webhook(event("checkout.session.completed", session)).expect(200);
    await webhook(event("checkout.session.completed", session)).expect(200);
    assert.equal((await prisma.quoteInstallment.findUniqueOrThrow({where: {id: entry.id}})).invoiceId, "in_fixture");
    await request(app).post(checkout).set(client).send({}).expect(200, {paid: true});
    await webhook(event("charge.refunded", {metadata: session.metadata, livemode: true, currency: "usd",
      amount: 100000, amount_refunded: 50000})).expect(200);
    await webhook(event("charge.refunded", {metadata: session.metadata, livemode: true, currency: "usd",
      amount: 100000, amount_refunded: 30000})).expect(200);
    assert.equal((await prisma.quoteInstallment.findUniqueOrThrow({where: {id: entry.id}})).refundedCents, 50000);
  } finally {
    await prisma.quoteInstallment.deleteMany({where: {proposalId: proposal.id}});
    await prisma.discoveryProposal.delete({where: {id: proposal.id}});
    await prisma.discoveryIntake.delete({where: {id: intake.id}});
    await prisma.user.deleteMany({where: {id: {in: [owner!.id, other!.id]}}});
    Object.entries(saved).forEach(([key, value]) => value === undefined ? delete process.env[key] : process.env[key] = value);
    await prisma.$disconnect();
  }
});
