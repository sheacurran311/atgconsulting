import { Router, type Request, type Response } from "express";
import { withUser, requireAuth, type AuthedRequest } from "../lib/auth";
import { prisma } from "../lib/db";
import { cents, savedQuote } from "../lib/customQuote";
import { reconcileTestSession, testPaymentsEnabled, testStripe } from "../lib/quotePayments";
import { APP_URL } from "../lib/stripe";

const router = Router();

router.post("/portal/proposal/:id/installments/:stage/test-checkout", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  if (!testPaymentsEnabled()) { res.sendStatus(404); return; }
  if (!user.clientId || user.isImpersonating) { res.sendStatus(403); return; }
  const id = String(req.params.id);
  const stage = /^\d+$/.test(String(req.params.stage)) ? Number(req.params.stage) : -1;
  const proposal = await prisma.discoveryProposal.findUnique({where: {id}});
  const owned = proposal && await prisma.discoveryIntake.findFirst({
    where: {id: proposal.discoveryIntakeId, clientId: user.clientId}, select: {id: true},
  });
  if (!proposal || !owned) { res.sendStatus(404); return; }
  if (!proposal.acceptedAt || !proposal.approvedAt || !["approved","portal_published"].includes(proposal.status)) {
    res.status(409).json({error:"Accept the approved proposal first."}); return;
  }
  const item = Number.isInteger(stage) && savedQuote(proposal.investment)?.installments[stage];
  if (!item) { res.sendStatus(404); return; }
  const amountCents = cents(item.amount);
  const entry = await prisma.quoteInstallment.upsert({
    where: {proposalId_stage: {proposalId: id, stage}}, update: {},
    create: {proposalId: id, stage, clientId: user.clientId, amountCents},
  });
  if (entry.amountCents !== amountCents || entry.clientId !== user.clientId) { res.sendStatus(409); return; }
  if (entry.refundedCents > 0) { res.status(409).json({error:"This installment has a refund. Review it with ATG."}); return; }
  if (entry.paidAt) { res.json({paid:true}); return; }
  const stripe = testStripe();
  if (entry.sessionId) {
    const session = await stripe.checkout.sessions.retrieve(entry.sessionId);
    if (session.payment_status === "paid") { await reconcileTestSession(session); res.json({paid:true}); return; }
    if (session.status === "open" && session.url) { res.json({url:session.url}); return; }
    if (session.status === "expired") {
      await prisma.quoteInstallment.updateMany({where:{id:entry.id, sessionId:session.id, paidAt:null},
        data:{sessionId:null, attempt:{increment:1}, attemptedAt:new Date()}});
      res.status(409).json({error:"The test session expired. Select this installment again."}); return;
    }
    res.status(409).json({error:"Payment is processing."}); return;
  }
  if (Date.now() - entry.attemptedAt.getTime() > 23 * 3600000) {
    res.status(409).json({error:"Check the previous test attempt in Stripe before issuing another session."}); return;
  }
  const metadata = {kind:"atg_test_quote", entryId:entry.id, proposalId:id, attempt:String(entry.attempt)};
  const session = await stripe.checkout.sessions.create({
    mode:"payment", payment_method_types:["card"], client_reference_id:user.clientId, metadata,
    line_items:[{quantity:1, price_data:{currency:"usd", unit_amount:amountCents, product_data:{name:item.label}}}],
    invoice_creation:{enabled:true, invoice_data:{metadata}}, payment_intent_data:{metadata},
    success_url:APP_URL + "/app/proposal", cancel_url:APP_URL + "/app/proposal",
  },{idempotencyKey:"quote-" + entry.id + "-" + entry.attempt});
  await prisma.quoteInstallment.updateMany({where:{id:entry.id,attempt:entry.attempt,paidAt:null},data:{sessionId:session.id}});
  res.json({url:session.url});
});

export async function quoteTestWebhook(req: Request, res: Response) {
  const secret = process.env.ATG_QUOTE_STRIPE_TEST_WEBHOOK_SECRET;
  if (!secret || !testPaymentsEnabled()) { res.sendStatus(404); return; }
  let event;
  try { event = testStripe().webhooks.constructEvent(req.body,req.get("stripe-signature") ?? "",secret); }
  catch { res.sendStatus(400); return; }
  if (!event.livemode && (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded")) {
    await reconcileTestSession(event.data.object);
  }
  if (!event.livemode && event.type === "charge.refunded") {
    const charge = event.data.object;
    if (charge.metadata.kind === "atg_test_quote" && charge.metadata.entryId && charge.metadata.proposalId && Number.isInteger(Number(charge.metadata.attempt)) && charge.currency === "usd") {
      await prisma.quoteInstallment.updateMany({
        where:{id:charge.metadata.entryId, proposalId:charge.metadata.proposalId,
          attempt:Number(charge.metadata.attempt), amountCents:charge.amount,
          refundedCents:{lt:charge.amount_refunded}},
        data:{refundedCents:charge.amount_refunded},
      });
    }
  }
  res.sendStatus(200);
}
export default router;
