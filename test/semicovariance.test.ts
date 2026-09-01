import { test } from "node:test";
import assert from "node:assert/strict";
import { realizedSemicovariance } from "../src/semicovariance.ts";
import { realizedCovariance } from "../src/covariance.ts";

const close = (a: number, b: number, eps = 1e-12) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const x = [0.01, -0.02, 0.015, -0.01, 0.02];
const y = [0.012, -0.018, -0.005, 0.008, 0.017];

test("realized semicovariance components", () => {
  const s = realizedSemicovariance(x, y);
  close(s.positive, 0.00046); // both up: i0 + i4
  close(s.negative, 0.00036); // both down: i1
  close(s.mixed, -0.000155); // discordant: i2 + i3
});

test("components sum to realized covariance", () => {
  const s = realizedSemicovariance(x, y);
  close(s.positive + s.negative + s.mixed, realizedCovariance(x, y));
});

test("sign invariants: P,N >= 0, M <= 0", () => {
  const s = realizedSemicovariance(x, y);
  assert.ok(s.positive >= 0 && s.negative >= 0 && s.mixed <= 0);
});

test("crash-heavy pair loads the negative (downside) component", () => {
  const a = [-0.03, -0.02, -0.01, 0.005];
  const b = [-0.025, -0.015, -0.02, 0.004];
  const s = realizedSemicovariance(a, b);
  close(s.negative, 0.00125);
  close(s.positive, 2e-5);
  close(s.mixed, 0);
  close(s.positive + s.negative + s.mixed, realizedCovariance(a, b));
});

test("edge cases", () => {
  const z = realizedSemicovariance([], []);
  assert.equal(z.positive, 0);
  assert.equal(z.negative, 0);
  assert.equal(z.mixed, 0);
  // mismatched lengths pair over the common prefix
  const s = realizedSemicovariance([0.01, -0.02, 0.03], [0.02, -0.01]);
  close(s.positive, 0.0002); // only i0 (i2 has no y)
  close(s.negative, 0.0002); // i1
  close(s.mixed, 0);
});
