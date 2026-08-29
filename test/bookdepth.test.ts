import { test } from "node:test";
import assert from "node:assert/strict";
import {
  depthWithin,
  orderBookSlope,
  costOfRoundTrip,
} from "../src/bookdepth.ts";
import type { Level } from "../src/orderbook.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// best-first: bids by descending price, asks by ascending price. mid = 99.975
const bids: Level[] = [
  { price: 99.95, size: 6 },
  { price: 99.9, size: 10 },
  { price: 99.85, size: 15 },
  { price: 99.75, size: 25 },
];
const asks: Level[] = [
  { price: 100.0, size: 5 },
  { price: 100.05, size: 8 },
  { price: 100.1, size: 12 },
  { price: 100.2, size: 20 },
];

test("depthWithin: band around mid, split by side", () => {
  const d10 = depthWithin(bids, asks, 10);
  assert.equal(d10.bidDepth, 16);
  assert.equal(d10.askDepth, 13);
  assert.equal(d10.total, 29);
  const d20 = depthWithin(bids, asks, 20);
  assert.equal(d20.bidDepth, 31);
  assert.equal(d20.askDepth, 25);
  assert.equal(d20.total, 56);
});

test("orderBookSlope: size per relative price move", () => {
  close(orderBookSlope(asks, 99.975), 19994.999999999243);
  close(orderBookSlope(bids, 99.975), 24882.66666666729);
});

test("costOfRoundTrip: bps liquidity tax of entering and exiting", () => {
  const rt = costOfRoundTrip(bids, asks, 15);
  close(rt.avgBuyPrice, 100.04);
  close(rt.avgSellPrice, 99.92);
  close(rt.roundTripBps, 12.00300075018658);
  assert.equal(rt.filledSize, 15);

  const small = costOfRoundTrip(bids, asks, 5);
  close(small.avgBuyPrice, 100.0);
  close(small.avgSellPrice, 99.95);
  close(small.roundTripBps, 5.001250312577861);
});

test("bigger round trips cost more (walks deeper into the book)", () => {
  const a = costOfRoundTrip(bids, asks, 5).roundTripBps;
  const b = costOfRoundTrip(bids, asks, 15).roundTripBps;
  assert.ok(b > a);
});

test("thin side caps filledSize at what actually round-trips", () => {
  // asks total 45, bids total 56 → only 45 can round-trip
  const rt = costOfRoundTrip(bids, asks, 200);
  assert.equal(rt.filledSize, 45);
});

test("edge cases: empty sides and non-positive args return zeros", () => {
  assert.equal(depthWithin([], asks, 10).total, 0);
  assert.equal(depthWithin(bids, asks, 0).total, 0);
  assert.equal(orderBookSlope([], 100), 0);
  assert.equal(orderBookSlope(asks, 0), 0);
  // a single level sitting at the reference price → zero distance → 0
  assert.equal(orderBookSlope([{ price: 100, size: 5 }], 100), 0);
  assert.equal(costOfRoundTrip(bids, [], 10).filledSize, 0);
  assert.equal(costOfRoundTrip(bids, asks, 0).filledSize, 0);
});
