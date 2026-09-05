import { test } from "node:test";
import assert from "node:assert/strict";
import { downsideBeta, upsideBeta, betaAsymmetry } from "../src/downsidebeta.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const market = [0.01, -0.02, 0.015, -0.01, -0.03, 0.02, -0.015, 0.005];
const asset = [0.008, -0.03, 0.012, -0.02, -0.05, 0.018, -0.02, 0.004];

test("downside and upside beta split market sensitivity by sign", () => {
  close(downsideBeta(asset, market), 1.6); // grips the market harder on the way down
  close(upsideBeta(asset, market), 0.92);
});

test("beta asymmetry is the downside minus upside gap", () => {
  close(betaAsymmetry(asset, market), 1.6 - 0.92); // 0.68 — priced downside risk
});

test("a symmetric asset has no beta asymmetry", () => {
  // asset moves exactly 1.5× the market every day, both directions
  const m = [0.02, -0.02, 0.01, -0.03, 0.015, -0.01];
  const a = m.map((x) => 1.5 * x);
  close(downsideBeta(a, m), 1.5);
  close(upsideBeta(a, m), 1.5);
  close(betaAsymmetry(a, m), 0);
});

test("undefined when a side lacks two qualifying periods", () => {
  assert.ok(Number.isNaN(downsideBeta([0.1, 0.2, 0.3], [0.1, 0.2, 0.3]))); // no down days
  assert.ok(Number.isNaN(upsideBeta([-0.1, -0.2], [-0.1, -0.2]))); // no up days
  assert.ok(Number.isNaN(downsideBeta([0.1, -0.2, 0.3], [0.1, -0.2, 0.3]))); // only one down day
});

test("zero conditional market variance is undefined", () => {
  // both down-days have the same market return → zero conditional variance
  const m = [-0.01, -0.01, 0.02];
  const a = [-0.02, -0.03, 0.01];
  assert.ok(Number.isNaN(downsideBeta(a, m)));
});

test("series are paired over their common length", () => {
  // extra market entries beyond the asset length are ignored
  close(downsideBeta(asset, [...market, -0.05, -0.06]), 1.6);
});
