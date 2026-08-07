/**
 * Market-order simulation against a reconstructed order book.
 *
 * Sweep the book with a market order and see what you'd actually get: the
 * volume-weighted fill price, slippage vs the starting mid, and any size the
 * book was too thin to fill. Read-only — the book is not mutated.
 */
import { OrderBook } from "./orderbook.ts";

export interface Fill {
  price: number;
  size: number;
}

export interface MarketOrderResult {
  filledSize: number;
  remainingSize: number;
  /** volume-weighted average fill price, or null if nothing filled */
  avgPrice: number | null;
  notional: number;
  /** cost vs the mid at start, in basis points (positive = adverse); null if unknown */
  slippageBps: number | null;
  fills: Fill[];
}

/**
 * Simulate a market order. A ``buy`` consumes asks from best (lowest) upward;
 * a ``sell`` consumes bids from best (highest) downward. Stops when filled or
 * the book runs out (``remainingSize`` > 0).
 */
export function simulateMarketOrder(
  book: OrderBook,
  side: "buy" | "sell",
  size: number,
): MarketOrderResult {
  const startMid = book.mid();
  const levels = book.depth(side === "buy" ? "ask" : "bid", Number.MAX_SAFE_INTEGER);

  const fills: Fill[] = [];
  let remaining = size;
  let notional = 0;

  for (const level of levels) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, level.size);
    fills.push({ price: level.price, size: take });
    notional += level.price * take;
    remaining -= take;
  }

  const filled = size - remaining;
  const avgPrice = filled > 0 ? notional / filled : null;

  let slippageBps: number | null = null;
  if (avgPrice !== null && startMid !== null && startMid !== 0) {
    const raw = side === "buy" ? avgPrice - startMid : startMid - avgPrice;
    slippageBps = (raw / startMid) * 10_000;
  }

  return {
    filledSize: filled,
    remainingSize: remaining,
    avgPrice,
    notional,
    slippageBps,
    fills,
  };
}
