import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import billingRouter from "./routes/billing";

test("retired fixed-price checkout refuses both Guided and DFY requests without Stripe side effects", async () => {
  const saved = process.env.BILLING_ENABLED;
  process.env.BILLING_ENABLED = "true";
  try {
    const app = express();
    app.use(express.json());
    app.use("/api", billingRouter);

    for (const tier of ["GUIDED", "WHITE_GLOVE", undefined]) {
      const result = await request(app)
        .post("/api/billing/checkout")
        .send(tier ? { tier } : {});
      assert.equal(result.status, 410);
      assert.equal(result.body.code, "CONSULTATION_REQUIRED");
      assert.equal(result.body.next, "/intake");
      assert.match(result.body.error, /custom proposal/i);
      assert.equal(result.body.url, undefined, "must not return a Stripe checkout URL");
    }
  } finally {
    if (saved === undefined) delete process.env.BILLING_ENABLED;
    else process.env.BILLING_ENABLED = saved;
  }
});
