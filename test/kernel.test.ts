import { test } from "node:test";
import assert from "node:assert/strict";
import {
  realizedKernel,
  realizedKernelVolatility,
  realizedAutocovariance,
  parzenKernel,
} from "../src/kernel.ts";

const close = (a: number, b: number, eps = 1e-15) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// deterministic: positive drift (~0.0008) + alternating bid-ask bounce (±0.002)
const r = [
  0.0028, -0.0013, 0.0029, -0.0012, 0.0027, -0.0011, 0.0028, -0.0014, 0.003,
  -0.0013, 0.0029, -0.0012, 0.0027, -0.0011, 0.0028, -0.0014, 0.003, -0.0013,
  0.0029, -0.0012,
];
const RV = 9.706e-5; // γ₀

test("realized autocovariance", () => {
  close(realizedAutocovariance(r, 0), RV);
  close(realizedAutocovariance(r, 1), -6.801000000000001e-5);
  close(realizedAutocovariance(r, 2), 8.714000000000001e-5);
  assert.equal(realizedAutocovariance(r, -1), 0);
  assert.equal(realizedAutocovariance(r, r.length), 0);
});

test("Parzen kernel shape", () => {
  close(parzenKernel(0), 1);
  close(parzenKernel(0.25), 0.71875);
  close(parzenKernel(0.6), 0.128, 1e-15);
  close(parzenKernel(0.8), 0.016, 1e-15);
  close(parzenKernel(1), 0);
  close(parzenKernel(1.5), 0);
});

test("realized kernel regression values", () => {
  close(realizedKernel(r, 1), 6.305499999999998e-5);
  close(realizedKernel(r, 2), 3.440296296296295e-5);
  close(realizedKernel(r, 4), 4.808607999999996e-5);
  close(realizedKernel(r, 5), 5.7029444444444435e-5);
});

test("kernel corrects the noise bias (sits below plain RV)", () => {
  assert.ok(realizedKernel(r, 2) < RV / 2);
  assert.ok(realizedKernel(r, 2) > 0); // Parzen keeps it non-negative
});

test("bandwidth < 1 falls back to plain realized variance", () => {
  close(realizedKernel(r, 0), RV);
});

test("realized-kernel volatility is the floored sqrt", () => {
  close(realizedKernelVolatility(r, 4), Math.sqrt(4.808607999999996e-5));
  assert.ok(realizedKernelVolatility(r, 4) >= 0);
});

test("edge cases", () => {
  assert.equal(realizedKernel([], 4), 0);
  assert.equal(realizedKernel([0.01], 4), 1e-4); // γ₀ only, bandwidth clamped
  assert.equal(realizedKernelVolatility([], 4), 0);
});
