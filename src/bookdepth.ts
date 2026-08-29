/**
 * Book-depth liquidity metrics — reading liquidity straight off a limit-order
 * book snapshot.
 *
 * Where `amihudIlliquidity` (see `liquidity.ts`) measures liquidity from
 * realized price impact over time, these functions measure it from the *shape*
 * of the resting book at a single instant: how much size is quoted near the
 * touch, how steeply depth thickens away from mid, and what a round trip would
 * actually cost. They complement `simulateMarketOrder` (which walks the book
 * for one execution): these are summary statistics of the standing book, not a
 * fill simulation.
 *
 * Every function takes plain `Level[]` arrays sorted best-first — bids by
 * descending price, asks by ascending price — exactly as `OrderBook.depth()`
 * returns them.
 */

import type { Level } from "./orderbook.ts";

/** Resting size available within a price band around the mid. */
export interface DepthWithin {
  /** total bid size within the band */
  bidDepth: number;
  /** total ask size within the band */
  askDepth: number;
  /** bidDepth + askDepth */
  total: number;
}

function mid(bids: readonly Level[], asks: readonly Level[]): number | null {
  if (bids.length === 0 || asks.length === 0) return null;
  return (bids[0].price + asks[0].price) / 2;
}

/**
 * Total resting size within `±bps` of the mid price, split by side.
 *
 * A snapshot of near-touch liquidity: how much can trade close to the current
 * price before walking into deeper, worse-priced levels. The band half-width is
 * `mid · bps / 10_000`, applied symmetrically. Levels must be sorted best-first.
 * Returns zeros if either side is empty (no mid) or `bps <= 0`.
 */
export function depthWithin(
  bids: readonly Level[],
  asks: readonly Level[],
  bps: number,
): DepthWithin {
  const m = mid(bids, asks);
  if (m === null || bps <= 0) return { bidDepth: 0, askDepth: 0, total: 0 };
  const band = (m * bps) / 10_000;
  const lo = m - band;
  const hi = m + band;
  let bidDepth = 0;
  for (const l of bids) if (l.price >= lo) bidDepth += l.size;
  let askDepth = 0;
  for (const l of asks) if (l.price <= hi) askDepth += l.size;
  return { bidDepth, askDepth, total: bidDepth + askDepth };
}

/**
 * Order-book slope: cumulative resting size divided by the relative price
 * distance from `refPrice` to the outermost supplied level.
 *
 *   slope = (Σ size) / ( |P_last − refPrice| / refPrice )
 *
 * It answers "how much size is packed per unit of relative price move" — a
 * steeper (larger) slope means depth builds up quickly near the reference
 * price, i.e. a thicker, more liquid book. Pass one side's levels (best-first)
 * and a reference price (typically the mid). Returns 0 for empty input, a
 * non-positive `refPrice`, or when the outermost level sits at the reference
 * price (zero distance).
 */
export function orderBookSlope(
  levels: readonly Level[],
  refPrice: number,
): number {
  if (levels.length === 0 || refPrice <= 0) return 0;
  let cum = 0;
  for (const l of levels) cum += l.size;
  const dist = Math.abs(levels[levels.length - 1].price - refPrice) / refPrice;
  if (dist === 0) return 0;
  return cum / dist;
}

/** The cost of buying then selling the same size against the standing book. */
export interface RoundTripCost {
  /** size-weighted average price paid buying `size` from the asks */
  avgBuyPrice: number;
  /** size-weighted average price received selling `size` into the bids */
  avgSellPrice: number;
  /** round-trip cost in basis points of mid: (avgBuy − avgSell) / mid · 10⁴ */
  roundTripBps: number;
  /** size actually round-tripped (min of the fill each side supports) */
  filledSize: number;
}

function vwapFill(
  levels: readonly Level[],
  size: number,
): { notional: number; filled: number } {
  let remaining = size;
  let notional = 0;
  let filled = 0;
  for (const l of levels) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, l.size);
    notional += take * l.price;
    filled += take;
    remaining -= take;
  }
  return { notional, filled };
}

/**
 * Round-trip liquidity cost: the basis-point gap between the VWAP of buying
 * `size` from the asks and the VWAP of selling `size` into the bids, measured
 * against the mid. This is the immediate "liquidity tax" of entering and
 * exiting a position of `size` — spread plus the price impact of walking both
 * sides of the book.
 *
 * Levels must be sorted best-first. `filledSize` is the smaller of the two
 * sides' fills, so a book too thin on one side reports how much actually
 * round-tripped. Returns zeros if either side is empty or `size <= 0`.
 */
export function costOfRoundTrip(
  bids: readonly Level[],
  asks: readonly Level[],
  size: number,
): RoundTripCost {
  const m = mid(bids, asks);
  const zero: RoundTripCost = {
    avgBuyPrice: 0,
    avgSellPrice: 0,
    roundTripBps: 0,
    filledSize: 0,
  };
  if (m === null || size <= 0) return zero;
  const buy = vwapFill(asks, size);
  const sell = vwapFill(bids, size);
  if (buy.filled === 0 || sell.filled === 0) return zero;
  const avgBuyPrice = buy.notional / buy.filled;
  const avgSellPrice = sell.notional / sell.filled;
  return {
    avgBuyPrice,
    avgSellPrice,
    roundTripBps: ((avgBuyPrice - avgSellPrice) / m) * 10_000,
    filledSize: Math.min(buy.filled, sell.filled),
  };
}
