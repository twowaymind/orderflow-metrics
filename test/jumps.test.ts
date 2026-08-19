import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bipowerVariation,
  jumpVariation,
  relativeJumpVariation,
} from "../src/jumps.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// A quiet series with one large jump (the 0.05 return).
const withJump = [0.001, -0.0015, 0.002, -0.001, 0.0012, 0.05, -0.0008, 0.0011];

test("bipower variation (regression value)", () => {
  close(bipowerVariation(withJump), 0.000170557065);
});

test("jump variation isolates the jump", () => {
  close(jumpVariation(withJump), 0.002340982935);
});

test("relative jump is the jump share of RV, in [0,1]", () => {
  const rj = relativeJumpVariation(withJump);
  close(rj, 0.932090643524);
  assert.ok(rj >= 0 && rj <= 1);
});

test("a smooth (jumpless) series has zero jump variation", () => {
  const smooth = [0.001, -0.0012, 0.0011, -0.0009, 0.0013, -0.001, 0.0008, -0.0011];
  assert.equal(jumpVariation(smooth), 0);
  assert.equal(relativeJumpVariation(smooth), 0);
});

test("edge cases return 0", () => {
  assert.equal(bipowerVariation([]), 0);
  assert.equal(bipowerVariation([0.01]), 0);
  assert.equal(jumpVariation([0.01]), 0);
  assert.equal(relativeJumpVariation([0, 0, 0]), 0);
});
