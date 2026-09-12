import { test } from "node:test";
import assert from "node:assert/strict";
import {
  leeMyklandStatistics,
  leeMyklandCriticalValue,
  leeMyklandJumps,
} from "../src/leemykland.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// Clean deterministic series: alternating ~1% returns with one clear jump at i=15.
const R = [
  0.01, -0.008, 0.011, -0.009, 0.01, -0.011, 0.009, -0.01, 0.012, -0.008,
  0.01, -0.009, 0.011, -0.01, 0.009, 0.09, -0.01, 0.011, -0.009, 0.01,
  -0.011, 0.009, -0.01, 0.012,
];

test("statistics vs numpy reference (K=5)", () => {
  const L = leeMyklandStatistics(R, { windowSize: 5 });
  // first K-1 = 4 entries have no full window
  for (let i = 0; i < 4; i++) assert.ok(Number.isNaN(L[i]));
  assert.ok(!Number.isNaN(L[4]));
  close(L[4], 0.845755942941);
  close(L[14], 0.719295931966);
  close(L[15], 7.192959319665); // the planted jump
});

test("critical value vs numpy reference (n=20, α=0.01)", () => {
  close(leeMyklandCriticalValue(20, 0.01), 3.869131546641);
});

test("detects exactly the planted jump", () => {
  const jumps = leeMyklandJumps(R, { windowSize: 5, significance: 0.01 });
  assert.equal(jumps.length, 1);
  assert.equal(jumps[0].index, 15);
  assert.equal(jumps[0].direction, 1);
  close(jumps[0].statistic, 7.192959319665);
});

test("a down-jump is flagged with direction −1", () => {
  const r = R.slice();
  r[15] = -0.09; // flip the jump downward
  const jumps = leeMyklandJumps(r, { windowSize: 5, significance: 0.01 });
  assert.equal(jumps.length, 1);
  assert.equal(jumps[0].index, 15);
  assert.equal(jumps[0].direction, -1);
});

test("a purely diffusive series flags no jumps", () => {
  const calm = [
    0.01, -0.008, 0.011, -0.009, 0.01, -0.011, 0.009, -0.01, 0.012, -0.008,
    0.01, -0.009, 0.011, -0.01, 0.009, -0.008, 0.01, -0.009, 0.011, -0.01,
  ];
  assert.equal(leeMyklandJumps(calm, { windowSize: 5 }).length, 0);
});

test("default window is max(3, round(√n))", () => {
  // n = 24 → round(√24) = 5, so default matches the explicit K=5 result
  const jumpsDefault = leeMyklandJumps(R);
  const jumpsK5 = leeMyklandJumps(R, { windowSize: 5 });
  assert.deepEqual(jumpsDefault, jumpsK5);
});

test("degenerate local window yields NaN, not Infinity", () => {
  // zeros before the tested return → zero local vol → NaN (not ±∞)
  const r = [0, 0, 0, 0, 0.05, -0.01, 0.02, -0.015, 0.01];
  const L = leeMyklandStatistics(r, { windowSize: 5 });
  assert.ok(Number.isNaN(L[4]));
  assert.ok(L.every((v) => !Number.isFinite(v) === Number.isNaN(v)));
});

test("edge cases: too little data or bad inputs", () => {
  assert.deepEqual(leeMyklandStatistics([], { windowSize: 5 }), []);
  assert.equal(leeMyklandJumps([0.01, -0.02, 0.03], { windowSize: 5 }).length, 0);
  assert.ok(Number.isNaN(leeMyklandCriticalValue(1)));
  assert.ok(Number.isNaN(leeMyklandCriticalValue(20, 0)));
  assert.ok(Number.isNaN(leeMyklandCriticalValue(20, 1)));
});
