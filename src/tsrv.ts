/**
 * Two-Scale Realized Variance (TSRV) — Zhang, Mykland & Aït-Sahalia (2005).
 *
 * Plain realized variance is biased upward by microstructure noise, and sparse
 * (subsampled) realized variance reduces that bias but doesn't remove it. TSRV
 * removes it: it combines two sampling scales — a slow, subsampled RV and the
 * fast all-ticks RV (which is essentially a pure measurement of the noise) — and
 * subtracts a bias correction, yielding a *consistent* estimator of integrated
 * variance that uses every observation.
 *
 *   TSRV = (1 − n̄/n)⁻¹ · ( RV_sparse(K) − (n̄/n) · RV_all )
 *
 * where RV_all is the finest-grid Σrᵢ², RV_sparse(K) is realized variance on a
 * grid K times coarser averaged over all K offsets (subsampling), and
 * n̄ = (n − K + 1)/K is the average number of returns per slow subgrid. The
 * leading factor is the small-sample bias adjustment. `K` (the slow scale) is
 * best read off a volatility signature plot (see the `noise` module).
 */

import { sparseRealizedVariance } from "./noise.ts";

function realizedVarAll(returns: readonly number[]): number {
  let s = 0;
  for (const r of returns) s += r * r;
  return s;
}

/**
 * Two-scale realized variance: a microstructure-noise-consistent estimator of
 * integrated variance. `slowScale` (K ≥ 2) is the coarse sampling factor.
 * Returns plain realized variance for `slowScale < 2` (no second scale) and 0
 * for fewer than two returns. In heavy-noise / very-small-sample cases the
 * estimate can be slightly negative, like any bias-corrected variance
 * estimator; floor it yourself if you need a non-negative value.
 */
export function twoScaleRealizedVariance(
  returns: readonly number[],
  slowScale: number,
): number {
  const n = returns.length;
  const k = Math.floor(slowScale);
  if (n < 2) return 0;
  if (k < 2) return realizedVarAll(returns);

  const rvSparse = sparseRealizedVariance(returns, k);
  const rvAll = realizedVarAll(returns);
  const nBar = (n - k + 1) / k;
  const adj = 1 - nBar / n;
  if (adj <= 0) return rvSparse; // too few observations for the correction
  return (rvSparse - (nBar / n) * rvAll) / adj;
}

/**
 * Two-scale realized volatility: the square root of `twoScaleRealizedVariance`,
 * floored at 0 (a negative small-sample estimate is treated as zero variance).
 */
export function twoScaleRealizedVolatility(
  returns: readonly number[],
  slowScale: number,
): number {
  const v = twoScaleRealizedVariance(returns, slowScale);
  return Math.sqrt(v > 0 ? v : 0);
}
