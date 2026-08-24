/**
 * Realized covariance, correlation, and beta between two return series.
 *
 * Single-asset volatility says how much one instrument moved; trading and risk
 * live in how instruments move *together*. Summing the products of contemporaneous
 * returns gives the realized (co)variance — the model-free, high-frequency analogue
 * of covariance:
 *
 *   realized covariance   = Σ xᵢ · yᵢ
 *   realized correlation  = Σ xᵢyᵢ / ( √Σxᵢ² · √Σyᵢ² )   (in [−1, 1])
 *   realized beta         = Σ aᵢ·mᵢ / Σ mᵢ²              (asset a vs market m)
 *
 * The two series are paired element-wise over their common length, so they must
 * be aligned to the same sampling grid (equal length, matching timestamps).
 * Correlation is scale-free; beta is the covariance of an asset with a market,
 * normalized by the market's variance — the sensitivity of the asset to it.
 */

/** Σ xᵢyᵢ over the two series' common length. Both empty → 0. */
function sumProduct(x: readonly number[], y: readonly number[]): number {
  const n = Math.min(x.length, y.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += x[i] * y[i];
  return s;
}

/**
 * Realized covariance: Σ xᵢyᵢ over contemporaneous returns. Symmetric in its
 * arguments; returns 0 for empty input. Series are paired over their common
 * length, so align them to the same sampling grid first.
 */
export function realizedCovariance(x: readonly number[], y: readonly number[]): number {
  return sumProduct(x, y);
}

/**
 * Realized correlation: Σ xᵢyᵢ / (√Σxᵢ² · √Σyᵢ²), in [−1, 1]. Scale-free measure
 * of co-movement. Returns 0 when either series has zero realized variance (or is
 * empty).
 */
export function realizedCorrelation(x: readonly number[], y: readonly number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += x[i] * y[i];
    sxx += x[i] * x[i];
    syy += y[i] * y[i];
  }
  const denom = Math.sqrt(sxx) * Math.sqrt(syy);
  return denom > 0 ? sxy / denom : 0;
}

/**
 * Realized beta of an asset against a market/benchmark: Σ aᵢmᵢ / Σ mᵢ², i.e. the
 * realized covariance of the two divided by the market's realized variance — the
 * asset's sensitivity to the market. Returns 0 when the market has zero realized
 * variance (or the input is empty).
 */
export function realizedBeta(asset: readonly number[], market: readonly number[]): number {
  const n = Math.min(asset.length, market.length);
  if (n === 0) return 0;
  let cov = 0;
  let varM = 0;
  for (let i = 0; i < n; i++) {
    cov += asset[i] * market[i];
    varM += market[i] * market[i];
  }
  return varM > 0 ? cov / varM : 0;
}
