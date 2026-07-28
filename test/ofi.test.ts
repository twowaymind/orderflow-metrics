import { test } from "node:test";
import assert from "node:assert/strict";
import { ofi, ofiContribution, ofiSeries } from "../src/ofi.ts";

test("unchanged prices reduce to size deltas (Δbid − Δask)", () => {
  const prev = { bidPrice: 100, bidSize: 5, askPrice: 101, askSize: 4 };
  const curr = { bidPrice: 100, bidSize: 8, askPrice: 101, askSize: 1 };
  // (8 - 5) - (1 - 4) = 3 - (-3) = 6
  assert.equal(ofiContribution(prev, curr), 6);
});

test("bid price up contributes full current bid size", () => {
  const prev = { bidPrice: 100, bidSize: 5, askPrice: 101, askSize: 4 };
  const curr = { bidPrice: 100.5, bidSize: 2, askPrice: 101, askSize: 4 };
  assert.equal(ofiContribution(prev, curr), 2);
});

test("ask price down subtracts current ask size", () => {
  const prev = { bidPrice: 100, bidSize: 5, askPrice: 101, askSize: 4 };
  const curr = { bidPrice: 100, bidSize: 5, askPrice: 100.5, askSize: 3 };
  assert.equal(ofiContribution(prev, curr), -3);
});

test("cumulative OFI sums contributions", () => {
  const quotes = [
    { bidPrice: 100, bidSize: 5, askPrice: 101, askSize: 4 },
    { bidPrice: 100, bidSize: 8, askPrice: 101, askSize: 1 }, // +6
    { bidPrice: 100.5, bidSize: 2, askPrice: 101, askSize: 1 }, // +2
  ];
  assert.equal(ofi(quotes), 8);
  assert.deepEqual(ofiSeries(quotes), [6, 2]);
});

test("single quote has zero OFI", () => {
  assert.equal(ofi([{ bidPrice: 1, bidSize: 1, askPrice: 2, askSize: 1 }]), 0);
});
