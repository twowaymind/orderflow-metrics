import { test } from "node:test";
import assert from "node:assert/strict";
import { meanReversionSpeed, halfLife, zScore } from "../src/meanrev.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// Mean-reverting spread oscillating around ~10.
const s = [10.0, 10.6, 10.1, 9.7, 10.2, 9.8, 10.3, 9.9];

test("mean-reversion speed and half-life on a reverting series", () => {
  const kappa = meanReversionSpeed(s);
  close(kappa, 1.3928571428571417); // 39/28
  assert.ok(kappa > 0); // mean-reverting
  close(halfLife(s), Math.LN2 / kappa);
  close(halfLife(s), 0.49764412963278165);
});

test("half-life is ln2 / speed", () => {
  close(halfLife(s) * meanReversionSpeed(s), Math.LN2);
});

test("z-score of the latest observation", () => {
  close(zScore(s), -0.6416889479197506); // last point sits below the mean
  close(zScore([2, 4, 6]), 1.224744871391589); // (6-4)/sqrt(8/3)
});

test("perfect alternation reverts hardest", () => {
  const a = [1, -1, 1, -1, 1, -1];
  close(meanReversionSpeed(a), 2.0);
  close(halfLife(a), Math.LN2 / 2); // 0.34657359...
  close(zScore(a), -1.0);
});

test("a trend with constant increments does not revert", () => {
  const t = [1, 2, 3, 4, 5];
  close(meanReversionSpeed(t), 0); // random-walk boundary
  assert.equal(halfLife(t), Infinity);
});

test("an explosive series has negative speed and infinite half-life", () => {
  const e = [1, 2, 4, 8, 16];
  close(meanReversionSpeed(e), -1.0);
  assert.equal(halfLife(e), Infinity);
});

test("edge cases", () => {
  // fewer than 3 points → speed 0, half-life Infinity
  assert.equal(meanReversionSpeed([1, 2]), 0);
  assert.equal(halfLife([1, 2]), Infinity);
  // constant series → no dispersion, no reversion signal
  const c = [5, 5, 5, 5];
  assert.equal(meanReversionSpeed(c), 0);
  assert.equal(halfLife(c), Infinity);
  assert.equal(zScore(c), 0);
  // empty
  assert.equal(zScore([]), 0);
});
