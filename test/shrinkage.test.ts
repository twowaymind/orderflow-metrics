import { test } from "node:test";
import assert from "node:assert/strict";
import { ledoitWolfShrinkage } from "../src/shrinkage.ts";

const close = (a: number, b: number, eps = 1e-12) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// 24 observations x 4 assets — reference from sklearn.covariance.ledoit_wolf
const X = [
  [-0.014862, -0.003251, -0.055895, 0.009241],
  [0.013766, 0.00324, -0.00343, 0.002429],
  [-0.004353, -0.00412, 0.016677, 0.005644],
  [-0.000283, -0.000603, 0.004255, -0.004303],
  [-0.007075, 0.003945, -0.002867, -0.009154],
  [-0.008546, 0.004584, -0.005627, 0.00142],
  [0.013837, 0.028672, -0.001532, 0.018974],
  [-0.0236, -0.00797, -0.040598, 0.009618],
  [0.017678, 0.022158, -0.008578, 0.010432],
  [-0.00938, -0.00916, 0.007261, 0.007117],
  [0.005088, -0.004696, -0.023225, 0.009318],
  [0.012879, 0.014982, 0.069618, 0.001905],
  [0.052189, 0.061846, 0.086638, 0.02643],
  [-0.012276, 0.006959, -0.01096, 0.003245],
  [-0.004809, 0.001792, 0.034867, -0.000301],
  [-0.018708, -0.019904, -0.04003, -0.018098],
  [-0.017259, 0.008303, -0.015476, 0.006259],
  [-0.023338, -0.007916, -0.055935, -0.008959],
  [0.046091, 0.014295, 0.048032, 0.007031],
  [-0.00206, -0.008202, 0.030457, -0.000695],
  [0.031548, 0.006118, 0.01198, 0.003723],
  [0.008463, -0.010447, -0.020974, -0.006556],
  [-0.016074, 0.001445, 0.013257, -0.012604],
  [-0.035105, -0.030626, -0.019771, 0.011585],
];

const COV_REF = [
  [0.0004610095032172498, 0.00020846012350429568, 0.00037379282370970533, 6.597910580801435e-5],
  [0.00020846012350429568, 0.000356305914148069, 0.0002821600761063521, 7.186759052043373e-5],
  [0.00037379282370970533, 0.0002821600761063521, 0.0010304890600397222, 7.679023153378475e-5],
  [6.597910580801435e-5, 7.186759052043373e-5, 7.679023153378475e-5, 0.00019715469367482033],
];

test("Ledoit-Wolf vs sklearn reference (24x4)", () => {
  const r = ledoitWolfShrinkage(X);
  close(r.shrinkage, 0.2469621254921902, 1e-10);
  close(r.mu, 0.0005112397927699654, 1e-12);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) close(r.covariance[i][j], COV_REF[i][j], 1e-12);
});

test("shrunk covariance is symmetric and shrinks the diagonal toward mu", () => {
  const r = ledoitWolfShrinkage(X);
  // symmetry
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) close(r.covariance[i][j], r.covariance[j][i]);
  // every diagonal entry moved from the sample variance toward mu by exactly delta
  // (sanity: shrinkage in (0,1) here)
  assert.ok(r.shrinkage > 0 && r.shrinkage < 1);
});

test("shrinkage damps off-diagonals toward zero", () => {
  const r = ledoitWolfShrinkage(X);
  // sample (MLE) covariance, for comparison
  const n = X.length;
  const p = 4;
  const means = Array.from({ length: p }, (_, i) => X.reduce((a, row) => a + row[i], 0) / n);
  const S = (i: number, j: number) =>
    X.reduce((a, row) => a + (row[i] - means[i]) * (row[j] - means[j]), 0) / n;
  // every off-diagonal shrinks in magnitude: |Σ̂_ij| = (1−δ)|S_ij| < |S_ij|
  for (let i = 0; i < p; i++)
    for (let j = 0; j < p; j++)
      if (i !== j) assert.ok(Math.abs(r.covariance[i][j]) < Math.abs(S(i, j)));
});

test("a panel with more assets than observations shrinks hard toward the target", () => {
  // p (5) > n (4): the sample covariance is singular; shrinkage should be large
  const wide = X.slice(0, 4).map((row) => [...row, row[0] - row[1]]); // 4 x 5
  const r = ledoitWolfShrinkage(wide);
  // shrunk far harder than the tall 24x4 panel (fewer rows per column ⇒ noisier ⇒ more shrinkage)
  assert.ok(r.shrinkage > ledoitWolfShrinkage(X).shrinkage);
  assert.ok(r.shrinkage > 0.4);
});

test("single asset (p = 1): shrinkage 0, covariance is the sample variance", () => {
  const one = X.map((row) => [row[0]]);
  const r = ledoitWolfShrinkage(one);
  assert.equal(r.shrinkage, 0);
  // MLE variance (divide by n) of column 0
  const col = X.map((row) => row[0]);
  const mean = col.reduce((a, b) => a + b, 0) / col.length;
  const varMle = col.reduce((a, b) => a + (b - mean) ** 2, 0) / col.length;
  close(r.covariance[0][0], varMle, 1e-15);
});

test("assumeCentered skips mean subtraction", () => {
  const r1 = ledoitWolfShrinkage(X, { assumeCentered: false });
  const r2 = ledoitWolfShrinkage(X, { assumeCentered: true });
  // the data is not mean-zero, so the two disagree
  assert.ok(Math.abs(r1.shrinkage - r2.shrinkage) > 1e-6);
});

test("edge cases return NaN", () => {
  assert.ok(Number.isNaN(ledoitWolfShrinkage([]).shrinkage)); // empty
  assert.ok(Number.isNaN(ledoitWolfShrinkage([[1, 2], [3]]).shrinkage)); // ragged
  assert.deepEqual(ledoitWolfShrinkage([]).covariance, []);
});
