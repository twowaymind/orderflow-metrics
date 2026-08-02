/**
 * Realized volatility from a return series.
 *
 * Returns are period returns (e.g. log returns between consecutive prints or
 * bars). Realized variance is the sum of squared returns; realized volatility
 * is its square root. Annualized volatility scales the per-period variance by
 * the number of periods in a year (zero-mean convention, standard for
 * high-frequency returns).
 */

/** Realized variance: Σ rᵢ². */
export function realizedVariance(returns: readonly number[]): number {
  let sum = 0;
  for (const r of returns) sum += r * r;
  return sum;
}

/** Realized volatility over the sample: √(Σ rᵢ²). */
export function realizedVolatility(returns: readonly number[]): number {
  return Math.sqrt(realizedVariance(returns));
}

/**
 * Annualized volatility: √( mean(rᵢ²) · periodsPerYear ).
 *
 * ``periodsPerYear`` is how many return periods make up a year (e.g. 252 for
 * daily, 252·390 for 1-minute equity bars). Returns 0 for an empty series.
 */
export function annualizedVolatility(
  returns: readonly number[],
  periodsPerYear: number,
): number {
  const n = returns.length;
  if (n === 0) return 0;
  return Math.sqrt((realizedVariance(returns) / n) * periodsPerYear);
}
