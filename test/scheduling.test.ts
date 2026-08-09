import { test } from "node:test";
import assert from "node:assert/strict";
import { twap, pov } from "../src/scheduling.ts";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

test("twap splits evenly and sums exactly", () => {
  assert.deepEqual(twap(100, 4), [25, 25, 25, 25]);
  const s = twap(10, 3);
  assert.equal(s.length, 3);
  close(sum(s), 10);
});

test("twap rejects bad slice counts", () => {
  assert.throws(() => twap(100, 0));
  assert.throws(() => twap(100, 2.5));
});

test("pov participates at the given rate of each interval's volume", () => {
  assert.deepEqual(pov(30, [100, 100, 100], 0.1), [10, 10, 10]);
});

test("pov stops once the order is filled", () => {
  assert.deepEqual(pov(100, [1000, 1000, 1000], 0.1), [100, 0, 0]);
});

test("pov leaves a shortfall when volume is insufficient", () => {
  const s = pov(100, [100, 100], 0.1); // 10 + 10
  assert.deepEqual(s, [10, 10]);
  assert.equal(sum(s), 20); // 80 unfilled
});
