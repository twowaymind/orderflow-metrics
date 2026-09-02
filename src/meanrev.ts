/**
 * Mean reversion and the Ornstein–Uhlenbeck timescale.
 *
 * A spread, a pair residual, or any stationary series that drifts back toward
 * an equilibrium can be described by a discrete Ornstein–Uhlenbeck / AR(1)
 * process,
 *
 *   yₜ − yₜ₋₁ = κ·(μ − yₜ₋₁) + εₜ,
 *
 * where `κ` is the *speed* of mean reversion per step. Regressing the change
 * `Δyₜ` on the lagged level `yₜ₋₁` recovers a slope `b = −κ`, so `κ = −b`.
 * From the speed comes the **half-life** — the number of steps a deviation
 * takes to decay halfway back to the mean, `ln 2 / κ` — the horizon a
 * pairs / stat-arb strategy actually trades on (Ornstein & Uhlenbeck 1930;
 * the pairs-trading formulation in e.g. Chan 2013). The **z-score** turns the
 * latest observation into a standardized deviation from the sample mean, the
 * entry / exit signal itself.
 *
 * These complement the regime diagnostics in `efficiency.ts` (variance ratio)
 * and `hurst.ts`: those label a series as trending vs mean-reverting, while
 * these quantify *how fast* it reverts and *how far* it is from home right now.
 * All three operate on a **level / spread** series, not a return series.
 */

/**
 * Ornstein–Uhlenbeck mean-reversion speed `κ` per step: the negated OLS slope
 * of the change `Δyₜ` on the lagged level `yₜ₋₁`.
 *
 *   κ > 0  mean-reverting (larger = faster pull back to the mean)
 *   κ = 0  random walk (no reversion)
 *   κ < 0  trending / explosive (deviations grow)
 *
 * Returns 0 for degenerate input (fewer than 3 points, or a lagged level with
 * zero variance).
 */
export function meanReversionSpeed(series: readonly number[]): number {
  const n = series.length;
  if (n < 3) return 0;

  // Pairs (lagged level, change), t = 1 … n-1.
  const m = n - 1;
  let xbar = 0;
  let dbar = 0;
  for (let t = 1; t < n; t++) {
    xbar += series[t - 1];
    dbar += series[t] - series[t - 1];
  }
  xbar /= m;
  dbar /= m;

  let sxx = 0;
  let sxd = 0;
  for (let t = 1; t < n; t++) {
    const dx = series[t - 1] - xbar;
    const dd = series[t] - series[t - 1] - dbar;
    sxx += dx * dx;
    sxd += dx * dd;
  }
  if (sxx === 0) return 0;

  const slope = sxd / sxx; // b = −κ
  return -slope;
}

/**
 * Half-life of mean reversion: `ln 2 / κ`, the number of steps a deviation
 * takes to decay halfway back to the mean. Returns `Infinity` when the series
 * is not mean-reverting (`κ ≤ 0`) — a deviation never reverts.
 */
export function halfLife(series: readonly number[]): number {
  const kappa = meanReversionSpeed(series);
  if (kappa <= 0) return Infinity;
  return Math.LN2 / kappa;
}

/**
 * Z-score of the most recent observation: `(last − mean) / stddev` over the
 * whole series, using the population standard deviation. A positive value is
 * a deviation above the mean, a negative one below; magnitude is how many
 * standard deviations from home the series sits right now — the raw
 * mean-reversion trading signal. Returns 0 for empty input or a constant
 * series (zero dispersion).
 */
export function zScore(series: readonly number[]): number {
  const n = series.length;
  if (n === 0) return 0;

  let mean = 0;
  for (const v of series) mean += v;
  mean /= n;

  let variance = 0;
  for (const v of series) variance += (v - mean) * (v - mean);
  variance /= n;

  const sd = Math.sqrt(variance);
  if (sd === 0) return 0;
  return (series[n - 1] - mean) / sd;
}
