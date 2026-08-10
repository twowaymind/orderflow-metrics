import { test } from "node:test";
import assert from "node:assert/strict";
import { tickBars, volumeBars, dollarBars } from "../src/bars.ts";
import type { Trade } from "../src/types.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const T = (price: number, size: number, side: "buy" | "sell", ts?: number): Trade =>
  ({ price, size, side, ts });

test("tick bars aggregate a fixed number of trades", () => {
  const trades = [
    T(100, 1, "buy"),
    T(101, 1, "sell"),
    T(102, 1, "buy"),
    T(103, 1, "sell"),
  ];
  const bars = tickBars(trades, 2);
  assert.equal(bars.length, 2);

  assert.deepEqual(
    { o: bars[0].open, h: bars[0].high, l: bars[0].low, c: bars[0].close },
    { o: 100, h: 101, l: 100, c: 101 },
  );
  assert.equal(bars[0].ticks, 2);
  assert.equal(bars[0].volume, 2);
  close(bars[0].vwap, 100.5);
  assert.equal(bars[0].buyVolume, 1);
  assert.equal(bars[0].sellVolume, 1);

  assert.equal(bars[1].open, 102);
  assert.equal(bars[1].close, 103);
  close(bars[1].vwap, 102.5);
});

test("tick bars drop a trailing partial bar", () => {
  const trades = [T(1, 1, "buy"), T(2, 1, "buy"), T(3, 1, "buy"), T(4, 1, "buy")];
  const bars = tickBars(trades, 3); // 4 trades, step 3 -> 1 full bar, last dropped
  assert.equal(bars.length, 1);
  assert.equal(bars[0].ticks, 3);
  assert.equal(bars[0].close, 3);
});

test("volume bars close when cumulative size crosses the threshold", () => {
  const trades = [
    T(10, 3, "buy"),
    T(11, 4, "buy"), // cum 7 >= 5 -> close bar 1
    T(12, 2, "sell"),
    T(13, 5, "sell"), // cum 7 >= 5 -> close bar 2
  ];
  const bars = volumeBars(trades, 5);
  assert.equal(bars.length, 2);

  assert.equal(bars[0].volume, 7);
  assert.equal(bars[0].buyVolume, 7);
  assert.equal(bars[0].sellVolume, 0);
  close(bars[0].vwap, (10 * 3 + 11 * 4) / 7);

  assert.equal(bars[1].volume, 7);
  assert.equal(bars[1].sellVolume, 7);
  close(bars[1].vwap, (12 * 2 + 13 * 5) / 7);
});

test("the threshold-crossing trade is included whole, not split", () => {
  const bars = volumeBars([T(100, 1, "buy"), T(100, 10, "buy")], 5);
  assert.equal(bars.length, 1);
  assert.equal(bars[0].volume, 11); // overshoots 5, trade not split
});

test("dollar bars accumulate traded value", () => {
  const trades = [
    T(10, 1, "buy"), // $10
    T(10, 1, "buy"), // cum $20 >= 20 -> close bar 1
    T(20, 1, "sell"), // $20 >= 20 -> close bar 2
  ];
  const bars = dollarBars(trades, 20);
  assert.equal(bars.length, 2);
  assert.equal(bars[0].dollar, 20);
  assert.equal(bars[0].ticks, 2);
  assert.equal(bars[1].dollar, 20);
  assert.equal(bars[1].ticks, 1);
});

test("timestamps propagate to bar start / end when present", () => {
  const bars = tickBars([T(1, 1, "buy", 1000), T(2, 1, "buy", 1500)], 2);
  assert.equal(bars[0].start, 1000);
  assert.equal(bars[0].end, 1500);
});

test("bar edge cases", () => {
  assert.deepEqual(tickBars([], 2), []);
  assert.deepEqual(tickBars([T(1, 1, "buy")], 0), []);
  assert.deepEqual(volumeBars([T(1, 1, "buy")], 0), []);
  assert.deepEqual(dollarBars([T(1, 1, "buy")], -5), []);
});
