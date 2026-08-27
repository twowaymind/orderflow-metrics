import { test } from "node:test";
import assert from "node:assert/strict";
import {
  noiseVariance,
  sparseRealizedVariance,
  volatilitySignature,
} from "../src/noise.ts";

const close = (a: number, b: number, eps = 1e-15) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// A bouncing series — strong bid-ask-bounce style microstructure noise.
const r = [
  0.002, -0.0015, 0.0018, -0.0016, 0.0021, -0.0014, 0.0019, -0.0017, 0.0022,
  -0.0015, 0.002, -0.0016,
];
const RV_ALL = 3.8570000000000005e-5;

test("noiseVariance = RV / 2n (regression value)", () => {
  close(noiseVariance(r), 1.6070833333333335e-6);
});

test("sparseRealizedVariance(step 1) reproduces plain RV", () => {
  close(sparseRealizedVariance(r, 1), RV_ALL);
});

test("sparse RV at a coarser step (regression values)", () => {
  close(sparseRealizedVariance(r, 2), 1.2799999999999998e-6);
  close(sparseRealizedVariance(r, 3), 1.218e-5);
  close(sparseRealizedVariance(r, 4), 1.9424999999999996e-6);
});

test("coarser sampling suppresses the noise-inflated fine-grid RV", () => {
  // the raw grid is dominated by bounce; the 2-step grid strips most of it
  assert.ok(sparseRealizedVariance(r, 2) < sparseRealizedVariance(r, 1) / 10);
});

test("volatility signature: one point per step, step 1 equals RV", () => {
  const sig = volatilitySignature(r, [1, 2, 3, 4]);
  assert.equal(sig.length, 4);
  assert.deepEqual(sig.map((p) => p.step), [1, 2, 3, 4]);
  close(sig[0].realizedVariance, RV_ALL);
  close(sig[1].realizedVariance, 1.2799999999999998e-6);
});

test("edge cases return 0 / empty", () => {
  assert.equal(noiseVariance([]), 0);
  assert.equal(sparseRealizedVariance([], 2), 0);
  assert.equal(sparseRealizedVariance(r, 0), 0);
  assert.equal(sparseRealizedVariance(r, 999), 0); // step too large for any block
  assert.deepEqual(volatilitySignature([], [1, 2]), [
    { step: 1, realizedVariance: 0 },
    { step: 2, realizedVariance: 0 },
  ]);
});

test("all estimators are non-negative", () => {
  assert.ok(noiseVariance(r) >= 0);
  for (const k of [1, 2, 3, 4, 5]) assert.ok(sparseRealizedVariance(r, k) >= 0);
});
