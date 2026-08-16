/**
 * Hurst exponent via rescaled-range (R/S) analysis.
 *
 * The Hurst exponent H characterises the long-memory of a series:
 *   - H ≈ 0.5 — no memory (white noise; the increments of a random walk)
 *   - H > 0.5 — persistent / trending (moves tend to continue)
 *   - H < 0.5 — anti-persistent / mean-reverting (moves tend to reverse)
 *
 * It is estimated from the classic rescaled range: over windows of growing
 * size n, the average R/S statistic scales like n^H, so H is the slope of
 * log(R/S) against log(n). A companion to the market-efficiency metrics
 * (autocorrelation, variance ratio).
 *
 * Feed it a roughly stationary series — typically returns, not raw prices.
 * Returns NaN when the series is too short to form at least two window scales
 * (with the default minimum window, that means fewer than ~32 points).
 */

export interface HurstOptions {
  /** Smallest window size for the R/S regression (default 8). */
  minWindow?: number;
}

export function hurstExponent(
  series: readonly number[],
  opts: HurstOptions = {},
): number {
  const minWindow = opts.minWindow ?? 8;
  const N = series.length;
  const scales: number[] = [];
  const rsMeans: number[] = [];

  for (let n = minWindow; n <= Math.floor(N / 2); n *= 2) {
    const k = Math.floor(N / n);
    const rsVals: number[] = [];
    for (let j = 0; j < k; j++) {
      const start = j * n;
      let mean = 0;
      for (let i = 0; i < n; i++) mean += series[start + i];
      mean /= n;
      let cum = 0;
      let min = Infinity;
      let max = -Infinity;
      let sumSq = 0;
      for (let i = 0; i < n; i++) {
        const d = series[start + i] - mean;
        cum += d;
        if (cum < min) min = cum;
        if (cum > max) max = cum;
        sumSq += d * d;
      }
      const range = max - min;
      const stdev = Math.sqrt(sumSq / n);
      if (stdev > 0) rsVals.push(range / stdev);
    }
    if (rsVals.length > 0) {
      scales.push(n);
      rsMeans.push(rsVals.reduce((a, b) => a + b, 0) / rsVals.length);
    }
  }

  if (scales.length < 2) return NaN;

  // Hurst exponent = slope of log(R/S) vs log(n).
  const xs = scales.map((s) => Math.log(s));
  const ys = rsMeans.map((r) => Math.log(r));
  const m = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / m;
  const my = ys.reduce((a, b) => a + b, 0) / m;
  let num = 0;
  let den = 0;
  for (let i = 0; i < m; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return num / den;
}
