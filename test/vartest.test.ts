import { test } from "node:test";
import assert from "node:assert/strict";
import {
  kupiecPOF,
  christoffersenIndependence,
  christoffersenConditionalCoverage,
} from "../src/vartest.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// 250 observations, 18 breaches, several clustered — passes coverage, fails independence
const B = new Array(250).fill(0);
for (const i of [10, 11, 12, 40, 77, 78, 110, 140, 141, 142, 143, 180, 181, 200, 220, 221, 240, 249]) {
  B[i] = 1;
}

test("Kupiec POF vs scipy reference", () => {
  const r = kupiecPOF(B, 0.05);
  assert.equal(r.exceptions, 18);
  assert.equal(r.observations, 250);
  close(r.statistic, 2.255515250073676);
  close(r.pValue, 0.13313913, 1e-4);
  assert.ok(r.pValue > 0.05); // right number of breaches → not rejected on count
});

test("Christoffersen independence vs scipy reference", () => {
  const r = christoffersenIndependence(B);
  close(r.statistic, 23.287349213116983);
  assert.ok(r.pValue < 1e-4); // breaches cluster → independence rejected
});

test("Christoffersen conditional coverage vs scipy reference (χ² df 2 exact)", () => {
  const r = christoffersenConditionalCoverage(B, 0.05);
  close(r.statistic, 25.54286446319066);
  close(r.pValue, 2.840779045547318e-6, 1e-12); // df=2 survival = exp(-x/2), exact
  assert.ok(r.pValue < 0.01); // clustering sinks the joint test
});

test("a clean, well-behaved model passes all three", () => {
  // 5 breaches in 100, evenly spaced (no clustering) at rate 0.05
  const b = new Array(100).fill(0);
  for (const i of [9, 29, 49, 69, 89]) b[i] = 1;
  assert.ok(kupiecPOF(b, 0.05).pValue > 0.1); // exactly the expected count
  assert.ok(christoffersenIndependence(b).pValue > 0.1); // spaced out
  assert.ok(christoffersenConditionalCoverage(b, 0.05).pValue > 0.1);
});

test("too many breaches is rejected by Kupiec", () => {
  const b = new Array(100).fill(0);
  for (let i = 0; i < 20; i += 2) b[i] = 1; // 10 breaches vs 5 expected
  assert.ok(kupiecPOF(b, 0.05).pValue < 0.05);
});

test("no breaches: coverage statistic finite, independence undefined→0", () => {
  const b = new Array(50).fill(0);
  const pof = kupiecPOF(b, 0.05);
  assert.ok(Number.isFinite(pof.statistic) && pof.statistic > 0); // −2·N·ln(1−p)
  assert.equal(christoffersenIndependence(b).statistic, 0); // no transitions to breaches
});

test("edge cases", () => {
  assert.ok(Number.isNaN(kupiecPOF([], 0.05).statistic));
  assert.ok(Number.isNaN(kupiecPOF(B, 0).statistic));
  assert.ok(Number.isNaN(kupiecPOF(B, 1).statistic));
  assert.ok(Number.isNaN(christoffersenIndependence([1]).statistic));
  // booleans accepted
  close(kupiecPOF([true, false, false, true], 0.5).exceptions, 2);
});
