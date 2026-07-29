import { test } from "node:test";
import assert from "node:assert/strict";
import {
  effectiveSpread,
  realizedSpread,
  priceImpact,
  kyleLambda,
  rollSpread,
} from "../src/execution.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

test("effective spread is symmetric for buys and sells", () => {
  close(effectiveSpread(101, 100, "buy"), 2); // 2·(101-100)
  close(effectiveSpread(99, 100, "sell"), 2); // 2·-1·(99-100)
});

test("realized spread uses the later mid", () => {
  close(realizedSpread(101, 100.5, "buy"), 1); // 2·(101-100.5)
});

test("price impact = effective − realized", () => {
  const eff = effectiveSpread(101, 100, "buy");
  const rea = realizedSpread(101, 100.5, "buy");
  close(priceImpact(100, 100.5, "buy"), eff - rea);
  close(priceImpact(100, 100.5, "buy"), 1);
});

test("Kyle's lambda recovers a linear impact slope", () => {
  // priceChange = 0.5 · signedVolume exactly
  const obs = [
    { signedVolume: 2, priceChange: 1 },
    { signedVolume: -2, priceChange: -1 },
    { signedVolume: 4, priceChange: 2 },
    { signedVolume: -4, priceChange: -2 },
  ];
  close(kyleLambda(obs), 0.5);
});

test("Kyle's lambda is 0 for degenerate input", () => {
  assert.equal(kyleLambda([{ signedVolume: 1, priceChange: 1 }]), 0);
  assert.equal(kyleLambda([]), 0);
});

test("Roll's estimator recovers a bid-ask bounce spread", () => {
  // price bounces 100/101 → ΔP alternates +1/−1, autocov = −1 → spread 2
  close(rollSpread([100, 101, 100, 101, 100]), 2);
});

test("Roll's estimator is 0 for a trending (non-negative autocov) series", () => {
  assert.equal(rollSpread([100, 101, 102, 103, 104]), 0);
});
