import { test } from "node:test";
import assert from "node:assert/strict";
import { symmetricEigenvalues, absorptionRatio } from "../src/absorption.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const C = [
  [4, 1, 2],
  [1, 3, 0.5],
  [2, 0.5, 5],
];
const D = [
  [1, 0.8, 0.7, 0.6],
  [0.8, 1, 0.5, 0.4],
  [0.7, 0.5, 1, 0.3],
  [0.6, 0.4, 0.3, 1],
];

test("symmetric eigenvalues, descending (vs reference)", () => {
  const ev = symmetricEigenvalues(C);
  close(ev[0], 6.831254430698207);
  close(ev[1], 3.0722239520050736);
  close(ev[2], 2.096521617296719);
});

test("eigenvalues sum to the trace", () => {
  const ev = symmetricEigenvalues(C);
  close(ev[0] + ev[1] + ev[2], 4 + 3 + 5);
  const evD = symmetricEigenvalues(D);
  close(evD.reduce((a, b) => a + b, 0), 4);
});

test("eigenvalues come back sorted descending", () => {
  const ev = symmetricEigenvalues(D);
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i - 1] >= ev[i]);
});

test("diagonal matrix eigenvalues are its diagonal", () => {
  const ev = symmetricEigenvalues([
    [5, 0, 0],
    [0, 2, 0],
    [0, 0, 9],
  ]);
  close(ev[0], 9);
  close(ev[1], 5);
  close(ev[2], 2);
});

test("absorption ratio matches the eigenvalue shares", () => {
  close(absorptionRatio(C, 1), 0.569271202558184);
  close(absorptionRatio(C, 2), 0.8252898652252734);
  close(absorptionRatio(C, 3), 1);
  close(absorptionRatio(D, 1), 0.6718490750193321);
  close(absorptionRatio(D, 2), 0.8502498373868795);
});

test("all components absorb the whole variance", () => {
  close(absorptionRatio(C, 3), 1);
  close(absorptionRatio(D, 4), 1);
});

test("numComponents is clamped to [1, n]", () => {
  close(absorptionRatio(C, 0), absorptionRatio(C, 1)); // 0 → 1
  close(absorptionRatio(C, 99), 1); // > n → n → whole variance
});

test("default numComponents is a fifth of the assets (floored at 1)", () => {
  // n=3 → round(0.6)=1 component
  close(absorptionRatio(C), absorptionRatio(C, 1));
  // n=4 → round(0.8)=1 component
  close(absorptionRatio(D), absorptionRatio(D, 1));
});

test("a single-factor block absorbs nearly everything in one component", () => {
  // rank-1-ish: every pair highly correlated
  const ones = [
    [1, 0.99, 0.99],
    [0.99, 1, 0.99],
    [0.99, 0.99, 1],
  ];
  assert.ok(absorptionRatio(ones, 1) > 0.99);
});

test("edge cases", () => {
  assert.deepEqual(symmetricEigenvalues([]), []);
  assert.ok(Number.isNaN(absorptionRatio([])));
  close(symmetricEigenvalues([[7]])[0], 7);
  close(absorptionRatio([[7]], 1), 1);
  // zero matrix → no variance to absorb → NaN
  assert.ok(
    Number.isNaN(
      absorptionRatio([
        [0, 0],
        [0, 0],
      ]),
    ),
  );
});
