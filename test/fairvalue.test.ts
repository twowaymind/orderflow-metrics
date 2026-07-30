import { test } from "node:test";
import assert from "node:assert/strict";
import { mid, weightedMid, relativeSpreadBps } from "../src/fairvalue.ts";

const q = (bidPrice: number, bidSize: number, askPrice: number, askSize: number) =>
  ({ bidPrice, bidSize, askPrice, askSize });

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

test("weighted mid equals arithmetic mid for balanced sizes", () => {
  close(weightedMid(q(100, 5, 102, 5)), 101);
  close(mid(q(100, 5, 102, 5)), 101);
});

test("heavy bid size pulls weighted mid toward the ask", () => {
  // bidSize 9, askSize 1 -> weight ask by 9/10
  close(weightedMid(q(100, 9, 101, 1)), 100 * (1 / 10) + 101 * (9 / 10));
  assert.ok(weightedMid(q(100, 9, 101, 1)) > mid(q(100, 9, 101, 1)));
});

test("weighted mid falls back to mid when sizes are zero", () => {
  close(weightedMid(q(100, 0, 102, 0)), 101);
});

test("relative spread in bps", () => {
  // bid 99.99, ask 100.01, mid 100 -> spread 0.02 -> 2 bps
  close(relativeSpreadBps(q(99.99, 1, 100.01, 1)), 2);
});

test("relative spread is 0 at zero mid", () => {
  assert.equal(relativeSpreadBps(q(0, 1, 0, 1)), 0);
});
