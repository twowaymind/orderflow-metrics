import { test } from "node:test";
import assert from "node:assert/strict";
import {
  almgrenChrissCost,
  averageMarkout,
  linearPermanentImpact,
  linearTemporaryImpact,
  markout,
  squareRootImpact,
} from "../src/impact.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

test("square-root law scales with sqrt(Q/V)", () => {
  close(squareRootImpact(0.1, 100, 100), 0.1); // sqrt(1) = 1
  close(squareRootImpact(0.02, 1000, 1_000_000), 0.02 * Math.sqrt(0.001));
  close(squareRootImpact(0.1, 100, 100, 0.5), 0.05); // coefficient
  assert.equal(squareRootImpact(0.1, 100, 0), 0); // no volume
  assert.equal(squareRootImpact(0.1, 0, 100), 0); // no size
});

test("linear impact components", () => {
  close(linearPermanentImpact(0.5, 10), 5);
  close(linearTemporaryImpact(0.1, 20), 2);
});

test("Almgren-Chriss TWAP cost splits permanent and temporary", () => {
  const c = almgrenChrissCost(10, 5, 0.1, 0.2);
  close(c.permanent, 10); // 0.5 * 0.2 * 100
  close(c.temporary, 2); // 0.1 * 100 / 5
  close(c.total, 12);
  assert.throws(() => almgrenChrissCost(10, 0, 0.1, 0.2)); // non-positive duration
});

test("markouts are signed by trade direction", () => {
  close(markout("buy", 100, 100.5), 0.5); // price up after a buy -> informed
  close(markout("sell", 100, 99.5), 0.5); // price down after a sell -> informed
  close(markout("buy", 100, 99.5), -0.5); // faded
  close(
    averageMarkout([
      { side: "buy", midAtTrade: 100, midAfter: 100.5 },
      { side: "sell", midAtTrade: 100, midAfter: 99.5 },
    ]),
    0.5,
  );
  assert.equal(averageMarkout([]), 0);
});
