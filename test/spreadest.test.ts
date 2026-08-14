import { test } from "node:test";
import assert from "node:assert/strict";
import { abdiRanaldo, corwinSchultz, type Ohlc } from "../src/spreadest.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// A bounce-like series: close alternates near the high / low of overlapping
// ranges, so both estimators recover a positive proportional spread.
const bounce: Ohlc[] = [
  { high: 10.2, low: 9.8, close: 10.18 },
  { high: 10.25, low: 9.85, close: 9.88 },
  { high: 10.3, low: 9.9, close: 10.27 },
  { high: 10.15, low: 9.75, close: 9.78 },
  { high: 10.35, low: 9.95, close: 10.32 },
];

test("Corwin-Schultz recovers a positive proportional spread", () => {
  close(corwinSchultz(bounce), 0.014838161189);
});

test("Abdi-Ranaldo recovers a positive proportional spread", () => {
  close(abdiRanaldo(bounce), 0.042078311801);
});

test("estimators need at least two bars", () => {
  assert.equal(corwinSchultz([]), 0);
  assert.equal(corwinSchultz([{ high: 10, low: 9, close: 9.5 }]), 0);
  assert.equal(abdiRanaldo([{ high: 10, low: 9, close: 9.5 }]), 0);
});

test("flat bars imply zero spread", () => {
  const flat: Ohlc[] = [
    { high: 10, low: 10, close: 10 },
    { high: 10, low: 10, close: 10 },
  ];
  close(corwinSchultz(flat), 0);
  close(abdiRanaldo(flat), 0);
});

test("Abdi-Ranaldo floors a trending (negative-covariance) series at zero", () => {
  const trend: Ohlc[] = [
    { high: 10.1, low: 9.9, close: 10.0 },
    { high: 10.2, low: 10.0, close: 10.15 },
    { high: 10.3, low: 10.05, close: 10.2 },
  ];
  close(abdiRanaldo(trend), 0);
});
