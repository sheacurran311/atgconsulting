/**
 * Billing routes — Stripe Checkout, Customer Portal, and Webhook.
 * Everything behind BILLING_ENABLED=true guard.
 *
 * POST /api/billing/checkout       — create Checkout session (auth required, client required)
 * GET  /api/billing/portal         — customer portal link
 * POST /api/stripe/webhook         — Stripe webhook (raw body, signature verified, idempotent)
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, type AuthedRequest } from "../lib/auth";
import { isBillingEnabled, getStripe, getPriceId, getDfyMonthlyPriceId, APP_URL, type CheckoutTier } from "../lib/stripe";
import type Stripe from "stripe";

const router = Router();

// ── Guard: billing disabled ───────────────────────────────────────────────────

function billingCheck(res: Response): boolean {
  if (!isBillingEnabled()) {
    res.status(503).json({ error: "Billing is not enabled on this deployment." });
    return false;
  }
  return true;
}

// ── Create Checkout session ───────────────────────────────────────────────────

const CheckoutSchema = z.object({
  tier: z.enum(["SELF_SERVE", "GUIDED", "WHITE_GLOVE"]),
});

router.post("/billing/checkout", withUser, requireAuth, async (req, res) => {
  if (!billingCheck(res)) return;
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.status(422).json({ error: "Complete the intake and save your plan before purchasing." }); return; }

  const parsed = CheckoutSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "tier is required.", issues: parsed.error.flatten() }); return; }

  const { tier } = parsed.data;

  // Done-for-you requires admin approval first
  if (tier === "WHITE_GLOVE") {
    const app = await prisma.dfyApplication.findUnique({ where: { clientId: user.clientId } });
    if (!app || app.status !== "accepted") {
      res.status(403).json({ error: "Done-for-you requires an approved application. Apply via the intake form." });
      return;
    }
  }

  const priceId = getPriceId(tier as CheckoutTier);
  if (!priceId) { res.status(422).json({ error: `Price ID not configured for ${tier}. Set STRIPE_PRICE_${tier} in env.` }); return; }

  const stripe = getStripe();
  const client = await prisma.client.findUnique({ where: { id: user.clientId }, include: { user: true } });

  // Get or create Stripe customer
  let customerId = client?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      metadata: { clientId: user.clientId, userId: user.id },
    });
    customerId = customer.id;
    await prisma.client.update({ where: { id: user.clientId }, data: { stripeCustomerId: customerId } });
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price: priceId, quantity: 1 }];

  // DFY also adds a monthly subscription
  const dfyMonthlyPriceId = tier === "WHITE_GLOVE" ? getDfyMonthlyPriceId() : null;
  if (dfyMonthlyPriceId) {
    lineItems.push({ price: dfyMonthlyPriceId, quantity: 1 });
  }

  const mode: Stripe.Checkout.SessionCreateParams["mode"] = dfyMonthlyPriceId ? "subscription" : "payment";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    line_items: lineItems,
    success_url: `${APP_URL}/app/account?checkout=success`,
    cancel_url: `${APP_URL}/app/account?checkout=cancelled`,
    metadata: { clientId: user.clientId, tier },
    ...(mode === "payment" ? { payment_intent_data: { metadata: { clientId: user.clientId, tier } } } : {}),
  });

  res.json({ url: session.url });
});

// ── Customer Portal ───────────────────────────────────────────────────────────

router.get("/billing/portal", withUser, requireAuth, async (req, res) => {
  if (!billingCheck(res)) return;
  const user = (req as AuthedRequest).atgUser!;
  if (!user.clientId) { res.status(422).json({ error: "No client profile." }); return; }

  const client = await prisma.client.findUnique({ where: { id: user.clientId } });
  if (!client?.stripeCustomerId) { res.status(404).json({ error: "No Stripe customer found. Complete a purchase first." }); return; }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: client.stripeCustomerId,
    return_url: `${APP_URL}/app/account`,
  });

  res.json({ url: session.url });
});

// ── Stripe Webhook ────────────────────────────────────────────────────────────
// NOTE: this route uses express.raw() — mounted before json() in app.ts.

async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
  const clientId = session.metadata?.clientId;
  const tier = session.metadata?.tier as CheckoutTier | undefined;
  if (!clientId || !tier) return;

  await prisma.client.update({
    where: { id: clientId },
    data: {
      tier,
      status: "ACTIVE",
      // For Guided, set a default session package if none set
      ...(tier === "GUIDED" ? { guidedSessionsTotal: 4, guidedSessionsUsed: 0 } : {}),
      // For DFY, also link subscription if it exists
      ...(session.subscription ? { stripeSubscriptionId: String(session.subscription) } : {}),
    },
  });
}

async function handleSubscriptionUpdate(sub: Stripe.Subscription): Promise<void> {
  const customerId = String(sub.customer);
  const client = await prisma.client.findFirst({ where: { stripeCustomerId: customerId } });
  if (!client) return;

  const isActive = ["active", "trialing"].includes(sub.status);
  await prisma.client.update({
    where: { id: client.id },
    data: {
      stripeSubscriptionId: sub.id,
      ...(isActive ? { tier: "WHITE_GLOVE", status: "ACTIVE" } : { status: isActive ? "ACTIVE" : "PAUSED" }),
    },
  });
}

// Raw body webhook handler — registered in app.ts with express.raw()
export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  if (!isBillingEnabled()) { res.json({ ok: true }); return; }

  const sig = req.headers["stripe-signature"] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) { res.status(500).json({ error: "STRIPE_WEBHOOK_SECRET not set." }); return; }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body as Buffer, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook signature verification failed.";
    res.status(400).json({ error: msg });
    return;
  }

  // Idempotency: skip already-processed events
  const existing = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing) { res.json({ ok: true, skipped: true }); return; }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.created":
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const client = await prisma.client.findFirst({ where: { stripeSubscriptionId: sub.id } });
        if (client) {
          await prisma.client.update({ where: { id: client.id }, data: { status: "PAUSED", stripeSubscriptionId: null } });
        }
        break;
      }
      default:
        // Unhandled event type — not an error
    }

    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
    res.json({ ok: true });
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    res.status(500).json({ error: "Webhook handler failed." });
  }
}

router.post("/billing/info", withUser, requireAuth, async (req, res) => {
  if (!isBillingEnabled()) { res.json({ enabled: false }); return; }
  const user = (req as AuthedRequest).atgUser!;
  const client = user.clientId ? await prisma.client.findUnique({ where: { id: user.clientId } }) : null;
  res.json({
    enabled: true,
    hasCustomer: !!client?.stripeCustomerId,
    hasSubscription: !!client?.stripeSubscriptionId,
    tier: client?.tier ?? "NONE",
  });
});

export default router;
