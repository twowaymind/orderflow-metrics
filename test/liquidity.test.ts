import { test } from "node:test";
import assert from "node:assert/strict";
import { amihudIlliquidity } from "../src/liquidity.ts";

const close = (a: number, b: number, eps = 1e-12) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

test("Amihud averages |return| / volume", () => {
  // (|0.02|/100 + |−0.01|/50) / 2 = (0.0002 + 0.0002)/2 = 0.0002
  close(
    amihudIlliquidity([
      { ret: 0.02, volume: 100 },
      { ret: -0.01, volume: 50 },
    ]),
    0.0002,
  );
});

test("thinner market (less volume) is more illiquid", () => {
  const thin = amihudIlliquidity([{ ret: 0.01, volume: 10 }]);
  const deep = amihudIlliquidity([{ ret: 0.01, volume: 1000 }]);
  assert.ok(thin > deep);
});

test("zero-volume periods are skipped", () => {
  close(
    amihudIlliquidity([
      { ret: 0.05, volume: 0 },
      { ret: 0.02, volume: 100 },
    ]),
    0.0002,
  );
});

test("no usable data returns 0", () => {
  assert.equal(amihudIlliquidity([]), 0);
  assert.equal(amihudIlliquidity([{ ret: 0.1, volume: 0 }]), 0);
});
