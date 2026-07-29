import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bucketByVolume,
  bvcBuyFraction,
  standardNormalCdf,
  vpin,
} from "../src/vpin.ts";

const close = (a: number, b: number, eps = 1e-4) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

test("standard normal CDF anchors", () => {
  close(standardNormalCdf(0), 0.5);
  close(standardNormalCdf(1), 0.841344, 1e-3);
  assert.ok(standardNormalCdf(6) > 0.999999);
});

test("BVC is 0.5 at zero price change and with degenerate sigma", () => {
  close(bvcBuyFraction(0, 1), 0.5);
  close(bvcBuyFraction(5, 0), 0.5);
});

test("bucketByVolume conserves volume and splits trades", () => {
  const trades = [
    { price: 100, size: 3 },
    { price: 101, size: 4 },
    { price: 102, size: 5 },
  ];
  const buckets = bucketByVolume(trades, 4);
  assert.equal(buckets.length, 3);
  assert.deepEqual(buckets.map((b) => b.volume), [4, 4, 4]);
});

test("VPIN is 0 when there is no price movement", () => {
  const buckets = [
    { priceChange: 0, volume: 100 },
    { priceChange: 0, volume: 100 },
  ];
  assert.equal(vpin(buckets), 0);
});

test("VPIN matches BVC imbalance on a symmetric ±1σ pair", () => {
  const buckets = [
    { priceChange: 1, volume: 100 },
    { priceChange: -1, volume: 100 },
  ];
  // sigma = 1 → |2Φ(1)-1| = 0.682689 for both buckets
  close(vpin(buckets, { sigma: 1 }), 0.682689, 1e-3);
});

test("VPIN stays within [0, 1]", () => {
  const buckets = [
    { priceChange: 5, volume: 50 },
    { priceChange: -3, volume: 50 },
    { priceChange: 2, volume: 50 },
  ];
  const v = vpin(buckets);
  assert.ok(v >= 0 && v <= 1);
});
