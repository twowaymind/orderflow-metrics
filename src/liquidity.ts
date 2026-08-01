/**
 * Liquidity measures.
 */

export interface ReturnVolume {
  /** period return (e.g. close-to-close), as a fraction */
  ret: number;
  /** traded volume (or dollar volume) over the same period */
  volume: number;
}

/**
 * Amihud (2002) illiquidity: the average of |return| / volume across periods.
 *
 * It captures how much price moves per unit of volume — a high value means
 * even small trades push the price a lot (thin, illiquid). Periods with zero
 * volume are skipped. Returns 0 when there is no usable data.
 */
export function amihudIlliquidity(obs: readonly ReturnVolume[]): number {
  let sum = 0;
  let n = 0;
  for (const o of obs) {
    if (o.volume > 0) {
      sum += Math.abs(o.ret) / o.volume;
      n += 1;
    }
  }
  return n === 0 ? 0 : sum / n;
}
