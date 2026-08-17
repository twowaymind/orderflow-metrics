/**
 * Realized higher moments from an intraday return series.
 *
 * Following Amaya, Christoffersen, Jacobs & Vasquez (2015), the realized
 * skewness and kurtosis of a set of high-frequency returns summarise the shape
 * of the intraday return distribution — asymmetry and tail heaviness — beyond
 * what realized variance (see `volatility`) captures. Realized skewness in
 * particular has been shown to predict the cross-section of subsequent returns.
 *
 * With N returns r and realized variance RV = Σ r²:
 *   realized skewness = √N · Σ r³ / RV^(3/2)
 *   realized kurtosis = N · Σ r⁴ / RV²
 * The √N and N scalings make the estimates comparable across sampling
 * frequencies. Both return 0 for an empty series or one with no variation.
 */

/** Realized skewness: √N · Σ r³ / (Σ r²)^(3/2). */
export function realizedSkewness(returns: readonly number[]): number {
  const n = returns.length;
  if (n === 0) return 0;
  let s2 = 0;
  let s3 = 0;
  for (const r of returns) {
    const r2 = r * r;
    s2 += r2;
    s3 += r2 * r;
  }
  if (s2 === 0) return 0;
  return (Math.sqrt(n) * s3) / Math.pow(s2, 1.5);
}

/** Realized kurtosis: N · Σ r⁴ / (Σ r²)². */
export function realizedKurtosis(returns: readonly number[]): number {
  const n = returns.length;
  if (n === 0) return 0;
  let s2 = 0;
  let s4 = 0;
  for (const r of returns) {
    const r2 = r * r;
    s2 += r2;
    s4 += r2 * r2;
  }
  if (s2 === 0) return 0;
  return (n * s4) / (s2 * s2);
}
