import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jensensAlpha,
  treynorRatio,
  trackingError,
  informationRatio,
} from "../src/benchmark.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const R = [
  0.012, -0.008, 0.005, -0.021, 0.015, 0.004, -0.011, 0.02, -0.006, 0.009, 0.001,
  -0.014, 0.017, -0.003, 0.006, 0.011, -0.032, 0.007, 0.002, -0.01, 0.013, -0.004,
  0.008, -0.006, 0.019, -0.025, 0.003, 0.014, -0.009, 0.006,
];
const M = [
  0.008, -0.004, 0.006, -0.015, 0.011, 0.002, -0.007, 0.014, -0.003, 0.006, 0.0,
  -0.009, 0.012, -0.002, 0.004, 0.008, -0.02, 0.005, 0.001, -0.006, 0.009, -0.002,
  0.005, -0.003, 0.013, -0.016, 0.002, 0.01, -0.005, 0.004,
];

test("Jensen's alpha vs numpy reference", () => {
  close(jensensAlpha(R, M), -0.000632793472966);
});

test("Treynor ratio vs numpy reference", () => {
  close(treynorRatio(R, M), 0.000511308279022);
});

test("tracking error vs numpy reference", () => {
  close(trackingError(R, M), 0.004472778457116);
});

test("information ratio vs numpy reference", () => {
  close(informationRatio(R, M), -0.037262446209811);
});

test("beating the benchmark on every bar gives a positive information ratio", () => {
  const bench = [0.01, -0.01, 0.02, -0.005, 0.008];
  const out = bench.map((m) => m + 0.003); // constant +0.3% active return
  assert.ok(informationRatio(out, bench) > 0);
  close(jensensAlpha(out, bench), 0.003, 1e-9); // pure alpha, β = 1
});

test("identical series: zero tracking error ⇒ NaN information ratio, zero alpha", () => {
  assert.ok(Number.isNaN(informationRatio(R, R)));
  close(trackingError(R, R), 0);
  close(jensensAlpha(R, R), 0, 1e-12); // β = 1, α = 0 against itself
});

test("risk-free rate feeds through alpha and Treynor", () => {
  assert.ok(jensensAlpha(R, M, 0.001) !== jensensAlpha(R, M, 0));
  assert.ok(Number.isFinite(treynorRatio(R, M, 0.001)));
});

test("edge cases", () => {
  assert.ok(Number.isNaN(jensensAlpha([0.01], [0.01])));
  assert.ok(Number.isNaN(trackingError([], [])));
  // zero-variance benchmark → beta undefined → alpha/Treynor NaN
  assert.ok(Number.isNaN(jensensAlpha(R.slice(0, 5), [0.01, 0.01, 0.01, 0.01, 0.01])));
  assert.ok(Number.isNaN(treynorRatio(R.slice(0, 5), [0.01, 0.01, 0.01, 0.01, 0.01])));
});
