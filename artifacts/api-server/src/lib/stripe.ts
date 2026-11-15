/**
 * Stripe client factory.
 * All Stripe functionality is behind BILLING_ENABLED=true.
 * When BILLING_ENABLED is false (default) every function returns a clear error.
 *
 * Env vars:
 *   STRIPE_SECRET_KEY          — Stripe secret key (sk_test_... or sk_live_...)
 *   STRIPE_WEBHOOK_SECRET      — from Stripe dashboard → Webhooks → endpoint secret
 *   STRIPE_PRICE_SELF_SERVE    — Price ID for Self-serve (one-time)
 *   STRIPE_PRICE_GUIDED        — Price ID for the 3-session Guided package (one-time)
 *   STRIPE_PRICE_GUIDED_5      — optional Price ID for the 5-session package
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
export type GuidedPriceSize = 3 | 5;

export function priceEnvKey(tier: CheckoutTier, guidedSessions?: GuidedPriceSize): string {
  if (tier === "GUIDED") return guidedSessions === 5 ? "STRIPE_PRICE_GUIDED_5" : "STRIPE_PRICE_GUIDED";
  if (tier === "WHITE_GLOVE") return "STRIPE_PRICE_DFY_SETUP";
  return "STRIPE_PRICE_SELF_SERVE";
}

export function getPriceId(tier: CheckoutTier, guidedSessions?: GuidedPriceSize): string | null {
  if (tier === "GUIDED" && guidedSessions === 5) {
    return process.env.STRIPE_PRICE_GUIDED_5 ?? null;
  }
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

/**
 * Fail startup when billing is on but a required key is missing. A missing
 * Guided 5 price is a warning: the 3-session package can still be sold.
 */
export function billingConfigErrors(): string[] {
  if (!isBillingEnabled()) return [];
  const required = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_SELF_SERVE",
    "STRIPE_PRICE_GUIDED",
    "STRIPE_PRICE_DFY_SETUP",
  ];
  return required.filter((key) => !process.env[key]?.trim());
}

export function validateBillingConfig(): void {
  if (!isBillingEnabled()) return;
  const missing = billingConfigErrors();
  if (missing.length) {
    throw new Error(`Billing is enabled but missing required env vars: ${missing.join(", ")}.`);
  }
  if (!process.env.STRIPE_PRICE_GUIDED_5?.trim()) {
    console.warn("[billing] STRIPE_PRICE_GUIDED_5 is not set; 5-session Guided checkout will be unavailable.");
  }
}

export const APP_URL = process.env.APP_URL ?? "https://atgconsulting.io";
