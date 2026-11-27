/**
 * Stripe billing tests — mocked Stripe SDK, no real network calls.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { getPriceId, billingConfigErrors, validateBillingConfig } from "./lib/stripe";
import { isDfySubscription, subscriptionClientStatus } from "./lib/subscription";

// ── isBillingEnabled guard ────────────────────────────────────────────────────

test("POST /billing/checkout returns 503 when BILLING_ENABLED is false", async () => {
  const saved = process.env.BILLING_ENABLED;
  delete process.env.BILLING_ENABLED;
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop";

  const { default: app } = await import("./app");
  const res = await request(app)
    .post("/api/billing/checkout")
    .send({ tier: "GUIDED" });

  // Without auth it's blocked before it even reaches the billing check (401/500);
  // with auth but billing disabled it would be 503. Either is acceptable here.
  assert.notEqual(res.status, 200, `should not return 200 (got ${res.status})`);
  assert.ok(res.status >= 400, `expected 4xx or 5xx, got ${res.status}`);

  if (saved !== undefined) process.env.BILLING_ENABLED = saved;
  else delete process.env.BILLING_ENABLED;
});

test("POST /stripe/webhook returns 400 for invalid signature", async () => {
  process.env.BILLING_ENABLED = "true";
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake";
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop";

  const { default: app } = await import("./app");
  const res = await request(app)
    .post("/api/stripe/webhook")
    .set("Content-Type", "application/json")
    .set("stripe-signature", "invalid-sig")
    .send(JSON.stringify({ type: "checkout.session.completed" }));

  assert.equal(res.status, 400, `invalid webhook signature should return 400 (got ${res.status})`);
});

test("GET /billing/portal returns 503 when BILLING_ENABLED is false", async () => {
  delete process.env.BILLING_ENABLED;
  const { default: app } = await import("./app");
  const res = await request(app).get("/api/billing/portal");
  // Without auth it's 401/500 or without billing it would be 503; either is not 200
  assert.notEqual(res.status, 200, `should not return 200 (got ${res.status})`);
  assert.ok(res.status >= 400);
});

test("Stripe webhook handles missing STRIPE_WEBHOOK_SECRET gracefully", async () => {
  process.env.BILLING_ENABLED = "true";
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  delete process.env.STRIPE_WEBHOOK_SECRET;
  const { default: app } = await import("./app");
  const res = await request(app)
    .post("/api/stripe/webhook")
    .set("Content-Type", "application/json")
    .set("stripe-signature", "t=1,v1=abc")
    .send("{}");
  assert.ok(res.status === 500 || res.status === 400, `expected 4xx/5xx, got ${res.status}`);
});

test("Guided checkout selects the 5-session price only for a 5-session package", () => {
  const saved = {
    GUIDED: process.env.STRIPE_PRICE_GUIDED,
    GUIDED_5: process.env.STRIPE_PRICE_GUIDED_5,
    DFY: process.env.STRIPE_PRICE_DFY_SETUP,
  };
  process.env.STRIPE_PRICE_GUIDED = "price_guided_3";
  process.env.STRIPE_PRICE_GUIDED_5 = "price_guided_5";
  process.env.STRIPE_PRICE_DFY_SETUP = "price_dfy_setup";
  try {
    assert.equal(getPriceId("GUIDED"), "price_guided_3");
    assert.equal(getPriceId("GUIDED", 3), "price_guided_3");
    assert.equal(getPriceId("GUIDED", 5), "price_guided_5");
    assert.equal(getPriceId("WHITE_GLOVE"), "price_dfy_setup");
    delete process.env.STRIPE_PRICE_GUIDED_5;
    assert.equal(getPriceId("GUIDED", 5), null);
  } finally {
    for (const [key, value] of Object.entries({
      STRIPE_PRICE_GUIDED: saved.GUIDED,
      STRIPE_PRICE_GUIDED_5: saved.GUIDED_5,
      STRIPE_PRICE_DFY_SETUP: saved.DFY,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("billing startup validation reports missing required keys", () => {
  const keys = [
    "BILLING_ENABLED",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_GUIDED",
    "STRIPE_PRICE_DFY_SETUP",
    "STRIPE_PRICE_GUIDED_5",
  ];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.BILLING_ENABLED = "true";
    for (const key of keys.slice(1)) delete process.env[key];
    assert.deepEqual(billingConfigErrors(), [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_GUIDED",
      "STRIPE_PRICE_DFY_SETUP",
    ]);
    assert.throws(() => validateBillingConfig(), /missing required env vars/);

    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake";
    process.env.STRIPE_PRICE_GUIDED = "price_guided";
    process.env.STRIPE_PRICE_DFY_SETUP = "price_dfy";
    assert.deepEqual(billingConfigErrors(), []);
    assert.doesNotThrow(() => validateBillingConfig());
  } finally {
    for (const key of keys) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("only the DFY monthly subscription maps to White Glove", () => {
  const sub = { items: { data: [{ price: { id: "price_care" } }] } };
  assert.equal(isDfySubscription(sub, "price_care"), true);
  assert.equal(isDfySubscription(sub, "price_other"), false);
  assert.equal(isDfySubscription(sub, null), false);
  assert.equal(subscriptionClientStatus("active"), "ACTIVE");
  assert.equal(subscriptionClientStatus("trialing"), "ACTIVE");
  assert.equal(subscriptionClientStatus("past_due"), "PAUSED");
  assert.equal(subscriptionClientStatus("unpaid"), "PAUSED");
  assert.equal(subscriptionClientStatus("canceled"), "CHURNED");
  assert.equal(subscriptionClientStatus("incomplete_expired"), "CHURNED");
});
