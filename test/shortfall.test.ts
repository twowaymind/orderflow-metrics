import { test } from "node:test";
import assert from "node:assert/strict";
import { arrivalSlippageBps, implementationShortfall } from "../src/shortfall.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

test("implementation shortfall for a partially-filled buy", () => {
  // decided at 100, filled 800/1000 at 100.5, price ends at 101, fees 5
  const r = implementationShortfall("buy", 100, 100.5, 800, 1000, 101, 5);
  close(r.execution, 400); // (100.5 - 100) * 800
  close(r.opportunity, 200); // (101 - 100) * 200 unfilled
  close(r.fees, 5);
  close(r.total, 605);
});

test("implementation shortfall for a partially-filled sell", () => {
  const r = implementationShortfall("sell", 100, 99.5, 800, 1000, 99, 0);
  close(r.execution, 400); // (100 - 99.5) * 800
  close(r.opportunity, 200); // (100 - 99) * 200
  close(r.total, 600);
});

test("a fully-filled order has no opportunity cost", () => {
  const r = implementationShortfall("buy", 100, 100.2, 1000, 1000, 105, 0);
  close(r.opportunity, 0);
  close(r.total, r.execution);
});

test("arrival slippage in bps is signed by side", () => {
  close(arrivalSlippageBps("buy", 100, 100.5), 50); // paid up 50 bps
  close(arrivalSlippageBps("sell", 100, 99.5), 50); // sold low 50 bps
  close(arrivalSlippageBps("buy", 100, 99.5), -50); // price improvement
  assert.equal(arrivalSlippageBps("buy", 0, 100), 0);
});
