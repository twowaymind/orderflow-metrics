import { test } from "node:test";
import assert from "node:assert/strict";
import { realizedKurtosis, realizedSkewness } from "../src/moments.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const r = [0.01, -0.02, 0.015, -0.005, 0.03, -0.01, 0.008, -0.025];

test("realized skewness (regression value)", () => {
  close(realizedSkewness(r), 0.167588027657);
});

test("realized kurtosis (regression value)", () => {
  close(realizedKurtosis(r), 1.931132423255);
});

test("a symmetric series has zero skewness", () => {
  close(realizedSkewness([0.02, -0.02, 0.02, -0.02]), 0);
});

test("empty or zero-variance series returns 0", () => {
  assert.equal(realizedSkewness([]), 0);
  assert.equal(realizedKurtosis([]), 0);
  assert.equal(realizedSkewness([0, 0, 0]), 0);
  assert.equal(realizedKurtosis([0, 0, 0]), 0);
});
