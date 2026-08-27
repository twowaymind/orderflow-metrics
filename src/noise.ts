/**
 * Microstructure-noise-aware realized variance.
 *
 * At the finest sampling frequency, realized variance is badly biased upward:
 * observed prices are the "true" price plus microstructure noise (bid-ask
 * bounce, discreteness, latency), and squaring tiny bounce returns pumps up the
 * sum. Sample more coarsely and the noise averages out — but you throw away
 * data. These tools let you see, quantify, and reduce that bias.
 *
 *   noiseVariance          — the variance of the noise itself, ≈ RV_finest / 2n
 *                            (Zhang, Mykland & Aït-Sahalia, 2005)
 *   sparseRealizedVariance — RV on a coarser grid, averaged over every offset
 *                            (subsampling), so no data is wasted
 *   volatilitySignature    — RV as a function of sampling step: the classic
 *                            "signature plot" whose blow-up at fine steps is the
 *                            visual fingerprint of microstructure noise
 *
 * Every function takes a series of (fine-grid) returns.
 */

/** Σ rᵢ² over the full, finest grid (local helper). */
function realizedVarAll(returns: readonly number[]): number {
  let s = 0;
  for (const r of returns) s += r * r;
  return s;
}

/**
 * Estimate the variance of the microstructure noise. Under the additive-noise
 * model the finest-grid realized variance is dominated by noise and converges
 * to 2n·(noise variance), so the noise variance is estimated as RV / (2n).
 * Returns 0 for an empty series.
 */
export function noiseVariance(returns: readonly number[]): number {
  const n = returns.length;
  if (n < 1) return 0;
  return realizedVarAll(returns) / (2 * n);
}

/**
 * Realized variance on a grid `step` times coarser than the raw returns,
 * averaged over all `step` possible starting offsets (subsampling) so every
 * observation is used. `step = 1` reproduces plain realized variance; larger
 * steps suppress microstructure-noise bias at the cost of resolution. Returns 0
 * for `step < 1`, an empty series, or a step too large to form any block.
 */
export function sparseRealizedVariance(
  returns: readonly number[],
  step: number,
): number {
  const n = returns.length;
  const k = Math.floor(step);
  if (k < 1 || n < 1) return 0;
  if (k === 1) return realizedVarAll(returns);

  // cumulative log-prices P[0..n], P[i] = Σ returns[0..i-1]
  const P = new Array<number>(n + 1);
  P[0] = 0;
  for (let i = 0; i < n; i++) P[i + 1] = P[i] + returns[i];

  let total = 0;
  let grids = 0;
  for (let g = 0; g < k; g++) {
    let s = 0;
    let blocks = 0;
    for (let idx = g; idx + k <= n; idx += k) {
      const d = P[idx + k] - P[idx];
      s += d * d;
      blocks++;
    }
    if (blocks > 0) {
      total += s;
      grids++;
    }
  }
  return grids > 0 ? total / grids : 0;
}

/** One point of a volatility-signature curve. */
export interface SignaturePoint {
  /** Sampling step (in raw-return units). */
  step: number;
  /** Subsampled realized variance at that step. */
  realizedVariance: number;
}

/**
 * The volatility signature: subsampled realized variance at each sampling step
 * in `steps`. Plotted against the step, the curve typically starts high (noise
 * inflated) at step 1 and settles toward the true integrated variance as the
 * step grows — the shape that diagnoses how much microstructure noise a series
 * carries. Steps are used as given (deduplication and ordering are the caller's
 * choice).
 */
export function volatilitySignature(
  returns: readonly number[],
  steps: readonly number[],
): SignaturePoint[] {
  return steps.map((step) => ({
    step,
    realizedVariance: sparseRealizedVariance(returns, step),
  }));
}
