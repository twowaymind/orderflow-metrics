/**
 * Adverse selection and markout profiles.
 *
 * A single markout (`markout` in `impact.ts`) asks "did the mid move against me
 * one horizon after the fill?". But toxicity has a *shape*: an informed fill
 * keeps drifting against the resting side for seconds, while a benign one snaps
 * back. The **markout profile** is that shape — the signed post-fill move at a
 * sequence of increasing horizons — the standard transaction-cost-analysis lens
 * on adverse selection. Averaged across many fills it is the markout curve every
 * market-making and execution desk plots.
 *
 * Sign convention matches `markout`: the value is measured from the *taker's*
 * side (buy → mid up is positive, sell → mid down is positive), so a positive
 * markout is the liquidity taker's realized edge and the liquidity provider's
 * adverse selection. To read it as provider toxicity, flip the sign.
 *
 * The `adverseSelectionScore` normalizes a markout by the half-spread, so the
 * post-fill move is expressed in units of the spread cushion the maker was paid:
 * a score above 1 means the price moved further than the half-spread — the fill
 * was toxic beyond what the spread compensated.
 */
import type { Side } from "./types.ts";

const dir = (side: Side): number => (side === "buy" ? 1 : -1);

/** One fill and the mids observed at each markout horizon after it. */
export interface MarkoutProfileObservation {
  side: Side;
  midAtTrade: number;
  /** mids at increasing horizons after the fill (e.g. +1s, +5s, +30s) */
  midsAfter: readonly number[];
}

/**
 * Markout profile of one fill: the signed post-fill mid move at each horizon,
 * `dir(side) · (midₕ − midAtTrade)`. Positive = the market moved the taker's
 * way (adverse selection for the provider). Returns an array the same length as
 * `midsAfter`.
 */
export function markoutProfile(
  side: Side,
  midAtTrade: number,
  midsAfter: readonly number[],
): number[] {
  const d = dir(side);
  return midsAfter.map((m) => d * (m - midAtTrade));
}

/**
 * Adverse-selection (toxicity) score: a markout normalized by the half-spread,
 * `dir(side)·(midAfter − midAtTrade) / (spread/2)`. The post-fill move in units
 * of the spread cushion — above 1 means the price moved further than the
 * half-spread, i.e. the fill was toxic beyond what the quoted spread paid for.
 * Returns 0 for a non-positive spread.
 */
export function adverseSelectionScore(
  side: Side,
  midAtTrade: number,
  midAfter: number,
  spread: number,
): number {
  if (spread <= 0) return 0;
  return (dir(side) * (midAfter - midAtTrade)) / (spread / 2);
}

/**
 * Average markout profile across many fills: the mean markout at each horizon,
 * the aggregate adverse-selection curve. Observations may have different-length
 * `midsAfter`; each horizon is averaged over the fills that reach it. Returns an
 * empty array for no observations.
 */
export function averageMarkoutProfile(
  observations: readonly MarkoutProfileObservation[],
): number[] {
  if (observations.length === 0) return [];
  let horizons = 0;
  for (const o of observations) horizons = Math.max(horizons, o.midsAfter.length);

  const out: number[] = [];
  for (let h = 0; h < horizons; h++) {
    let sum = 0;
    let count = 0;
    for (const o of observations) {
      if (h < o.midsAfter.length) {
        sum += dir(o.side) * (o.midsAfter[h] - o.midAtTrade);
        count++;
      }
    }
    out.push(count === 0 ? 0 : sum / count);
  }
  return out;
}
