import { test } from "node:test";
import assert from "node:assert/strict";
import { Welford, Ewma, EwmaVariance, RollingWindow } from "../src/online.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// Independent batch reference implementations (two-pass).
function batchMean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
function batchVar(xs: number[], ddof = 1): number {
  if (xs.length <= ddof) return 0;
  const m = batchMean(xs);
  const ss = xs.reduce((s, x) => s + (x - m) * (x - m), 0);
  return ss / (xs.length - ddof);
}

const series = [0.5, -0.2, 0.3, -0.1, 0.4, 1.7, -0.9, 0.05, 0.6, -0.3, 0.8, 0.2];

test("Welford matches batch mean/variance at every step", () => {
  const w = new Welford();
  const seen: number[] = [];
  for (const x of series) {
    w.push(x);
    seen.push(x);
    close(w.mean, batchMean(seen));
    close(w.variance, batchVar(seen, 1));
    close(w.populationVariance, batchVar(seen, 0));
    assert.equal(w.count, seen.length);
  }
});

test("Welford stays stable with a huge offset (naive Σx² would fail)", () => {
  const w = new Welford();
  const base = 1e9;
  const vals = [base + 1, base + 2, base + 3, base + 4, base + 5];
  for (const v of vals) w.push(v);
  close(w.variance, 2.5, 1e-6); // variance of 1..5 is 2.5, invariant to the offset
});

test("Ewma matches the recursion (regression value)", () => {
  const e = new Ewma(0.94);
  for (const x of [0.5, -0.2, 0.3, -0.1, 0.4]) e.push(x);
  close(e.value, 0.41467227199999995, 1e-15);
});

test("Ewma seeds on the first value and rejects bad lambda", () => {
  const e = new Ewma(0.9);
  assert.equal(e.initialized, false);
  assert.equal(e.value, 0);
  e.push(3);
  assert.equal(e.value, 3);
  assert.equal(e.initialized, true);
  assert.throws(() => new Ewma(0));
  assert.throws(() => new Ewma(1));
  assert.throws(() => new Ewma(1.5));
});

test("EwmaVariance matches RiskMetrics recursion (regression value)", () => {
  const ev = new EwmaVariance(0.94);
  for (const r of [0.5, -0.2, 0.3, -0.1, 0.4]) ev.push(r);
  close(ev.variance, 0.21211608159999998, 1e-15);
  close(ev.std, 0.4605606166401986, 1e-15);
});

test("RollingWindow matches batch over the trailing window at every step", () => {
  const size = 4;
  const rw = new RollingWindow(size);
  const seen: number[] = [];
  for (const x of series) {
    rw.push(x);
    seen.push(x);
    const window = seen.slice(-size);
    close(rw.mean, batchMean(window));
    close(rw.variance, batchVar(window, 1));
    close(rw.populationVariance, batchVar(window, 0));
    assert.equal(rw.count, Math.min(seen.length, size));
    assert.equal(rw.full, seen.length >= size);
  }
});

test("RollingWindow stays exact after many evictions", () => {
  const rw = new RollingWindow(3);
  for (const x of [1, 2, 3, 4, 5, 6]) rw.push(x);
  close(rw.mean, 5); // last window [4,5,6]
  close(rw.variance, 1); // sample variance of 4,5,6
  assert.equal(rw.count, 3);
});

test("edge cases: empty and single-value estimators return 0", () => {
  const w = new Welford();
  assert.equal(w.mean, 0);
  assert.equal(w.variance, 0);
  assert.equal(w.std, 0);
  w.push(7);
  assert.equal(w.mean, 7);
  assert.equal(w.variance, 0); // one value → no sample variance
  const rw = new RollingWindow(5);
  assert.equal(rw.mean, 0);
  assert.equal(rw.variance, 0);
  assert.equal(rw.full, false);
  assert.throws(() => new RollingWindow(0));
  assert.throws(() => new RollingWindow(2.5));
});
