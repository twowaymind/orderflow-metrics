import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parkinsonVolatility,
  garmanKlassVolatility,
  rogersSatchellVolatility,
  yangZhangVolatility,
  type Candle,
} from "../src/rangevol.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const candles: Candle[] = [
  { open: 100, high: 105, low: 99, close: 102 },
  { open: 102, high: 106, low: 101, close: 104 },
  { open: 104, high: 104, low: 98, close: 99 },
  { open: 99, high: 103, low: 97, close: 101 },
  { open: 101, high: 107, low: 100, close: 105 },
];

test("Parkinson volatility", () => {
  close(parkinsonVolatility(candles), 0.035537684906);
});

test("Garman-Klass volatility", () => {
  close(garmanKlassVolatility(candles), 0.036828671825);
});

test("Rogers-Satchell volatility", () => {
  close(rogersSatchellVolatility(candles), 0.03609558372);
});

test("Yang-Zhang volatility", () => {
  close(yangZhangVolatility(candles), 0.035129342404);
});

test("empty or insufficient input returns 0", () => {
  assert.equal(parkinsonVolatility([]), 0);
  assert.equal(garmanKlassVolatility([]), 0);
  assert.equal(rogersSatchellVolatility([]), 0);
  assert.equal(yangZhangVolatility([]), 0);
  assert.equal(yangZhangVolatility(candles.slice(0, 2)), 0); // needs >= 3 bars
});

test("flat candles imply zero range volatility", () => {
  const flat: Candle[] = [
    { open: 100, high: 100, low: 100, close: 100 },
    { open: 100, high: 100, low: 100, close: 100 },
    { open: 100, high: 100, low: 100, close: 100 },
  ];
  close(parkinsonVolatility(flat), 0);
  close(garmanKlassVolatility(flat), 0);
  close(rogersSatchellVolatility(flat), 0);
  close(yangZhangVolatility(flat), 0);
});
