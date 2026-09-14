import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sharpeRatio,
  annualizedSharpeRatio,
  sortinoRatio,
  maxDrawdown,
  calmarRatio,
} from "../src/performance.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const R = [
  0.012, -0.008, 0.005, -0.021, 0.015, 0.004, -0.011, 0.02, -0.006, 0.009, 0.001,
  -0.014, 0.017, -0.003, 0.006, 0.011, -0.032, 0.007, 0.002, -0.01, 0.013, -0.004,
  0.008, -0.006, 0.019, -0.025, 0.003, 0.014, -0.009, 0.006,
];

test("Sharpe ratio vs numpy reference (per period, rf=0)", () => {
  close(sharpeRatio(R), 0.058638122863142);
});

test("annualized Sharpe vs numpy reference (252)", () => {
  close(annualizedSharpeRatio(R, 252), 0.930851342661149);
});

test("Sortino ratio vs numpy reference (target=0)", () => {
  close(sortinoRatio(R), 0.080090284933656);
  // downside-only denominator ⇒ Sortino > Sharpe here
  assert.ok(sortinoRatio(R) > sharpeRatio(R));
});

test("max drawdown vs numpy reference", () => {
  close(maxDrawdown(R), 0.033041703520000);
});

test("Calmar ratio vs numpy reference (252)", () => {
  close(calmarRatio(R, 252), 5.687689815539386);
});

test("risk-free rate lowers the Sharpe ratio", () => {
  assert.ok(sharpeRatio(R, 0.002) < sharpeRatio(R, 0));
});

test("max drawdown: known curve", () => {
  // +10%, then -50% off the peak of 1.1 → 0.55, drawdown = (1.1-0.55)/1.1 = 0.5
  close(maxDrawdown([0.1, -0.5, 0.2]), 0.5);
  // monotonically rising → no drawdown
  close(maxDrawdown([0.01, 0.02, 0.03]), 0);
});

test("edge cases", () => {
  assert.ok(Number.isNaN(sharpeRatio([])));
  assert.ok(Number.isNaN(sharpeRatio([0.01]))); // needs ≥ 2
  assert.ok(Number.isNaN(sharpeRatio([0.01, 0.01, 0.01]))); // zero variance
  assert.ok(Number.isNaN(sortinoRatio([])));
  assert.ok(Number.isNaN(sortinoRatio([0.01, 0.02, 0.03]))); // no downside
  assert.ok(Number.isNaN(maxDrawdown([])));
  assert.ok(Number.isNaN(calmarRatio([], 252)));
  assert.ok(Number.isNaN(calmarRatio(R, 0))); // bad periodsPerYear
  assert.ok(Number.isNaN(calmarRatio([0.01, 0.02, 0.03], 252))); // no drawdown
});
