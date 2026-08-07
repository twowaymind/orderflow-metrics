import { test } from "node:test";
import assert from "node:assert/strict";
import { OrderBook } from "../src/orderbook.ts";
import { simulateMarketOrder } from "../src/simulate.ts";

function book() {
  const ob = new OrderBook();
  ob.update("bid", 100, 5);
  ob.update("ask", 101, 3);
  ob.update("ask", 102, 6);
  return ob; // mid = 100.5
}

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

test("buy sweeps asks and computes VWAP fill + slippage", () => {
  const r = simulateMarketOrder(book(), "buy", 4);
  assert.equal(r.filledSize, 4);
  assert.equal(r.remainingSize, 0);
  // 3@101 + 1@102 = 405 / 4 = 101.25
  close(r.avgPrice!, 101.25);
  close(r.notional, 405);
  // (101.25 - 100.5)/100.5 * 1e4
  close(r.slippageBps!, (0.75 / 100.5) * 10000);
});

test("order larger than the book leaves a remainder", () => {
  const r = simulateMarketOrder(book(), "buy", 10);
  assert.equal(r.filledSize, 9);
  assert.equal(r.remainingSize, 1);
  close(r.avgPrice!, (101 * 3 + 102 * 6) / 9);
});

test("sell sweeps bids", () => {
  const ob = new OrderBook();
  ob.update("bid", 100, 4);
  ob.update("bid", 99, 10);
  ob.update("ask", 101, 5); // mid = 100.5
  const r = simulateMarketOrder(ob, "sell", 6);
  // 4@100 + 2@99 = 598 / 6
  close(r.avgPrice!, (100 * 4 + 99 * 2) / 6);
  assert.equal(r.remainingSize, 0);
  assert.ok(r.slippageBps! > 0); // selling below mid is a cost
});

test("empty side fills nothing", () => {
  const ob = new OrderBook();
  ob.update("bid", 100, 5); // no asks
  const r = simulateMarketOrder(ob, "buy", 2);
  assert.equal(r.filledSize, 0);
  assert.equal(r.remainingSize, 2);
  assert.equal(r.avgPrice, null);
  assert.equal(r.slippageBps, null);
});
