/**
 * Execution-quality metrics — how good a fill was relative to the quote it
 * traded against.
 *
 * Where `execution.ts` measures the *effective* and *realized* spread and the
 * price impact of a trade, these functions measure the trade against the
 * standing quote: the quoted spread it faced, the price improvement it captured
 * inside that quote, and the effective-to-quoted ratio — the workhorse
 * execution-quality statistic (SEC Rule 605; Bessembinder 2003). A trade that
 * fills inside the quoted spread has an E/Q ratio below 1 and positive price
 * improvement; one that walks the book fills outside it.
 *
 * Prices are in the instrument's own units; the caller decides whether to work
 * in absolute terms or normalise to basis points of the mid.
 */

import type { Side } from "./types.ts";

/** Quoted spread: the width of the market, `ask − bid`. */
export function quotedSpread(bid: number, ask: number): number {
  return ask - bid;
}

/** Quoted half-spread: `(ask − bid) / 2`, the distance from mid to each quote. */
export function quotedHalfSpread(bid: number, ask: number): number {
  return (ask - bid) / 2;
}

/**
 * Price improvement: how much better than the standing quote a trade filled,
 * in price units. A buyer expects to pay the ask, so improvement is `ask −
 * price`; a seller expects to receive the bid, so improvement is `price − bid`.
 * Positive means the fill beat the quote (executed inside the spread); zero is
 * a fill exactly at the quote; negative means it filled worse than the quote
 * (e.g. a large order walking the book).
 */
export function priceImprovement(
  price: number,
  bid: number,
  ask: number,
  side: Side,
): number {
  return side === "buy" ? ask - price : price - bid;
}

/**
 * Effective-to-quoted spread ratio: `effectiveSpread / quotedSpread`. Below 1
 * means trades executed inside the quoted spread (price improvement); at 1 they
 * paid the full quoted spread; above 1 they filled outside it. Pair with
 * `effectiveSpread` / `quotedSpread`. Returns 0 for a non-positive quoted
 * spread (crossed or locked market — undefined ratio).
 */
export function effectiveToQuotedRatio(
  effectiveSpread: number,
  quotedSpread: number,
): number {
  return quotedSpread <= 0 ? 0 : effectiveSpread / quotedSpread;
}
