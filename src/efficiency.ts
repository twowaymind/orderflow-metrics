/**
 * Market-efficiency diagnostics on a return series.
 *
 * Autocorrelation and the Lo-MacKinlay variance ratio tell you whether a
 * series behaves like a random walk, mean-reverts, or trends — the kind of
 * structure execution and market-making models care about.
 */

/**
 * Lag-`lag` autocorrelation of a return series (biased estimator, denominator
 * is the full-sample variance). Range roughly [-1, 1]. 0 for degenerate input.
 */
export function autocorrelation(returns: readonly number[], lag: number): number {
  const n = returns.length;
  if (lag < 1 || n <= lag) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / n;
  let den = 0;
  for (const r of returns) den += (r - mean) * (r - mean);
  if (den === 0) return 0;

  let num = 0;
  for (let t = lag; t < n; t++) {
    num += (returns[t] - mean) * (returns[t - lag] - mean);
  }
  return num / den;
}

/**
 * Variance ratio VR(q) = Var(q-period return) / (q · Var(1-period return))
 * over overlapping q-period returns (Lo & MacKinlay, 1988).
 *
 *   VR ≈ 1  random walk
 *   VR < 1  mean-reverting
 *   VR > 1  trending / positively autocorrelated
 *
 * Returns 1 for degenerate input (q ≥ length, or zero one-period variance).
 */
export function varianceRatio(returns: readonly number[], q: number): number {
  const n = returns.length;
  if (q < 1 || n < q) return 1;

  const mean = returns.reduce((a, b) => a + b, 0) / n;
  let var1 = 0;
  for (const r of returns) var1 += (r - mean) * (r - mean);
  var1 /= n;
  if (var1 === 0) return 1;

  const qSums: number[] = [];
  for (let j = 0; j + q <= n; j++) {
    let s = 0;
    for (let i = j; i < j + q; i++) s += returns[i];
    qSums.push(s);
  }

  const meanQ = qSums.reduce((a, b) => a + b, 0) / qSums.length;
  let varQ = 0;
  for (const s of qSums) varQ += (s - meanQ) * (s - meanQ);
  varQ /= qSums.length;

  return varQ / (q * var1);
}
