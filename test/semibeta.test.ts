import { test } from "node:test";
import assert from "node:assert/strict";
import {
  realizedSemibetas,
  downsideSemibeta,
  semibetaAsymmetry,
} from "../src/semibeta.ts";
import { realizedBeta } from "../src/covariance.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const asset = [0.02, -0.03, 0.01, -0.04, -0.01];
const market = [0.01, -0.02, 0.015, -0.03, 0.008];

test("four realized semibetas (BPQ 2022)", () => {
  const s = realizedSemibetas(asset, market);
  close(s.concordantPositive, 0.20722320899940794);
  close(s.concordantNegative, 1.0657193605683837);
  close(s.mixedMarketUp, 0.04736530491415039);
  close(s.mixedMarketDown, 0);
});

test("semibetas are all non-negative", () => {
  const s = realizedSemibetas(asset, market);
  assert.ok(s.concordantPositive >= 0);
  assert.ok(s.concordantNegative >= 0);
  assert.ok(s.mixedMarketUp >= 0);
  assert.ok(s.mixedMarketDown >= 0);
});

test("semibetas reconstruct realized beta exactly", () => {
  const s = realizedSemibetas(asset, market);
  const recon =
    s.concordantPositive + s.concordantNegative - s.mixedMarketUp - s.mixedMarketDown;
  close(recon, realizedBeta(asset, market));
});

test("reconstruction holds on a second series", () => {
  const a = [0.03, 0.01, -0.02, -0.05, 0.02, -0.01];
  const m = [0.02, -0.01, -0.03, -0.04, 0.01, 0.005];
  const s = realizedSemibetas(a, m);
  close(s.concordantPositive, 0.256);
  close(s.concordantNegative, 0.832);
  close(s.mixedMarketUp, 0.016);
  close(s.mixedMarketDown, 0.032);
  close(
    s.concordantPositive + s.concordantNegative - s.mixedMarketUp - s.mixedMarketDown,
    realizedBeta(a, m),
  );
});

test("downsideSemibeta is the concordant-negative component", () => {
  close(downsideSemibeta(asset, market), 1.0657193605683837);
  close(downsideSemibeta(asset, market), realizedSemibetas(asset, market).concordantNegative);
});

test("semibetaAsymmetry is beta^N − beta^P", () => {
  close(semibetaAsymmetry(asset, market), 0.8584961515689757);
});

test("series pair over their common length", () => {
  const a = [0.02, -0.03, 0.01];
  const m = [0.01, -0.02, 0.015, -0.09]; // extra market entry ignored
  const s = realizedSemibetas(a, m);
  const rvM = 0.01 * 0.01 + 0.02 * 0.02 + 0.015 * 0.015;
  close(s.concordantPositive, (0.02 * 0.01 + 0.01 * 0.015) / rvM);
  close(s.concordantNegative, (0.03 * 0.02) / rvM);
});

test("edge cases", () => {
  const z = realizedSemibetas([], []);
  close(z.concordantPositive, 0);
  close(z.concordantNegative, 0);
  close(z.mixedMarketUp, 0);
  close(z.mixedMarketDown, 0);
  // zero market variance → all zero, reconstruction still trivially holds
  const flat = realizedSemibetas([0.01, -0.02], [0, 0]);
  close(flat.concordantNegative, 0);
  close(downsideSemibeta([0.01], [0]), 0);
  close(semibetaAsymmetry([0.01], [0]), 0);
});
