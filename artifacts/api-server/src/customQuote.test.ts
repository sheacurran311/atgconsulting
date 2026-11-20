import test from "node:test";
import assert from "node:assert/strict";
import { cents, reviewedInvestment, savedQuote } from "./lib/customQuote";

const workstreams = [{label:"Website",amount:"900.10"},{label:"Lead workflow",amount:"349.99"}];
const installments = [{label:"On acceptance",amount:"300.09"},{label:"On handoff",amount:"950.00"}];

test("negotiated installments reconcile to exact USD cents", () => {
  const result = reviewedInvestment({workstreams,installments});
  assert.equal(result.price,"$1,250.09");
  assert.equal(cents("1.1"),110);
  assert.match(result.notes,/On handoff: \$950\.00/);
  assert.deepEqual(savedQuote(JSON.stringify(result)),{workstreams,installments});
});

test("unequal, empty and unusable payment schedules cannot become approved quotes", () => {
  for (const amount of ["1250.08","1e3","-12","0.001","0","1000000"]) {
    assert.throws(()=>reviewedInvestment({workstreams,installments:[{label:"On completion",amount}]}));
  }
  assert.throws(()=>reviewedInvestment({workstreams:[],installments:[]}));
  assert.equal(savedQuote('{"tier":"GUIDED","price":"$997"}'),null);
  assert.equal(savedQuote("invalid"),null);
});

test("a single negotiated payment needs no deposit or subscription", () => {
  const rows = [{label:"Website handoff",amount:"900"}];
  assert.equal(reviewedInvestment({workstreams:rows,installments:rows}).care,"");
});
