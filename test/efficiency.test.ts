import { test } from "node:test";
import assert from "node:assert/strict";
import { autocorrelation, varianceRatio } from "../src/efficiency.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

test("autocorrelation is negative for an alternating series", () => {
  // [1,-1,1,-1] mean 0: num = -3, den = 4 -> -0.75
  close(autocorrelation([1, -1, 1, -1], 1), -0.75);
});

test("autocorrelation edge cases", () => {
  assert.equal(autocorrelation([1, 2], 5), 0);
  assert.equal(autocorrelation([2, 2, 2], 1), 0); // zero variance
});

test("variance ratio VR(1) is always 1", () => {
  close(varianceRatio([0.5, -0.2, 0.1, 0.3, -0.4], 1), 1);
});

test("alternating returns mean-revert: VR(2) = 0", () => {
  close(varianceRatio([1, -1, 1, -1, 1, -1], 2), 0);
});

test("persistent (trending) returns give VR(2) > 1", () => {
  // blocks of same sign -> positive short-horizon autocorrelation
  const vr = varianceRatio([1, 1, 1, 1, -1, -1, -1, -1], 2);
  assert.ok(vr > 1, `expected >1, got ${vr}`);
});

test("variance ratio degenerate input returns 1", () => {
  assert.equal(varianceRatio([], 2), 1);
  assert.equal(varianceRatio([0.1], 3), 1);
  assert.equal(varianceRatio([2, 2, 2, 2], 2), 1); // zero variance
});
