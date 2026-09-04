import { test } from "node:test";
import assert from "node:assert/strict";
import {
  markoutProfile,
  adverseSelectionScore,
  averageMarkoutProfile,
  type MarkoutProfileObservation,
} from "../src/adverseselection.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);
const closeArr = (a: number[], b: number[]) => {
  assert.equal(a.length, b.length);
  a.forEach((v, i) => close(v, b[i]));
};

test("markout profile follows the taker's side", () => {
  // taker buys at mid 100.00; mid drifts up then eases → adverse for the maker
  closeArr(markoutProfile("buy", 100.0, [100.02, 100.05, 100.04]), [0.02, 0.05, 0.04]);
  // taker sells at mid 100.00; mid falls → taker's edge is positive
  closeArr(markoutProfile("sell", 100.0, [99.98, 99.95, 99.97]), [0.02, 0.05, 0.03]);
});

test("adverse-selection score is the markout in half-spread units", () => {
  // 1-step move 0.02 against a 0.02 spread → half-spread 0.01 → score 2
  close(adverseSelectionScore("buy", 100.0, 100.02, 0.02), 2);
  close(adverseSelectionScore("sell", 100.0, 99.98, 0.02), 2);
  // a fill that reverts inside the spread is not toxic (score < 1)
  close(adverseSelectionScore("buy", 100.0, 100.004, 0.02), 0.4);
  assert.equal(adverseSelectionScore("buy", 100.0, 100.02, 0), 0); // non-positive spread
});

test("average markout profile is the mean curve per horizon", () => {
  const obs: MarkoutProfileObservation[] = [
    { side: "buy", midAtTrade: 100.0, midsAfter: [100.02, 100.05, 100.04] },
    { side: "sell", midAtTrade: 100.0, midsAfter: [99.98, 99.95, 99.97] },
  ];
  closeArr(averageMarkoutProfile(obs), [0.02, 0.05, 0.035]);
});

test("ragged observations average per horizon over the fills that reach it", () => {
  const obs: MarkoutProfileObservation[] = [
    { side: "buy", midAtTrade: 10, midsAfter: [10.1, 10.2] },
    { side: "sell", midAtTrade: 10, midsAfter: [9.9] },
  ];
  // h0: mean(0.1, 0.1) = 0.1 ; h1: only the first fill = 0.2
  closeArr(averageMarkoutProfile(obs), [0.1, 0.2]);
});

test("edge cases", () => {
  assert.deepEqual(markoutProfile("buy", 100, []), []);
  assert.deepEqual(averageMarkoutProfile([]), []);
});
