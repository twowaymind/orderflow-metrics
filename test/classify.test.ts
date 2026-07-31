import { test } from "node:test";
import assert from "node:assert/strict";
import { tickRule, leeReady } from "../src/classify.ts";

test("tick rule signs, carrying zero ticks", () => {
  // 100 -> 101(+) -> 101(=carry+) -> 100(-) -> 102(+)
  assert.deepEqual(tickRule([100, 101, 101, 100, 102]), [0, 1, 1, -1, 1]);
});

test("tick rule first trade is unknown", () => {
  assert.deepEqual(tickRule([50]), [0]);
  assert.deepEqual(tickRule([]), []);
});

test("Lee-Ready quote rule", () => {
  assert.deepEqual(
    leeReady([
      { price: 101, mid: 100 }, // above mid -> buy
      { price: 99, mid: 100 }, // below mid -> sell
    ]),
    [1, -1],
  );
});

test("Lee-Ready breaks at-the-mid ties with the tick rule", () => {
  // first at-mid with no prior -> 0; second at-mid, price up from 100 -> buy
  assert.deepEqual(
    leeReady([
      { price: 100, mid: 100 },
      { price: 100.5, mid: 100.5 },
    ]),
    [0, 1],
  );
});

test("Lee-Ready at-mid tie carries last sign on a flat print", () => {
  const out = leeReady([
    { price: 101, mid: 100 }, // buy
    { price: 100, mid: 100 }, // at mid, price down -> sell
    { price: 100, mid: 100 }, // at mid, flat -> carry last (sell)
  ]);
  assert.deepEqual(out, [1, -1, -1]);
});
