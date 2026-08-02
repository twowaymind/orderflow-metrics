import { test } from "node:test";
import assert from "node:assert/strict";
import {
  realizedVariance,
  realizedVolatility,
  annualizedVolatility,
} from "../src/volatility.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

test("realized variance is the sum of squared returns", () => {
  close(realizedVariance([0.01, -0.01, 0.02]), 0.0001 + 0.0001 + 0.0004);
});

test("realized volatility is the root of realized variance", () => {
  close(realizedVolatility([0.03, 0.04]), Math.sqrt(0.0009 + 0.0016)); // 0.05
});

test("annualized volatility scales by periods per year", () => {
  // mean(r^2) = (0.0001 + 0.0001)/2 = 0.0001 ; *252 -> 0.0252 ; sqrt ~ 0.158745
  close(annualizedVolatility([0.01, -0.01], 252), Math.sqrt(0.0001 * 252));
});

test("empty series is 0", () => {
  assert.equal(realizedVariance([]), 0);
  assert.equal(realizedVolatility([]), 0);
  assert.equal(annualizedVolatility([], 252), 0);
});
