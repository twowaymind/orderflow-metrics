/**
 * Execution-cost and price-impact metrics.
 *
 * Standard transaction-cost analysis (TCA) building blocks:
 *   - effective spread  — realized cost against the quote midpoint
 *   - realized spread   — liquidity-provider revenue (post-trade reversion)
 *   - price impact      — permanent component (effective − realized)
 *   - Kyle's lambda      — price impact per unit of signed order flow
 *   - Roll's estimator   — effective spread implied by price-change autocovariance
 *
 * Sign convention: buys are +1, sells are −1. All spread measures are in the
 * same price units as the inputs.
 */
import type { Side } from "./types.ts";

function dir(side: Side): 1 | -1 {
  return side === "buy" ? 1 : -1;
}

/** Effective half-spread: d·(price − mid). */
export function effectiveHalfSpread(
  price: number,
  mid: number,
  side: Side,
): number {
  return dir(side) * (price - mid);
}

/** Effective (full) spread: 2·d·(price − mid). */
export function effectiveSpread(price: number, mid: number, side: Side): number {
  return 2 * effectiveHalfSpread(price, mid, side);
}

/** Realized (full) spread using the mid observed Δ later: 2·d·(price − midAfter). */
export function realizedSpread(
  price: number,
  midAfter: number,
  side: Side,
): number {
  return 2 * dir(side) * (price - midAfter);
}

/** Permanent price impact: 2·d·(midAfter − mid) = effectiveSpread − realizedSpread. */
export function priceImpact(mid: number, midAfter: number, side: Side): number {
  return 2 * dir(side) * (midAfter - mid);
}

export interface FlowObservation {
  /** mid-price change over the interval */
  priceChange: number;
  /** signed traded volume (positive = net buy) */
  signedVolume: number;
}

/**
 * Kyle's lambda — OLS slope of price change on signed order flow
 * (ΔP = λ · signedVolume + ε). Returns 0 for degenerate input.
 */
export function kyleLambda(obs: FlowObservation[]): number {
  const n = obs.length;
  if (n < 2) return 0;

  let mx = 0;
  let my = 0;
  for (const o of obs) {
    mx += o.signedVolume;
    my += o.priceChange;
  }
  mx /= n;
  my /= n;

  let cov = 0;
  let varx = 0;
  for (const o of obs) {
    const dx = o.signedVolume - mx;
    cov += dx * (o.priceChange - my);
    varx += dx * dx;
  }
  return varx === 0 ? 0 : cov / varx;
}

/**
 * Roll's (1984) implied effective spread from a series of trade prices:
 * 2·√(−cov(ΔP_t, ΔP_{t-1})). Returns 0 when the autocovariance is
 * non-negative (the estimator is undefined there).
 */
export function rollSpread(prices: number[]): number {
  if (prices.length < 3) return 0;

  const dp: number[] = [];
  for (let i = 1; i < prices.length; i++) dp.push(prices[i] - prices[i - 1]);

  const n = dp.length;
  const mean = dp.reduce((a, b) => a + b, 0) / n;
  let cov = 0;
  for (let i = 1; i < n; i++) cov += (dp[i] - mean) * (dp[i - 1] - mean);
  cov /= n - 1;

  return cov < 0 ? 2 * Math.sqrt(-cov) : 0;
}
