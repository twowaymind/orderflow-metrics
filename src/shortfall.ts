/**
 * Implementation shortfall and arrival slippage.
 *
 * Perold's (1988) "implementation shortfall" measures the all-in cost of turning
 * a paper decision into real fills. It splits into the cost paid on the shares
 * you actually executed (vs the price when you decided), the opportunity cost of
 * the shares you failed to execute as the price drifted away, and fees. Arrival
 * slippage is the simpler, per-order version against the arrival mid.
 *
 * Sign convention: buys are +1, sells are -1. All costs are returned as
 * *positive = worse* (a shortfall), in the input price/quantity units.
 */
import type { Side } from "./types.ts";

function dir(side: Side): 1 | -1 {
  return side === "buy" ? 1 : -1;
}

export interface ShortfallResult {
  /** Cost on executed shares vs the decision price. */
  execution: number;
  /** Opportunity cost of unexecuted shares as the price drifted. */
  opportunity: number;
  /** Explicit fees / commissions. */
  fees: number;
  /** execution + opportunity + fees. Positive = shortfall (cost). */
  total: number;
}

/**
 * Implementation shortfall of an order, decomposed into execution cost,
 * opportunity cost, and fees.
 *
 * @param decisionPrice  price when the trade was decided (the paper benchmark)
 * @param avgExecPrice   volume-weighted average price actually paid/received
 * @param executedQty    shares actually filled
 * @param targetQty      shares originally intended
 * @param finalPrice     price at the end of trading (for the unfilled remainder)
 * @param fees           explicit costs (default 0)
 */
export function implementationShortfall(
  side: Side,
  decisionPrice: number,
  avgExecPrice: number,
  executedQty: number,
  targetQty: number,
  finalPrice: number,
  fees = 0,
): ShortfallResult {
  const d = dir(side);
  const execution = d * (avgExecPrice - decisionPrice) * executedQty;
  const unexecuted = Math.max(0, targetQty - executedQty);
  const opportunity = d * (finalPrice - decisionPrice) * unexecuted;
  return { execution, opportunity, fees, total: execution + opportunity + fees };
}

/**
 * Arrival slippage in basis points: signed cost of the average execution price
 * against the arrival price. Positive = adverse (paid up on a buy / sold low on
 * a sell). Returns 0 when the arrival price is 0.
 */
export function arrivalSlippageBps(
  side: Side,
  arrivalPrice: number,
  avgExecPrice: number,
): number {
  if (arrivalPrice === 0) return 0;
  return ((dir(side) * (avgExecPrice - arrivalPrice)) / arrivalPrice) * 10_000;
}
