import Stripe from "stripe";
import { prisma } from "./db";

export function testPaymentsEnabled() {
  return process.env.ATG_TEST_QUOTE_PAYMENTS === "true" && !!process.env.ATG_QUOTE_STRIPE_TEST_KEY?.startsWith("sk_test_");
}
export function testStripe() {
  if (!testPaymentsEnabled()) throw new Error("Test quote payments are disabled.");
  return new Stripe(process.env.ATG_QUOTE_STRIPE_TEST_KEY!);
}

export async function reconcileTestSession(session: Stripe.Checkout.Session) {
  if (session.livemode || session.metadata?.kind !== "atg_test_quote" || session.payment_status !== "paid") return;
  const entry = await prisma.quoteInstallment.findUnique({where: {id: session.metadata.entryId ?? ""}});
  if (!entry || session.mode !== "payment" || session.currency !== "usd" ||
      session.amount_total !== entry.amountCents || session.client_reference_id !== entry.clientId ||
      session.metadata.proposalId !== entry.proposalId || session.metadata.attempt !== String(entry.attempt) ||
      (entry.sessionId && entry.sessionId !== session.id)) throw new Error("Test payment does not match the installment.");
  await prisma.quoteInstallment.updateMany({
    where: {id: entry.id, attempt: entry.attempt, paidAt: null, OR: [{sessionId: null},{sessionId: session.id}]},
    data: {sessionId: session.id, paidAt: new Date(), invoiceId: typeof session.invoice === "string" ? session.invoice : session.invoice?.id},
  });
}
