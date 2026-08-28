import { test } from "node:test";
import assert from "node:assert/strict";
import {
  twoScaleRealizedVariance,
  twoScaleRealizedVolatility,
} from "../src/tsrv.ts";

const close = (a: number, b: number, eps = 1e-15) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// deterministic: positive drift (~0.0008) + alternating bid-ask bounce (±0.002)
const r = [
  0.0028, -0.0013, 0.0029, -0.0012, 0.0027, -0.0011, 0.0028, -0.0014, 0.003,
  -0.0013, 0.0029, -0.0012, 0.0027, -0.0011, 0.0028, -0.0014, 0.003, -0.0013,
  0.0029, -0.0012,
];
const RV_ALL = 9.706e-5;

test("TSRV regression values", () => {
  close(twoScaleRealizedVariance(r, 4), 2.9148888888888926e-5);
  close(twoScaleRealizedVariance(r, 5), 5.7921904761904804e-5);
});

test("TSRV removes the noise bias (well below fine-grid RV, still positive)", () => {
  const t = twoScaleRealizedVariance(r, 4);
  assert.ok(t > 0);
  assert.ok(t < RV_ALL / 2, "TSRV should sit far below the noise-inflated RV");
});

test("two-scale volatility is the floored sqrt", () => {
  close(twoScaleRealizedVolatility(r, 4), Math.sqrt(2.9148888888888926e-5));
});

test("slowScale < 2 falls back to plain realized variance", () => {
  close(twoScaleRealizedVariance(r, 1), RV_ALL);
});

test("edge cases", () => {
  assert.equal(twoScaleRealizedVariance([], 4), 0);
  assert.equal(twoScaleRealizedVariance([0.01], 4), 0);
  // volatility floors a negative small-sample estimate at 0
  assert.ok(twoScaleRealizedVolatility(r, 4) >= 0);
});
