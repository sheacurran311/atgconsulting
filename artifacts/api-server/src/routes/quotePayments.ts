import { Router, type Request, type Response } from "express";
import { withUser, requireAdmin, requireAuth, type AuthedRequest } from "../lib/auth";
import { prisma } from "../lib/db";
import { cents, savedQuote } from "../lib/customQuote";
import { livePaymentsEnabled, paymentKind, reconcileQuoteRefund, reconcileQuoteSession, testPaymentsEnabled, quoteStripe, type QuotePaymentMode } from "../lib/quotePayments";
import { APP_URL } from "../lib/stripe";

const proposalPath = "/admin/clients/:clientId/discovery/:intakeId/billing";

function ownedInstallments(proposal: {investment: string; status: string; approvedAt: Date | null; acceptedAt: Date | null}) {
  return proposal.approvedAt && proposal.acceptedAt && ["approved", "portal_published"].includes(proposal.status)
    ? savedQuote(proposal.investment)?.installments : undefined;
}

function stageNumber(stage: unknown) {
  return /^\d{1,2}$/.test(String(stage)) ? Number(stage) : -1;
}

function sameOriginJson(req: Request) {
  const origin = req.get("origin");
  return !!req.is("application/json") && req.get("sec-fetch-site") !== "cross-site" &&
    (!origin || origin === new URL(APP_URL).origin);
}

