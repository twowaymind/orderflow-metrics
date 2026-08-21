import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shannonEntropy,
  normalizedEntropy,
  signEntropy,
} from "../src/entropy.ts";

const close = (a: number, b: number, eps = 1e-12) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

test("two equally likely outcomes give exactly 1 bit", () => {
  close(shannonEntropy([1, 1]), 1);
  close(shannonEntropy([5, 5]), 1);
});

test("k uniform outcomes give log2(k) bits", () => {
  close(shannonEntropy([1, 1, 1, 1]), 2);
  close(shannonEntropy([2, 1, 1]), 1.5);
});

test("skewed distribution (regression value)", () => {
  close(shannonEntropy([3, 1]), 0.8112781244591328);
});

test("a fully concentrated distribution has zero entropy", () => {
  assert.equal(shannonEntropy([7]), 0);
  assert.equal(shannonEntropy([0, 4, 0]), 0);
  assert.equal(shannonEntropy([]), 0);
});

test("normalized entropy maps onto [0,1]", () => {
  close(normalizedEntropy([1, 1, 1, 1]), 1); // uniform → 1
  close(normalizedEntropy([2, 1, 1]), 0.9463946303571862);
  close(normalizedEntropy([3, 1]), 0.8112781244591328); // k=2 → /1
  assert.equal(normalizedEntropy([5]), 0); // single category
  assert.equal(normalizedEntropy([]), 0);
});

test("zero/negative weights are ignored", () => {
  close(shannonEntropy([1, 0, 1]), 1);
  close(shannonEntropy([1, -3, 1]), 1);
});

test("sign entropy measures up/down balance of a return series", () => {
  const series = [0.001, -0.0015, 0.002, -0.001, 0.0012, 0.05, -0.0008, 0.0011];
  close(signEntropy(series), 0.954434002924965); // 5 up, 3 down
  assert.ok(signEntropy(series) >= 0 && signEntropy(series) <= 1);
});

test("balanced flow is 1 bit, one-sided flow is 0", () => {
  close(signEntropy([0.1, -0.1, 0.2, -0.2]), 1);
  assert.equal(signEntropy([0.1, 0.2, 0.3]), 0); // all up
  assert.equal(signEntropy([0, 0, 0]), 0); // no moves
});
