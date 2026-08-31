import { test } from "node:test";
import assert from "node:assert/strict";
import {
  quotedSpread,
  quotedHalfSpread,
  priceImprovement,
  effectiveToQuotedRatio,
} from "../src/execquality.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// bid 99.98 / ask 100.02, mid 100.00, quoted spread 0.04
const bid = 99.98;
const ask = 100.02;

test("quoted spread and half-spread", () => {
  close(quotedSpread(bid, ask), 0.04);
  close(quotedHalfSpread(bid, ask), 0.02);
});

test("price improvement: inside the quote is positive", () => {
  // buy filled at 100.01 — a cent better than the ask
  close(priceImprovement(100.01, bid, ask, "buy"), 0.01);
  // sell filled at 99.985 — half a cent better than the bid
  close(priceImprovement(99.985, bid, ask, "sell"), 0.005);
});

test("price improvement: at-quote is zero, worse-than-quote is negative", () => {
  close(priceImprovement(ask, bid, ask, "buy"), 0); // paid the ask exactly
  close(priceImprovement(bid, bid, ask, "sell"), 0); // hit the bid exactly
  close(priceImprovement(100.05, bid, ask, "buy"), -0.03); // walked above the ask
  close(priceImprovement(99.95, bid, ask, "sell"), -0.03); // walked below the bid
});

test("effective-to-quoted ratio", () => {
  // buy at 100.01: effective spread 2·|100.01−100| = 0.02, quoted 0.04 → 0.5
  close(effectiveToQuotedRatio(0.02, 0.04), 0.5);
  // sell at 99.985: effective 0.03, quoted 0.04 → 0.75
  close(effectiveToQuotedRatio(0.03, 0.04), 0.75);
  // full quoted spread → 1
  close(effectiveToQuotedRatio(0.04, 0.04), 1);
});

test("edge cases", () => {
  // non-positive quoted spread (crossed/locked) → 0
  assert.equal(effectiveToQuotedRatio(0.02, 0), 0);
  assert.equal(effectiveToQuotedRatio(0.02, -0.01), 0);
  // zero-width market: no spread, no improvement
  close(quotedSpread(100, 100), 0);
  close(priceImprovement(100, 100, 100, "buy"), 0);
});
