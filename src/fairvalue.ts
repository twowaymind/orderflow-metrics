/**
 * Fair-value and quoting helpers derived from the top of book.
 */
import type { L1Quote } from "./types.ts";

/**
 * Imbalance-weighted mid price (a simple micro-price).
 *
 *   weightedMid = bid · askSize/(bidSize+askSize) + ask · bidSize/(bidSize+askSize)
 *
 * Each side is weighted by the *opposite* size, so heavy resting bid size
 * pulls the estimate toward the ask (upward pressure), and vice versa. Falls
 * back to the arithmetic mid when both sizes are zero.
 */
export function weightedMid(q: L1Quote): number {
  const total = q.bidSize + q.askSize;
  if (total === 0) return (q.bidPrice + q.askPrice) / 2;
  return (
    q.bidPrice * (q.askSize / total) + q.askPrice * (q.bidSize / total)
  );
}

/** Arithmetic mid price: (bid + ask) / 2. */
export function mid(q: L1Quote): number {
  return (q.bidPrice + q.askPrice) / 2;
}

/** Quoted spread in basis points: (ask − bid) / mid · 10_000. */
export function relativeSpreadBps(q: L1Quote): number {
  const m = mid(q);
  if (m === 0) return 0;
  return ((q.askPrice - q.bidPrice) / m) * 10_000;
}
