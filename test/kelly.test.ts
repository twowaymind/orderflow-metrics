import { test } from "node:test";
import assert from "node:assert/strict";
import { kellyFraction, kellyLeverage, growthOptimalLeverage } from "../src/kelly.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const R = [
  0.012, -0.008, 0.005, -0.021, 0.015, 0.004, -0.011, 0.02, -0.006, 0.009, 0.001,
  -0.014, 0.017, -0.003, 0.006, 0.011, -0.032, 0.007, 0.002, -0.01, 0.013, -0.004,
  0.008, -0.006, 0.019, -0.025, 0.003, 0.014, -0.009, 0.006,
];

test("discrete Kelly fraction f* = p - (1-p)/b", () => {
  close(kellyFraction(0.6, 2.0), 0.4); // 0.6 - 0.4/2
  close(kellyFraction(0.55, 1.0), 0.1); // even-money coin with 55% edge
  close(kellyFraction(0.4, 1.0), -0.2); // no edge → negative → don't bet
});

test("mean-variance Kelly leverage = mean / variance (vs numpy)", () => {
  const mu = R.reduce((a, b) => a + b, 0) / R.length;
  const v = R.reduce((a, b) => a + (b - mu) ** 2, 0) / R.length;
  close(kellyLeverage(mu, v), 4.63955998144176, 1e-9);
});

test("exact growth-optimal leverage (golden-section) vs scipy reference", () => {
  const lam = growthOptimalLeverage(R);
  close(lam, 4.455232959391717, 1e-9); // reproducible golden-section output
  assert.ok(Math.abs(lam - 4.455232928) < 1e-4); // matches scipy's bounded optimum
  // it really is the optimum: mean log-growth is higher there than just off it
  const g = (l: number) => R.reduce((s, r) => s + Math.log(1 + l * r), 0) / R.length;
  assert.ok(g(lam) > g(lam + 0.1));
  assert.ok(g(lam) > g(lam - 0.1));
});

test("empirical optimum is more conservative than the Gaussian approx here", () => {
  const mu = R.reduce((a, b) => a + b, 0) / R.length;
  const v = R.reduce((a, b) => a + (b - mu) ** 2, 0) / R.length;
  assert.ok(growthOptimalLeverage(R) < kellyLeverage(mu, v)); // fat left tail pulls it down
});

test("edge cases", () => {
  assert.ok(Number.isNaN(kellyFraction(1.2, 2))); // prob out of range
  assert.ok(Number.isNaN(kellyFraction(0.5, 0))); // bad odds
  assert.ok(Number.isNaN(kellyLeverage(0.01, 0))); // zero variance
  assert.ok(Number.isNaN(growthOptimalLeverage([0.01]))); // too few
  assert.ok(Number.isNaN(growthOptimalLeverage([0.01, 0.02, 0.03]))); // all positive → unbounded
  assert.ok(Number.isNaN(growthOptimalLeverage([-0.01, -0.02]))); // all negative → unbounded
});
