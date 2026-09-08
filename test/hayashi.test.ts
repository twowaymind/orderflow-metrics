import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hayashiYoshidaCovariance,
  hayashiYoshidaCorrelation,
  type TimedPrice,
} from "../src/hayashi.ts";
import { realizedCovariance } from "../src/covariance.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// Non-synchronous series (different timestamps).
const X: TimedPrice[] = [
  { time: 0, price: 100.0 },
  { time: 1, price: 100.5 },
  { time: 3, price: 100.2 },
  { time: 4, price: 100.4 },
];
const Y: TimedPrice[] = [
  { time: 0, price: 50.0 },
  { time: 2, price: 50.2 },
  { time: 3, price: 50.1 },
  { time: 5, price: 50.4 },
];

test("Hayashi-Yoshida covariance over overlapping intervals", () => {
  // overlaps: X(0,1]·Y(0,2]=+0.1, X(1,3]·Y(0,2]=−0.06, X(1,3]·Y(2,3]=+0.03,
  //           X(3,4]·Y(3,5]=+0.06 → 0.13
  close(hayashiYoshidaCovariance(X, Y), 0.13);
});

test("Hayashi-Yoshida correlation", () => {
  close(hayashiYoshidaCorrelation(X, Y), 0.5636214801906857);
});

test("touching intervals do not overlap (half-open)", () => {
  // X interval (1,3] and Y interval (3,5] share only the point 3 → excluded.
  // Build a case where the ONLY possible contribution would be a touching pair.
  const a: TimedPrice[] = [
    { time: 0, price: 10 },
    { time: 3, price: 11 },
  ]; // one interval (0,3], ret +1
  const b: TimedPrice[] = [
    { time: 3, price: 20 },
    { time: 6, price: 25 },
  ]; // one interval (3,6], ret +5
  close(hayashiYoshidaCovariance(a, b), 0); // (0,3] and (3,6] only touch at 3
});

test("collapses to realized covariance on a shared grid", () => {
  const a: TimedPrice[] = [
    { time: 0, price: 10.0 },
    { time: 1, price: 10.2 },
    { time: 2, price: 9.9 },
    { time: 3, price: 10.1 },
  ];
  const b: TimedPrice[] = [
    { time: 0, price: 20.0 },
    { time: 1, price: 20.1 },
    { time: 2, price: 20.3 },
    { time: 3, price: 20.0 },
  ];
  const returnsA = [0.2, -0.3, 0.2];
  const returnsB = [0.1, 0.2, -0.3];
  close(hayashiYoshidaCovariance(a, b), realizedCovariance(returnsA, returnsB));
});

test("symmetry: HY(x,y) = HY(y,x)", () => {
  close(hayashiYoshidaCovariance(X, Y), hayashiYoshidaCovariance(Y, X));
});

test("self-covariance equals realized variance on own grid", () => {
  // HY(X, X): every X interval overlaps only itself → Σ ΔXᵢ²
  close(hayashiYoshidaCovariance(X, X), 0.5 * 0.5 + 0.3 * 0.3 + 0.2 * 0.2);
  close(hayashiYoshidaCorrelation(X, X), 1);
});

test("edge cases", () => {
  close(hayashiYoshidaCovariance([], []), 0);
  close(hayashiYoshidaCovariance([{ time: 0, price: 1 }], Y), 0); // <2 obs → no intervals
  assert.ok(Number.isNaN(hayashiYoshidaCorrelation([], [])));
  // a flat series has zero variance → correlation undefined
  const flat: TimedPrice[] = [
    { time: 0, price: 5 },
    { time: 1, price: 5 },
  ];
  assert.ok(Number.isNaN(hayashiYoshidaCorrelation(flat, Y)));
});
