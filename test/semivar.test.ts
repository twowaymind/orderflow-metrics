import { test } from "node:test";
import assert from "node:assert/strict";
import {
  realizedSemivariance,
  downsideVarianceRatio,
  signedJumpVariation,
} from "../src/semivar.ts";
import { realizedVariance } from "../src/volatility.ts";

const close = (a: number, b: number, eps = 1e-12) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// Mostly-up series with one large upside jump (the 0.05) and three down moves.
const series = [0.001, -0.0015, 0.002, -0.001, 0.0012, 0.05, -0.0008, 0.0011];

test("realized semivariance splits into upside and downside (regression)", () => {
  const { upside, downside } = realizedSemivariance(series);
  close(upside, 0.00250765);
  close(downside, 0.00000389);
});

test("upside + downside == realized variance", () => {
  const { upside, downside } = realizedSemivariance(series);
  close(upside + downside, realizedVariance(series));
});

test("downside variance ratio is the negative-return share, in [0,1]", () => {
  const dr = downsideVarianceRatio(series);
  close(dr, 0.00154885050606400824, 1e-15);
  assert.ok(dr >= 0 && dr <= 1);
});

test("signed jump variation keeps direction (positive here)", () => {
  close(signedJumpVariation(series), 0.00250376);
  assert.ok(signedJumpVariation(series) > 0);
});

test("a downside-heavy series flips the signed jump negative", () => {
  const down = [-0.05, 0.001, -0.002, 0.0008];
  assert.ok(signedJumpVariation(down) < 0);
  assert.ok(downsideVarianceRatio(down) > 0.5);
});

test("zero returns contribute to neither half", () => {
  const { upside, downside } = realizedSemivariance([0, 0, 0.01, 0, -0.01]);
  close(upside, 0.0001);
  close(downside, 0.0001);
  assert.equal(signedJumpVariation([0, 0, 0.01, 0, -0.01]), 0);
});

test("edge cases return 0", () => {
  const empty = realizedSemivariance([]);
  assert.equal(empty.upside, 0);
  assert.equal(empty.downside, 0);
  assert.equal(downsideVarianceRatio([]), 0);
  assert.equal(downsideVarianceRatio([0, 0]), 0);
  assert.equal(signedJumpVariation([]), 0);
});
