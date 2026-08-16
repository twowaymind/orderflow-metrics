import { test } from "node:test";
import assert from "node:assert/strict";
import { hurstExponent } from "../src/hurst.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// Bit-identical MINSTD LCG series (integer math stays < 2^53, so JS and Python
// produce the exact same doubles).
function minstd(n: number): number[] {
  let x = 1;
  const s: number[] = [];
  for (let i = 0; i < n; i++) {
    x = (48271 * x) % 2147483647;
    s.push(x / 2147483647);
  }
  return s;
}

test("Hurst of a white-noise-like series (regression value)", () => {
  close(hurstExponent(minstd(128)), 0.638944060791);
});

test("noise sits near 0.5; a persistent series is higher", () => {
  const noise = minstd(128);
  const h = hurstExponent(noise);
  assert.ok(h > 0.3 && h < 0.7, `noise H=${h}`);
  let c = 0;
  const walk = noise.map((v) => {
    c += v - 0.5;
    return c;
  });
  assert.ok(hurstExponent(walk) > h, "persistent series should have higher H");
});

test("too-short series returns NaN", () => {
  assert.ok(Number.isNaN(hurstExponent([1, 2, 3, 4, 5, 6, 7, 8]))); // only one scale
  assert.ok(Number.isNaN(hurstExponent([])));
});
