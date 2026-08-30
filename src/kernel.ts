/**
 * Realized kernel — Barndorff-Nielsen, Hansen, Lund & Shephard (2008).
 *
 * The flagship noise-robust estimator of integrated variance. Plain realized
 * variance (Σrᵢ²) is inflated by microstructure noise; the two-scale estimator
 * (`tsrv`) corrects it with two sampling grids. The realized kernel corrects it
 * differently and more efficiently: it adds *weighted realized autocovariances*
 * of the returns, which cancel the bias the noise injects into the neighbouring
 * lags.
 *
 *   K(X) = γ₀ + Σ_{h=1}^{H} k( h / (H+1) ) · ( γ_h + γ_{-h} )
 *
 * where γ_h = Σⱼ rⱼ·rⱼ₋ₕ is the realized autocovariance at lag h (γ₀ is plain
 * RV, γ_{-h} = γ_h), `H` is the bandwidth (how many lags to include), and k(·)
 * is the Parzen kernel — a smooth, positive-semidefinite weight that guarantees
 * a non-negative estimate:
 *
 *   k(x) = 1 − 6x² + 6x³   for 0 ≤ x ≤ ½
 *   k(x) = 2(1 − x)³       for ½ < x ≤ 1
 *   k(x) = 0               for x > 1
 *
 * Larger `H` removes more noise bias at the cost of variance; in practice it's
 * chosen ∝ n^{3/5} from the noise-to-signal ratio, or read off a volatility
 * signature plot (see the `noise` module).
 */

/** The Parzen kernel weight, k(x), for x ≥ 0. */
export function parzenKernel(x: number): number {
  if (x <= 0) return 1;
  if (x <= 0.5) return 1 - 6 * x * x + 6 * x * x * x;
  if (x <= 1) {
    const u = 1 - x;
    return 2 * u * u * u;
  }
  return 0;
}

/**
 * Realized autocovariance at lag `h` (h ≥ 0): Σⱼ rⱼ·rⱼ₋ₕ over the overlapping
 * returns. `h = 0` is plain realized variance (Σrⱼ²). Returns 0 when `h` is
 * negative or `h ≥ returns.length`.
 */
export function realizedAutocovariance(
  returns: readonly number[],
  h: number,
): number {
  const n = returns.length;
  if (h < 0 || h >= n) return 0;
  let s = 0;
  for (let j = h; j < n; j++) s += returns[j] * returns[j - h];
  return s;
}

/**
 * Realized kernel: a microstructure-noise-robust estimator of integrated
 * variance using Parzen-weighted realized autocovariances up to lag
 * `bandwidth`. The Parzen kernel makes the estimate non-negative by
 * construction. `bandwidth < 1` falls back to plain realized variance (γ₀, no
 * autocovariance correction); a `bandwidth` at or above the sample length is
 * clamped to `n − 1`. Returns 0 for an empty series.
 */
export function realizedKernel(
  returns: readonly number[],
  bandwidth: number,
): number {
  const n = returns.length;
  if (n === 0) return 0;
  const gamma0 = realizedAutocovariance(returns, 0);
  const h = Math.floor(bandwidth);
  if (h < 1) return gamma0;
  const hMax = Math.min(h, n - 1);
  let k = gamma0;
  for (let lag = 1; lag <= hMax; lag++) {
    // γ_h + γ_{-h} = 2·γ_h (realized autocovariance is symmetric)
    k += parzenKernel(lag / (h + 1)) * 2 * realizedAutocovariance(returns, lag);
  }
  return k;
}

/**
 * Realized-kernel volatility: the square root of `realizedKernel`, floored at 0.
 * The Parzen kernel keeps the variance non-negative, so the floor only guards
 * floating-point round-off at zero.
 */
export function realizedKernelVolatility(
  returns: readonly number[],
  bandwidth: number,
): number {
  const v = realizedKernel(returns, bandwidth);
  return Math.sqrt(v > 0 ? v : 0);
}
