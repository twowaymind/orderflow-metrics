import { test } from "node:test";
import assert from "node:assert/strict";
import { varianceRatioTest } from "../src/vrtest.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const R = [
  0.012, -0.008, 0.005, -0.021, 0.015, 0.004, -0.011, 0.02, -0.006, 0.009, 0.001,
  -0.014, 0.017, -0.003, 0.006, 0.011, -0.032, 0.007, 0.002, -0.01, 0.013, -0.004,
  0.008, -0.006, 0.019, -0.025, 0.003, 0.014, -0.009, 0.006, 0.004, -0.012, 0.02,
  -0.007, 0.011, 0.003, -0.015, 0.009, -0.004, 0.013,
];

test("variance-ratio test q=2 vs arch reference", () => {
  const r = varianceRatioTest(R, 2);
  close(r.ratio, 0.420576932327773);
  close(r.zStatistic, -3.6645932453722287);
  close(r.robustZStatistic, -3.997061801230227);
  close(r.pValue, 0.00024773, 1e-4);
  close(r.robustPValue, 0.00006413, 1e-4);
});

test("variance-ratio test q=4 vs arch reference", () => {
  const r = varianceRatioTest(R, 4);
  close(r.ratio, 0.36248384059900257);
  close(r.zStatistic, -2.155197978303745);
  close(r.robustZStatistic, -2.5233752333630073);
});

test("this series is mean-reverting: VR < 1 and rejects the random walk", () => {
  const r = varianceRatioTest(R, 2);
  assert.ok(r.ratio < 1);
  assert.ok(r.robustPValue < 0.05);
});

test("momentum pushes VR above 1, alternation below 1", () => {
  // same-sign runs → positive autocorrelation → VR > 1
  const momentum = [
    0.01, 0.012, 0.011, 0.013, -0.011, -0.013, -0.01, -0.012, 0.011, 0.012, 0.01,
    0.013, -0.012, -0.011, -0.013, -0.01,
  ];
  // strict alternation → strong negative autocorrelation → VR < 1
  const reversion = [0.01, -0.01, 0.01, -0.01, 0.01, -0.01, 0.01, -0.01, 0.01, -0.01, 0.01, -0.01];
  assert.ok(varianceRatioTest(momentum, 2).ratio > 1);
  assert.ok(varianceRatioTest(reversion, 2).ratio < 1);
});

test("edge cases", () => {
  const bad = varianceRatioTest(R, 1); // q must be ≥ 2
  assert.ok(Number.isNaN(bad.ratio));
  assert.ok(Number.isNaN(varianceRatioTest([0.01, 0.02], 2).ratio)); // nq <= q
  assert.ok(Number.isNaN(varianceRatioTest([0.01, 0.01, 0.01, 0.01], 2).ratio)); // zero var
  assert.ok(Number.isNaN(varianceRatioTest(R, 2.5).ratio)); // non-integer q
});