export function createQuotePaymentsRouter(adminAuth = [withUser, requireAdmin], clientAuth = [withUser, requireAuth], stripeFor = quoteStripe) {
  const router = Router();
  router.use(proposalPath, ...adminAuth, (req, res, next) => {
    const actor = (req as AuthedRequest).atgUser;
    res.set("Cache-Control", "private, no-store");
    if (!actor || actor.role !== "ADMIN" || actor.isImpersonating) {res.sendStatus(403); return;}
    next();
  });
  router.get(proposalPath, async (req, res) => {
    const clientId = String(req.params.clientId);
    const intakeId = String(req.params.intakeId);
    const intake = await prisma.discoveryIntake.findFirst({where: {id: intakeId, clientId}, select: {id: true}});
    const proposal = intake ? await prisma.discoveryProposal.findUnique({where: {discoveryIntakeId: intakeId}}) : null;
    const installments = proposal ? ownedInstallments(proposal) : null;
    const ledger = proposal && installments ? await prisma.quoteInstallment.findMany({
      where: {proposalId: proposal.id, clientId},
      select: {stage: true, liveMode: true, authorizedAt: true, invoiceId: true, paidAt: true, refundedCents: true},
    }) : [];
    res.json({accepted: !!installments, liveEnabled: livePaymentsEnabled(),
      installments: installments?.map((item, stage) => ({...item, stage, payment: ledger.find(row => row.stage === stage) ?? null})) ?? []});
  });

  router.post(proposalPath + "/:stage/authorize", async (req, res) => {
    const actor = (req as AuthedRequest).atgUser!;
    if (!livePaymentsEnabled()) {res.sendStatus(404); return;}
    if (!sameOriginJson(req) || req.body?.confirm !== true) {res.sendStatus(403); return;}
    const clientId = String(req.params.clientId);
    const intakeId = String(req.params.intakeId);
    const stage = stageNumber(req.params.stage);
    const intake = await prisma.discoveryIntake.findFirst({where: {id: intakeId, clientId}, select: {id: true}});
    const proposal = intake ? await prisma.discoveryProposal.findUnique({where: {discoveryIntakeId: intakeId}}) : null;
    const item = proposal && ownedInstallments(proposal)?.[stage];
    if (!proposal || !item) {res.sendStatus(404); return;}
    const amountCents = cents(item.amount);
    const row = await prisma.quoteInstallment.upsert({
      where: {proposalId_stage: {proposalId: proposal.id, stage}}, update: {},
      create: {proposalId: proposal.id, stage, clientId, amountCents, liveMode: true, authorizedAt: new Date(), authorizedBy: actor.id},
    });
    if (!row.liveMode || row.clientId !== clientId || row.amountCents !== amountCents || !row.authorizedAt) {
      res.status(409).json({error: "The existing installment ledger requires manual review."});return;
    }
    res.json({authorized: true, authorizedAt: row.authorizedAt});
  });

  for (const mode of ["test", "live"] as const) {
    const suffix = mode === "test" ? "test-checkout" : "checkout";
    router.post("/portal/proposal/:id/installments/:stage/" + suffix, ...clientAuth, async (req, res) => {
      res.set("Cache-Control", "private, no-store");
      const user = (req as AuthedRequest).atgUser;
      const liveMode = mode === "live";
      if (liveMode ? !livePaymentsEnabled() : !testPaymentsEnabled()) {res.sendStatus(404); return;}
      if (!user?.clientId || user.isImpersonating || (liveMode && !sameOriginJson(req))) {res.sendStatus(403); return;}
      const id = String(req.params.id);
      const stage = stageNumber(req.params.stage);
      const proposal = await prisma.discoveryProposal.findUnique({where: {id}});
      const owned = proposal && await prisma.discoveryIntake.findFirst({
        where: {id: proposal.discoveryIntakeId, clientId: user.clientId}, select: {id: true},
      });
      if (!proposal || !owned) {res.sendStatus(404); return;}
      const item = ownedInstallments(proposal)?.[stage];
      if (!proposal.acceptedAt || !proposal.approvedAt) {res.status(409).json({error: "Accept the approved proposal first."}); return;}
      if (!item) {res.sendStatus(404); return;}
      const amountCents = cents(item.amount);
      const where = {proposalId_stage: {proposalId: id, stage}};
      const entry = liveMode
        ? await prisma.quoteInstallment.findUnique({where})
        : await prisma.quoteInstallment.upsert({where, update: {}, create: {proposalId: id, stage, clientId: user.clientId, amountCents}});
      if (!entry || (liveMode && !entry.authorizedAt)) {res.sendStatus(404); return;}
      if (entry.amountCents !== amountCents || entry.clientId !== user.clientId || entry.liveMode !== liveMode) {
        res.sendStatus(409); return;
      }
      if (entry.refundedCents > 0) {res.status(409).json({error: "This installment has a refund. Review it with ATG."}); return;}
      if (entry.paidAt) {res.json({paid: true}); return;}
      const stripe = stripeFor(mode);
      if (entry.sessionId) {
        const session = await stripe.checkout.sessions.retrieve(entry.sessionId);
        if (session.livemode !== liveMode) {res.sendStatus(409); return;}
        if (session.payment_status === "paid") {
          if (await reconcileQuoteSession(session, mode)) res.json({paid: true});
          else res.status(409).json({error: "The payment requires reconciliation."});
          return;
        }
        if (session.status === "open" && session.url) {res.json({url: session.url}); return;}
        if (session.status === "expired") {
          await prisma.quoteInstallment.updateMany({where: {id: entry.id, sessionId: session.id, paidAt: null},
            data: {sessionId: null, checkoutStartedAt: null, attempt: {increment: 1}, attemptedAt: new Date()}});
          res.status(409).json({error: "The Checkout session expired. Select this installment again."}); return;
        }
        res.status(409).json({error: "Payment is processing."}); return;
      }
      const now = new Date();
      let started = entry.checkoutStartedAt ?? entry.attemptedAt;
      if (liveMode && !entry.checkoutStartedAt) {
        await prisma.quoteInstallment.updateMany({
          where: {id: entry.id, attempt: entry.attempt, checkoutStartedAt: null, sessionId: null, paidAt: null},
          data: {checkoutStartedAt: now},
        });
        const current = await prisma.quoteInstallment.findUniqueOrThrow({where: {id: entry.id}});
        if (current.attempt !== entry.attempt || !current.checkoutStartedAt) {res.sendStatus(409); return;}
        started = current.checkoutStartedAt;
      }
      if (Date.now() - started.getTime() > 23 * 3600000) {
        res.status(409).json({error: "Check the previous attempt in Stripe before issuing another session."}); return;
      }
      const metadata = {kind: paymentKind(mode), entryId: entry.id, proposalId: id, attempt: String(entry.attempt)};
      const session = await stripe.checkout.sessions.create({
        mode: "payment", allowed_payment_method_types: ["card"], client_reference_id: user.clientId, metadata,
        line_items: [{quantity: 1, price_data: {currency: "usd", unit_amount: amountCents, product_data: {name: item.label}}}],
        invoice_creation: {enabled: true, invoice_data: {metadata}}, payment_intent_data: {metadata},
        success_url: APP_URL + "/app/proposal", cancel_url: APP_URL + "/app/proposal",
      }, {idempotencyKey: "quote-" + entry.id + "-" + entry.attempt});
      if (session.livemode !== liveMode || !session.url) {res.sendStatus(502); return;}
      await prisma.quoteInstallment.updateMany({where: {id: entry.id, attempt: entry.attempt, paidAt: null}, data: {sessionId: session.id}});
      res.json({url: session.url});
    });
  }
  return router;
}

function quoteWebhook(mode: QuotePaymentMode) {
  return async (req: Request, res: Response) => {
    const secret = mode === "live" ? process.env.ATG_QUOTE_STRIPE_LIVE_WEBHOOK_SECRET : process.env.ATG_QUOTE_STRIPE_TEST_WEBHOOK_SECRET;
    if (!secret || (mode === "live" ? !livePaymentsEnabled() : !testPaymentsEnabled())) {res.sendStatus(404); return;}
    let event;
    try {event = quoteStripe(mode).webhooks.constructEvent(req.body, req.get("stripe-signature") ?? "", secret);}
    catch {res.sendStatus(400); return;}
    if (event.livemode === (mode === "live")) {
      if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        await reconcileQuoteSession(event.data.object, mode);
      }
      if (event.type === "charge.refunded") await reconcileQuoteRefund(event.data.object, mode);
    }
    res.sendStatus(200);
  };
}

export const quoteTestWebhook = quoteWebhook("test");
export const quoteLiveWebhook = quoteWebhook("live");
export default createQuotePaymentsRouter();
