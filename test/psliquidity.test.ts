import { test } from "node:test";
import assert from "node:assert/strict";
import { pastorStambaughGamma } from "../src/psliquidity.ts";

const close = (a: number, b: number, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const R = [
  0.012, -0.008, 0.005, -0.02, 0.015, 0.004, -0.011, 0.02, -0.006, 0.009, 0.001,
  -0.014, 0.017, -0.003, 0.006, 0.011, -0.019, 0.007, 0.002, -0.01, 0.013, -0.004,
];
const RE = [
  0.01, -0.01, 0.004, -0.022, 0.013, 0.003, -0.013, 0.018, -0.008, 0.007, 0.0,
  -0.016, 0.015, -0.005, 0.004, 0.009, -0.021, 0.006, 0.001, -0.012, 0.011, -0.006,
];
const V = [
  1.2, 0.9, 1.5, 2.1, 1.1, 0.8, 1.7, 1.3, 0.95, 1.05, 1.4, 2.0, 1.15, 0.85, 1.6,
  1.25, 2.2, 1.0, 0.9, 1.8, 1.35, 1.1,
];

test("Pástor-Stambaugh gamma (vs numpy reference)", () => {
  const ps = pastorStambaughGamma(R, RE, V);
  close(ps.gamma, -0.008012986415941436);
  close(ps.phi, 0.2678802801880574);
  close(ps.intercept, -0.0007943910370823526);
});

test("recovers a planted gamma exactly (no noise)", () => {
  // build rᵉₜ₊₁ = θ + φ·rₜ + γ·sign(rᵉₜ)·vₜ exactly, then recover γ
  const theta = 0.001,
    phi = 0.3,
    gamma = -0.02;
  const r = [0.01, -0.02, 0.015, -0.01, 0.02, -0.005, 0.012, -0.018, 0.008, 0.004];
  const re = [0.009, -0.021, 0.014, -0.012, 0.019, -0.006, 0.011, -0.02, 0.007, 0.003];
  const v = [1.1, 0.9, 1.4, 2.0, 1.2, 0.8, 1.6, 1.3, 1.0, 1.5];
  const sgn = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0);
  const reBuilt = [re[0]];
  for (let t = 0; t < r.length - 1; t++) {
    reBuilt.push(theta + phi * r[t] + gamma * sgn(re[t]) * v[t]);
  }
  const ps = pastorStambaughGamma(r, reBuilt, v);
  close(ps.gamma, gamma);
  close(ps.phi, phi);
  close(ps.intercept, theta);
});

test("negative gamma signals reversal / lower liquidity", () => {
  const ps = pastorStambaughGamma(R, RE, V);
  assert.ok(ps.gamma < 0);
});

test("series pair over their common length", () => {
  const ps1 = pastorStambaughGamma(R, RE, V);
  const ps2 = pastorStambaughGamma([...R, 0.05], RE, [...V, 9]); // extra tails ignored
  close(ps1.gamma, ps2.gamma);
});

test("sign(0) contributes zero signed volume", () => {
  // a zero excess return zeroes that row's volume regressor — no throw, finite fit
  const r = [0.01, 0.0, 0.02, -0.01, 0.015, 0.005, -0.02, 0.01];
  const re = [0.009, 0.0, 0.018, -0.012, 0.013, 0.004, -0.021, 0.008];
  const v = [1.1, 1.0, 1.4, 2.0, 1.2, 0.8, 1.6, 1.3];
  const ps = pastorStambaughGamma(r, re, v);
  assert.ok(Number.isFinite(ps.gamma));
});

test("edge cases: too little data → NaN", () => {
  const ps = pastorStambaughGamma([0.01, -0.02, 0.03], [0.01, -0.02, 0.03], [1, 1, 1]);
  assert.ok(Number.isNaN(ps.gamma));
  assert.ok(Number.isNaN(ps.phi));
  const empty = pastorStambaughGamma([], [], []);
  assert.ok(Number.isNaN(empty.gamma));
});
