import { test } from "node:test";
import assert from "node:assert/strict";
import { depthImbalance, tradeImbalance } from "../src/imbalance.ts";
import type { Trade } from "../src/types.ts";

test("depth imbalance is (bid − ask)/(bid + ask)", () => {
  assert.equal(
    depthImbalance({ bidPrice: 100, bidSize: 3, askPrice: 101, askSize: 1 }),
    0.5,
  );
});

test("depth imbalance of empty book is 0", () => {
  assert.equal(
    depthImbalance({ bidPrice: 0, bidSize: 0, askPrice: 0, askSize: 0 }),
    0,
  );
});

test("trade imbalance nets buy vs sell volume", () => {
  const trades: Trade[] = [
    { price: 100, size: 2, side: "buy" },
    { price: 100, size: 1, side: "sell" },
  ];
  assert.equal(tradeImbalance(trades), (2 - 1) / (2 + 1));
});

test("trade imbalance of no trades is 0", () => {
  assert.equal(tradeImbalance([]), 0);
});
