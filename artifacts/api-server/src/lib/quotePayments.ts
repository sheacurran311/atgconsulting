import Stripe from "stripe";
import { prisma } from "./db";

export type QuotePaymentMode = "test" | "live";

export function testPaymentsEnabled() {
  return process.env.ATG_LIVE_QUOTE_PAYMENTS !== "true" && process.env.ATG_TEST_QUOTE_PAYMENTS === "true" && !!process.env.ATG_QUOTE_STRIPE_TEST_KEY?.startsWith("sk_test_");
}
export function livePaymentsEnabled() {
  return process.env.ATG_LIVE_QUOTE_PAYMENTS === "true" && /^(sk|rk)_live_/.test(process.env.ATG_QUOTE_STRIPE_LIVE_KEY ?? "") &&
    !!process.env.ATG_QUOTE_STRIPE_LIVE_WEBHOOK_SECRET?.startsWith("whsec_");
}
export function quoteStripe(mode: QuotePaymentMode) {
  if (mode === "test" ? !testPaymentsEnabled() : !livePaymentsEnabled()) throw new Error("Quote payments are disabled.");
  return new Stripe(mode === "test" ? process.env.ATG_QUOTE_STRIPE_TEST_KEY! : process.env.ATG_QUOTE_STRIPE_LIVE_KEY!);
}

export function paymentKind(mode: QuotePaymentMode) {
  return mode === "test" ? "atg_test_quote" : "atg_live_quote";
}

export async function reconcileQuoteSession(session: Stripe.Checkout.Session, mode: QuotePaymentMode) {
  const liveMode = mode === "live";
  if (session.livemode !== liveMode || session.metadata?.kind !== paymentKind(mode) || session.payment_status !== "paid") return false;
  const entry = await prisma.quoteInstallment.findUnique({where: {id: session.metadata.entryId ?? ""}});
  if (!entry || entry.liveMode !== liveMode || (liveMode && !entry.authorizedAt) || session.mode !== "payment" ||
      session.currency !== "usd" || session.amount_total !== entry.amountCents || session.client_reference_id !== entry.clientId ||
      session.metadata.proposalId !== entry.proposalId || session.metadata.attempt !== String(entry.attempt) ||
      (entry.sessionId && entry.sessionId !== session.id)) return false;
  const update = await prisma.quoteInstallment.updateMany({
    where: {id: entry.id, liveMode, attempt: entry.attempt, paidAt: null, OR: [{sessionId: null}, {sessionId: session.id}]},
    data: {sessionId: session.id, paidAt: new Date(), invoiceId: typeof session.invoice === "string" ? session.invoice : session.invoice?.id},
  });
  return update.count > 0 || !!(await prisma.quoteInstallment.findFirst({where: {id: entry.id, paidAt: {not: null}, sessionId: session.id}, select: {id: true}}));
}

export async function reconcileQuoteRefund(charge: Stripe.Charge, mode: QuotePaymentMode) {
  const attempt = Number(charge.metadata.attempt);
  if (charge.livemode !== (mode === "live") || charge.metadata.kind !== paymentKind(mode) || !charge.metadata.entryId ||
    !charge.metadata.proposalId || !Number.isInteger(attempt) || attempt < 1 || charge.currency !== "usd" ||
    charge.amount_refunded <= 0 || charge.amount_refunded > charge.amount) return;
  await prisma.quoteInstallment.updateMany({
    where: {id: charge.metadata.entryId, proposalId: charge.metadata.proposalId, liveMode: mode === "live",
      attempt, amountCents: charge.amount, refundedCents: {lt: charge.amount_refunded}},
    data: {refundedCents: charge.amount_refunded},
  });
}
