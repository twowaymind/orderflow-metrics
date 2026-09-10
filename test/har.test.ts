import { test } from "node:test";
import assert from "node:assert/strict";
import { harComponents, harForecast } from "../src/har.ts";

const close = (a: number, b: number, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const RV = [
  0.8, 1.0, 0.9, 1.2, 1.1, 0.7, 0.6, 0.9, 1.3, 1.5, 1.2, 1.0, 0.8, 0.9, 1.1,
  1.4, 1.6, 1.3, 1.1, 0.9, 0.7, 0.8, 1.0, 1.2, 1.5, 1.7, 1.4, 1.2, 1.0, 1.1,
  0.95, 1.25, 1.35, 1.05, 0.85, 0.9, 1.15, 1.45, 1.55, 1.2, 1.0, 0.9, 1.1, 1.3,
  1.25,
];

test("HAR components (latest daily/weekly/monthly)", () => {
  const c = harComponents(RV);
  close(c.daily, 1.25);
  close(c.weekly, (1.0 + 0.9 + 1.1 + 1.3 + 1.25) / 5); // last 5
  close(c.monthly, 1.1977272727272727); // last 22
});

test("HAR-RV fit + one-step forecast (vs numpy reference)", () => {
  const f = harForecast(RV);
  close(f.coefficients.intercept, 1.4149855768430284);
  close(f.coefficients.daily, 0.6068675996730355);
  close(f.coefficients.weekly, -0.8485968216666858);
  close(f.coefficients.monthly, 0.03520511355716988);
  close(f.forecast, 1.2737937290311845);
});

test("forecast equals coefficients applied to the latest components", () => {
  const f = harForecast(RV);
  const c = harComponents(RV);
  const manual =
    f.coefficients.intercept +
    f.coefficients.daily * c.daily +
    f.coefficients.weekly * c.weekly +
    f.coefficients.monthly * c.monthly;
  close(f.forecast, manual);
});

test("a constant series is a rank-deficient design → NaN", () => {
  // all three regressors equal the constant → collinear → singular normal equations
  const flat = new Array(40).fill(2.5);
  const f = harForecast(flat);
  assert.ok(Number.isNaN(f.forecast));
  assert.ok(Number.isNaN(f.coefficients.intercept));
});

test("perfectly daily-persistent series recovers a daily-only fit", () => {
  // RVₜ₊₁ = RVₜ exactly (a random walk in levels) → forecast ≈ last value
  const rw = [1.0];
  for (let i = 1; i < 40; i++) rw.push(rw[i - 1] + Math.sin(i) * 0.05);
  const f = harForecast(rw);
  // one-step forecast should track the last level closely
  assert.ok(Math.abs(f.forecast - rw[rw.length - 1]) < 0.2);
});

test("custom windows", () => {
  const f = harForecast(RV, { weekly: 3, monthly: 10 });
  const c = harComponents(RV, { weekly: 3, monthly: 10 });
  close(c.daily, 1.25);
  close(c.weekly, (1.1 + 1.3 + 1.25) / 3); // last 3
  close(c.monthly, (1.55 + 1.2 + 1.0 + 0.9 + 1.1 + 1.3 + 1.25 + 1.45 + 1.15 + 0.9) / 10);
  assert.ok(Number.isFinite(f.forecast));
});

test("windows longer than the series average what's available", () => {
  const c = harComponents([2, 4], { weekly: 5, monthly: 22 });
  close(c.daily, 4);
  close(c.weekly, 3); // mean of [2,4]
  close(c.monthly, 3);
});

test("edge cases: too little data returns NaN", () => {
  const nan = harForecast([1, 2, 3]); // < monthly + 4
  assert.ok(Number.isNaN(nan.forecast));
  assert.ok(Number.isNaN(nan.coefficients.intercept));
  const empty = harComponents([]);
  assert.ok(Number.isNaN(empty.daily));
});
