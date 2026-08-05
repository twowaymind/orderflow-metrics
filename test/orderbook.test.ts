import { test } from "node:test";
import assert from "node:assert/strict";
import { OrderBook } from "../src/orderbook.ts";

function book() {
  const ob = new OrderBook();
  ob.update("bid", 100, 5);
  ob.update("bid", 99, 8);
  ob.update("ask", 101, 3);
  ob.update("ask", 102, 6);
  return ob;
}

test("best bid/ask, mid and spread", () => {
  const ob = book();
  assert.deepEqual(ob.bestBid(), { price: 100, size: 5 });
  assert.deepEqual(ob.bestAsk(), { price: 101, size: 3 });
  assert.equal(ob.mid(), 100.5);
  assert.equal(ob.spread(), 1);
});

test("update overwrites size and size<=0 removes the level", () => {
  const ob = book();
  ob.update("bid", 100, 9); // overwrite
  assert.deepEqual(ob.bestBid(), { price: 100, size: 9 });
  ob.update("bid", 100, 0); // remove -> best bid becomes 99
  assert.deepEqual(ob.bestBid(), { price: 99, size: 8 });
});

test("depth is best-price-first and capped at n", () => {
  const ob = book();
  assert.deepEqual(ob.depth("bid", 2), [
    { price: 100, size: 5 },
    { price: 99, size: 8 },
  ]);
  assert.deepEqual(ob.depth("ask", 1), [{ price: 101, size: 3 }]);
});

test("imbalance over top levels", () => {
  const ob = book();
  // top-1: (5 - 3)/(5 + 3) = 0.25
  assert.equal(ob.imbalance(1), 0.25);
  // top-2: (13 - 9)/(13 + 9) = 4/22
  assert.ok(Math.abs(ob.imbalance(2) - 4 / 22) < 1e-12);
});

test("empty book returns nulls and zero imbalance", () => {
  const ob = new OrderBook();
  assert.equal(ob.bestBid(), null);
  assert.equal(ob.mid(), null);
  assert.equal(ob.spread(), null);
  assert.equal(ob.imbalance(3), 0);
});
