import { test } from "node:test";
import assert from "node:assert/strict";
import {
  realizedCovariance,
  realizedCorrelation,
  realizedBeta,
} from "../src/covariance.ts";

const close = (a: number, b: number, eps = 1e-12) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const x = [0.01, -0.02, 0.015, -0.005, 0.02, -0.01];
const y = [0.008, -0.018, 0.02, -0.002, 0.017, -0.012];

test("realized covariance (regression value)", () => {
  close(realizedCovariance(x, y), 0.0012100000000000001);
  // symmetric
  close(realizedCovariance(x, y), realizedCovariance(y, x));
});

test("realized correlation (regression value, in [-1,1])", () => {
  const c = realizedCorrelation(x, y);
  close(c, 0.9778276631265401);
  assert.ok(c >= -1 && c <= 1);
});

test("realized beta of y on x (regression value)", () => {
  close(realizedBeta(y, x), 0.9680000000000001);
});

test("a series is perfectly correlated with itself (corr 1, beta 1)", () => {
  close(realizedCorrelation(x, x), 1);
  close(realizedBeta(x, x), 1);
});

test("a sign-flipped series is anti-correlated (corr -1)", () => {
  const neg = x.map((v) => -v);
  close(realizedCorrelation(x, neg), -1);
  close(realizedBeta(neg, x), -1);
});

test("beta scales with the asset's amplitude", () => {
  const doubled = x.map((v) => 2 * v);
  close(realizedBeta(doubled, x), 2);
});

test("mismatched lengths pair over the common prefix", () => {
  close(realizedCovariance([1, 2, 3], [1, 2]), 1 * 1 + 2 * 2);
});

test("edge cases return 0", () => {
  assert.equal(realizedCovariance([], []), 0);
  assert.equal(realizedCorrelation([], []), 0);
  assert.equal(realizedCorrelation([0, 0], [1, 2]), 0); // zero variance
  assert.equal(realizedBeta([1, 2], [0, 0]), 0); // zero market variance
});
