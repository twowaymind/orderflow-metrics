/**
 * Core input types for order-flow metrics.
 *
 * Prices and sizes are plain numbers; timestamps (if provided) are opaque to
 * this library — pass whatever epoch unit your feed uses, we never compare
 * across records.
 */

export type Side = "buy" | "sell";

/** Top-of-book (level-1) snapshot. */
export interface L1Quote {
  ts?: number;
  bidPrice: number;
  bidSize: number;
  askPrice: number;
  askSize: number;
}

/** A single executed trade. */
export interface Trade {
  ts?: number;
  price: number;
  size: number;
  side: Side;
}
