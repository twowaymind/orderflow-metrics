import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inverseNormalCdf,
  valueAtRisk,
  expectedShortfall,
  gaussianValueAtRisk,
  cornishFisherValueAtRisk,
} from "../src/valueatrisk.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// deterministic return series (30 obs, two clear left-tail losses)
const R = [
  0.012, -0.008, 0.005, -0.021, 0.015, 0.004, -0.011, 0.02, -0.006, 0.009, 0.001,
  -0.014, 0.017, -0.003, 0.006, 0.011, -0.032, 0.007, 0.002, -0.01, 0.013, -0.004,
  0.008, -0.006, 0.019, -0.025, 0.003, 0.014, -0.009, 0.006,
];

test("inverseNormalCdf matches known quantiles", () => {
  close(inverseNormalCdf(0.5), 0, 1e-9);
  close(inverseNormalCdf(0.05), -1.6448536251325335, 1e-7);
  close(inverseNormalCdf(0.975), 1.959963984540054, 1e-7);
  assert.ok(Number.isNaN(inverseNormalCdf(0)));
  assert.ok(Number.isNaN(inverseNormalCdf(1)));
});

test("historical VaR vs numpy reference (95%)", () => {
  close(valueAtRisk(R, 0.95), 0.0232);
});

test("historical Expected Shortfall vs numpy reference (95%)", () => {
  close(expectedShortfall(R, 0.95), 0.0285);
});

test("ES is at least as large as VaR (coherent tail)", () => {
  assert.ok(expectedShortfall(R, 0.95) >= valueAtRisk(R, 0.95));
});

test("Gaussian VaR vs numpy reference (95%)", () => {
  close(gaussianValueAtRisk(R, 0.95), 0.020377576762, 1e-7);
});

test("Cornish-Fisher VaR vs numpy reference (95%)", () => {
  // left-skewed, so CF VaR sits above the Gaussian figure
  close(cornishFisherValueAtRisk(R, 0.95), 0.022736998015, 1e-7);
  assert.ok(cornishFisherValueAtRisk(R, 0.95) > gaussianValueAtRisk(R, 0.95));
});

test("higher confidence ⇒ larger VaR", () => {
  assert.ok(valueAtRisk(R, 0.99) >= valueAtRisk(R, 0.95));
  assert.ok(gaussianValueAtRisk(R, 0.99) > gaussianValueAtRisk(R, 0.95));
});

test("edge cases: empty, bad level, degenerate series", () => {
  assert.ok(Number.isNaN(valueAtRisk([], 0.95)));
  assert.ok(Number.isNaN(expectedShortfall([], 0.95)));
  assert.ok(Number.isNaN(gaussianValueAtRisk(R, 0)));
  assert.ok(Number.isNaN(gaussianValueAtRisk(R, 1)));
  assert.ok(Number.isNaN(cornishFisherValueAtRisk([0.01], 0.95)));
  assert.ok(Number.isNaN(cornishFisherValueAtRisk([0.01, 0.01, 0.01], 0.95))); // zero variance
});
