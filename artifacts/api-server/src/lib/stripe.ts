/**
 * Stripe client factory.
 * All Stripe functionality is behind BILLING_ENABLED=true.
 * When BILLING_ENABLED is false (default) every function returns a clear error.
 *
 * Env vars:
 *   STRIPE_SECRET_KEY          — Stripe secret key (sk_test_... or sk_live_...)
 *   STRIPE_WEBHOOK_SECRET      — from Stripe dashboard → Webhooks → endpoint secret
 *   STRIPE_PRICE_SELF_SERVE    — Price ID for Self-serve (one-time)
 *   STRIPE_PRICE_GUIDED        — Price ID for Guided session package (one-time)
 *   STRIPE_PRICE_DFY_SETUP     — Price ID for Done-for-you setup fee (one-time)
 *   STRIPE_PRICE_DFY_MONTHLY   — Price ID for Done-for-you monthly subscription
 */

import Stripe from "stripe";

export function isBillingEnabled(): boolean {
  return process.env.BILLING_ENABLED === "true";
}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!isBillingEnabled()) {
    throw new Error("Billing is disabled. Set BILLING_ENABLED=true and configure Stripe env vars.");
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is required when BILLING_ENABLED=true.");
  if (!_stripe) {
    // Use the installed Stripe SDK's latest API version
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/** Tier → Price IDs from env */
export type CheckoutTier = "SELF_SERVE" | "GUIDED" | "WHITE_GLOVE";

export function getPriceId(tier: CheckoutTier): string | null {
  const map: Record<CheckoutTier, string | undefined> = {
    SELF_SERVE:  process.env.STRIPE_PRICE_SELF_SERVE,
    GUIDED:      process.env.STRIPE_PRICE_GUIDED,
    WHITE_GLOVE: process.env.STRIPE_PRICE_DFY_SETUP,
  };
  return map[tier] ?? null;
}

export function getDfyMonthlyPriceId(): string | null {
  return process.env.STRIPE_PRICE_DFY_MONTHLY ?? null;
}

export const APP_URL = process.env.APP_URL ?? "https://atgconsulting.io";
