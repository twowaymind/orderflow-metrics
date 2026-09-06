import { test } from "node:test";
import assert from "node:assert/strict";
import {
  downsideCovarianceMatrix,
  downsideCorrelationMatrix,
  averageDownsideCorrelation,
} from "../src/downsidecov.ts";
import { realizedSemicovariance } from "../src/semicovariance.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const x1 = [0.01, -0.02, 0.015, -0.01, -0.005];
const x2 = [0.008, -0.03, -0.01, -0.02, 0.004];
const x3 = [-0.012, -0.018, 0.02, -0.006, -0.01];
const S = [x1, x2, x3];

test("downside covariance matrix (both-down joint covariance)", () => {
  const m = downsideCovarianceMatrix(S);
  close(m[0][0], 0.000525);
  close(m[1][1], 0.0014);
  close(m[2][2], 0.000604);
  close(m[0][1], 0.0008);
  close(m[0][2], 0.00047);
  close(m[1][2], 0.00066);
  // symmetric
  close(m[1][0], m[0][1]);
  close(m[2][1], m[1][2]);
});

test("diagonal equals the semicovariance negative component of an asset with itself", () => {
  const m = downsideCovarianceMatrix(S);
  close(m[0][0], realizedSemicovariance(x1, x1).negative);
  close(m[1][1], realizedSemicovariance(x2, x2).negative);
});

test("off-diagonal equals pairwise semicovariance negative", () => {
  const m = downsideCovarianceMatrix(S);
  close(m[0][1], realizedSemicovariance(x1, x2).negative);
  close(m[1][2], realizedSemicovariance(x2, x3).negative);
});

test("downside correlation matrix", () => {
  const r = downsideCorrelationMatrix(S);
  close(r[0][0], 1);
  close(r[1][1], 1);
  close(r[0][1], 0.93313895, 1e-7);
  close(r[0][2], 0.83464104, 1e-7);
  close(r[1][2], 0.71773058, 1e-7);
});

test("average off-diagonal downside correlation", () => {
  close(averageDownsideCorrelation(S), 0.8285035229988508);
});

test("series truncate to their common length", () => {
  const a = [-0.02, -0.03, -0.01];
  const b = [-0.01, -0.02, -0.05, -0.09]; // longer — extra entry ignored
  const m = downsideCovarianceMatrix([a, b]);
  close(m[0][1], 0.02 * 0.01 + 0.03 * 0.02 + 0.01 * 0.05); // 0.0009
});

test("edge cases", () => {
  assert.deepEqual(downsideCovarianceMatrix([]), []);
  assert.ok(Number.isNaN(averageDownsideCorrelation([])));
  assert.ok(Number.isNaN(averageDownsideCorrelation([x1]))); // one asset, no pairs
  // an all-upside asset has zero downside variance → NaN correlation
  const up = [0.01, 0.02, 0.03];
  const r = downsideCorrelationMatrix([up, up]);
  assert.ok(Number.isNaN(r[0][0]));
});
