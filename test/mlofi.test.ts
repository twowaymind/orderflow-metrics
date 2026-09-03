import { test } from "node:test";
import assert from "node:assert/strict";
import {
  multiLevelOFI,
  multiLevelOFISeries,
  depthWeightedOFI,
  type BookSnapshot,
} from "../src/mlofi.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const prev: BookSnapshot = {
  bids: [
    { price: 100.0, size: 200 },
    { price: 99.9, size: 150 },
    { price: 99.8, size: 120 },
  ],
  asks: [
    { price: 100.1, size: 180 },
    { price: 100.2, size: 160 },
    { price: 100.3, size: 140 },
  ],
};
const curr: BookSnapshot = {
  bids: [
    { price: 100.0, size: 260 }, // L1 bid grew → buy pressure
    { price: 99.9, size: 150 },
    { price: 99.8, size: 90 }, // L3 bid shrank
  ],
  asks: [
    { price: 100.1, size: 120 }, // L1 ask shrank → buy pressure
    { price: 100.2, size: 160 },
    { price: 100.3, size: 140 },
  ],
};

test("multi-level OFI vector (Cont-Kukanov-Stoikov per level)", () => {
  const v = multiLevelOFI(prev, curr, 3);
  assert.deepEqual(v, [120, 0, -30]);
});

test("depth-weighted OFI collapses the vector", () => {
  close(depthWeightedOFI(prev, curr, 3, 0.5), 64.28571428571429); // 112.5 / 1.75
  close(depthWeightedOFI(prev, curr, 3, 1.0), 30); // (120 + 0 − 30) / 3 — equal weights
});

test("depth decay concentrates weight on the near touch", () => {
  // heavier decay → closer to the level-1 OFI (120)
  const light = depthWeightedOFI(prev, curr, 3, 0.9);
  const heavy = depthWeightedOFI(prev, curr, 3, 0.2);
  assert.ok(heavy > light); // L1 is the most positive, so weighting it up raises the scalar
  assert.ok(heavy < 120 && light > 30);
});

test("levels beyond book depth contribute 0", () => {
  assert.deepEqual(multiLevelOFI(prev, curr, 4), [120, 0, -30, 0]);
});

test("series of per-step vectors", () => {
  const curr2: BookSnapshot = {
    bids: [
      { price: 100.0, size: 240 },
      { price: 99.95, size: 100 }, // L2 bid price up
      { price: 99.8, size: 90 },
    ],
    asks: [
      { price: 100.1, size: 120 },
      { price: 100.2, size: 130 }, // L2 ask shrank
      { price: 100.3, size: 140 },
    ],
  };
  const s = multiLevelOFISeries([prev, curr, curr2], 3);
  assert.deepEqual(s, [
    [120, 0, -30],
    [-20, 130, 0],
  ]);
});

test("edge cases", () => {
  const empty: BookSnapshot = { bids: [], asks: [] };
  assert.deepEqual(multiLevelOFI(empty, empty, 3), [0, 0, 0]);
  assert.equal(depthWeightedOFI(empty, empty, 3, 0.5), 0);
  assert.deepEqual(multiLevelOFI(prev, curr, 0), []);
  assert.equal(depthWeightedOFI(prev, curr, 0, 0.5), 0);
  assert.equal(depthWeightedOFI(prev, curr, 3, 0), 0); // non-positive decay
  assert.deepEqual(multiLevelOFISeries([prev], 3), []); // single snapshot → no steps
});
