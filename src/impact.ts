/**
 * Market-impact models and trade markouts.
 *
 * Two pre-trade cost models — the empirical square-root law and the linear
 * Almgren-Chriss temporary/permanent decomposition — plus post-trade markouts,
 * the realized adverse-selection drift after a fill. Together they cover the
 * "what will it cost / what did it cost" pair around execution.
 *
 * Sign convention for markouts: buys are +1, sells are -1.
 */
import type { Side } from "./types.ts";

function dir(side: Side): 1 | -1 {
  return side === "buy" ? 1 : -1;
}

/**
 * Square-root law of market impact: `coefficient * sigma * sqrt(Q / V)`.
 *
 * The widely-observed empirical scaling of impact with participation: cost
 * grows with volatility `sigma` and the square root of the order size `Q`
 * relative to market volume `V`. `coefficient` (Y, typically ~0.5-1) absorbs
 * the asset/venue-specific constant. Returns a dimensionless cost fraction, or
 * 0 for non-positive volume or size.
 */
export function squareRootImpact(
  sigma: number,
  orderSize: number,
  marketVolume: number,
  coefficient = 1,
): number {
  if (!(marketVolume > 0) || orderSize <= 0) return 0;
  return coefficient * sigma * Math.sqrt(orderSize / marketVolume);
}

/** Linear permanent impact: the lasting price shift `gamma * quantity`. */
export function linearPermanentImpact(gamma: number, quantity: number): number {
  return gamma * quantity;
}

/** Linear temporary impact at trading rate `rate`: `eta * rate`. */
export function linearTemporaryImpact(eta: number, rate: number): number {
  return eta * rate;
}

/** Expected impact cost of a schedule, split into its two components. */
export interface ImpactCost {
  permanent: number;
  temporary: number;
  total: number;
}

/**
 * Almgren-Chriss expected impact cost of a uniform (TWAP) liquidation of
 * `quantity` over `duration`, under linear temporary (`eta`) and permanent
 * (`gamma`) impact:
 *
 *   permanent = 0.5 * gamma * Q^2      (paid on average over the trade)
 *   temporary = eta * Q^2 / T          (uniform rate Q/T over T)
 *
 * `duration` must be positive.
 */
export function almgrenChrissCost(
  quantity: number,
  duration: number,
  eta: number,
  gamma: number,
): ImpactCost {
  if (!(duration > 0)) throw new Error("duration must be positive");
  const permanent = 0.5 * gamma * quantity * quantity;
  const temporary = (eta * quantity * quantity) / duration;
  return { permanent, temporary, total: permanent + temporary };
}

/**
 * Signed post-trade markout: `d * (midAfter - midAtTrade)`.
 *
 * How far the mid moved in the aggressor's favour over some horizon after the
 * fill. Positive = the trade "looked informed" (price kept going its way);
 * negative = it faded. This is the liquidity taker's realized edge and the
 * provider's adverse selection, with the sign flipped.
 */
export function markout(side: Side, midAtTrade: number, midAfter: number): number {
  return dir(side) * (midAfter - midAtTrade);
}

export interface MarkoutObservation {
  side: Side;
  midAtTrade: number;
  midAfter: number;
}

/** Average markout across observations (0 for an empty set). */
export function averageMarkout(obs: readonly MarkoutObservation[]): number {
  if (obs.length === 0) return 0;
  let s = 0;
  for (const o of obs) s += markout(o.side, o.midAtTrade, o.midAfter);
  return s / obs.length;
}
