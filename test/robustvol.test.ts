import { test } from "node:test";
import assert from "node:assert/strict";
import { minRV, medRV, realizedQuarticity } from "../src/robustvol.ts";

const close = (a: number, b: number, eps = 1e-12) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// A quiet series with one large jump (the 0.05 return).
const withJump = [0.001, -0.0015, 0.002, -0.001, 0.0012, 0.05, -0.0008, 0.0011];

// Realized variance for comparison (Σ rᵢ²).
const rv = (r: readonly number[]) => r.reduce((s, x) => s + x * x, 0);

test("MinRV (regression value)", () => {
  close(minRV(withJump), 2.5066227427721536e-5);
});

test("MedRV (regression value)", () => {
  close(medRV(withJump), 1.8981551692380114e-5);
});

test("realized quarticity (regression value)", () => {
  close(realizedQuarticity(withJump), 1.6666738692800002e-5);
});

test("MinRV and MedRV strip the jump (both far below RV)", () => {
  const total = rv(withJump); // ≈ 0.002512, dominated by the 0.05 jump
  assert.ok(minRV(withJump) < total / 50, "MinRV should discard the jump");
  assert.ok(medRV(withJump) < total / 50, "MedRV should discard the jump");
});

test("MedRV picks the true median of each triple", () => {
  // one triple: med(|1|,|3|,|2|) = 2, scaled by π/(6−4√3+π)·(n/(n−2))
  const scale = Math.PI / (6 - 4 * Math.sqrt(3) + Math.PI);
  close(medRV([1, 3, 2]), scale * (3 / 1) * 4);
});

test("edge cases return 0", () => {
  assert.equal(minRV([]), 0);
  assert.equal(minRV([0.01]), 0);
  assert.equal(medRV([0.01, 0.02]), 0);
  assert.equal(realizedQuarticity([]), 0);
});

test("all estimators are non-negative", () => {
  for (const fn of [minRV, medRV, realizedQuarticity]) {
    assert.ok(fn(withJump) >= 0);
  }
});
