/**
 * Portmanteau autocorrelation tests — is a series *serially uncorrelated*, or is
 * there structure left to exploit?
 *
 * `efficiency` gives a single lag-k autocorrelation and the variance ratio; these two
 * roll the *whole* autocorrelation function up to lag h into one number and turn it into
 * a formal hypothesis test. Under the null "the series is white noise" both statistics
 * are χ² with h degrees of freedom, so a small p-value says: the autocorrelations up to
 * lag h are jointly too large to be chance — the series is predictable (return
 * autocorrelation, momentum/mean-reversion) or, run on squared returns, has volatility
 * clustering; run on model residuals, the model is misspecified.
 *
 *   - `ljungBox` (Ljung & Box 1978) — the standard portmanteau test,
 *     Q = n(n+2)·Σ_{k=1}^{h} ρ̂ₖ²/(n−k), χ²(h). The (n+2)/(n−k) weighting is a
 *     small-sample refinement of Box-Pierce and is what almost everyone reports.
 *   - `boxPierce` (Box & Pierce 1970) — the original, Q = n·Σ_{k=1}^{h} ρ̂ₖ², χ²(h);
 *     kept for completeness and because it is what some references still quote.
 *
 * When the series is the residual of a fitted ARMA(p, q), pass `fittedParams = p + q`:
 * the degrees of freedom drop to h − (p + q), as Ljung-Box prescribes. The χ² p-value
 * uses an exact dependency-free regularized incomplete gamma (Lanczos log-Γ + a
 * series/continued-fraction split), valid for *any* degrees of freedom — no statistics
 * library. `NaN` for a series shorter than `lags + 1`, `lags < 1`, a constant series, or
 * degrees of freedom below 1.
 */

/** Result of a portmanteau (Ljung-Box / Box-Pierce) autocorrelation test. */
export interface PortmanteauResult {
  /** The Q test statistic (χ² distributed under the white-noise null). */
  statistic: number;
  /** Degrees of freedom of the χ² reference distribution (lags − fittedParams). */
  degreesOfFreedom: number;
  /** p-value; a small value rejects the "no autocorrelation" null. */
  pValue: number;
}

const NAN_RESULT: PortmanteauResult = {
  statistic: NaN,
  degreesOfFreedom: NaN,
  pValue: NaN,
};

// Lanczos approximation for ln Γ(z) (g = 7), accurate to ~1e-15 for z > 0.
const LANCZOS_G = 7;
const LANCZOS_C = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function logGamma(z: number): number {
  if (z < 0.5) {
    // Reflection: Γ(z)Γ(1−z) = π / sin(πz)
    return (
      Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
    );
  }
  z -= 1;
  let x = LANCZOS_C[0];
  for (let i = 1; i < LANCZOS_C.length; i++) x += LANCZOS_C[i] / (z + i);
  const t = z + LANCZOS_G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Lower regularized incomplete gamma P(a, x) via the series expansion (x < a+1). */
function lowerGammaSeries(a: number, x: number): number {
  if (x <= 0) return 0;
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let i = 0; i < 1000; i++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

/** Upper regularized incomplete gamma Q(a, x) via the Lentz continued fraction (x ≥ a+1). */
function upperGammaContinuedFraction(a: number, x: number): number {
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/**
 * Upper tail of the χ² distribution, P(χ²_df > x), for any positive degrees of freedom.
 * Exact and dependency-free via the regularized incomplete gamma Q(df/2, x/2). Returns 1
 * for x ≤ 0 and `NaN` for df ≤ 0.
 */
export function chiSquareSurvival(x: number, df: number): number {
  if (!(df > 0)) return NaN;
  if (!(x > 0)) return 1;
  const a = df / 2;
  const y = x / 2;
  return y < a + 1 ? 1 - lowerGammaSeries(a, y) : upperGammaContinuedFraction(a, y);
}

/** Autocorrelations ρ̂₁..ρ̂_h (biased estimator, full-sample variance denominator). */
function autocorrelations(series: readonly number[], h: number): number[] | null {
  const n = series.length;
  let mean = 0;
  for (const v of series) mean += v;
  mean /= n;
  const dev = new Array<number>(n);
  let den = 0;
  for (let t = 0; t < n; t++) {
    dev[t] = series[t] - mean;
    den += dev[t] * dev[t];
  }
  if (den === 0) return null; // constant series — autocorrelation undefined
  const rho = new Array<number>(h);
  for (let k = 1; k <= h; k++) {
    let num = 0;
    for (let t = k; t < n; t++) num += dev[t] * dev[t - k];
    rho[k - 1] = num / den;
  }
  return rho;
}

/**
 * Ljung-Box portmanteau test (1978) for autocorrelation up to lag `lags`:
 * Q = n(n+2)·Σ_{k=1}^{h} ρ̂ₖ²/(n−k), compared to χ² with `lags − fittedParams` degrees
 * of freedom. `series` is the values to test (returns, or model residuals, or squared
 * returns for a volatility-clustering check); `lags` (h) the number of autocorrelation
 * lags to jointly test; `fittedParams` (default 0) the number of estimated ARMA
 * parameters when `series` is a residual, which reduces the degrees of freedom. Returns
 * the statistic, its degrees of freedom, and a p-value — a small p-value rejects the
 * white-noise null. `NaN` for `series` shorter than `lags + 1`, `lags < 1`, a constant
 * series, or degrees of freedom below 1.
 */
export function ljungBox(
  series: readonly number[],
  lags: number,
  fittedParams = 0,
): PortmanteauResult {
  const n = series.length;
  const df = lags - fittedParams;
  if (lags < 1 || n < lags + 1 || df < 1) return { ...NAN_RESULT };
  const rho = autocorrelations(series, lags);
  if (rho === null) return { ...NAN_RESULT };
  let q = 0;
  for (let k = 1; k <= lags; k++) q += (rho[k - 1] * rho[k - 1]) / (n - k);
  q *= n * (n + 2);
  return { statistic: q, degreesOfFreedom: df, pValue: chiSquareSurvival(q, df) };
}

/**
 * Box-Pierce portmanteau test (1970), the original: Q = n·Σ_{k=1}^{h} ρ̂ₖ², compared to
 * χ² with `lags − fittedParams` degrees of freedom. Same inputs and null as `ljungBox`
 * but without the (n+2)/(n−k) small-sample weighting — `ljungBox` is preferred in
 * practice; this is kept for completeness. Returns the statistic, its degrees of freedom,
 * and a p-value. `NaN` for `series` shorter than `lags + 1`, `lags < 1`, a constant
 * series, or degrees of freedom below 1.
 */
export function boxPierce(
  series: readonly number[],
  lags: number,
  fittedParams = 0,
): PortmanteauResult {
  const n = series.length;
  const df = lags - fittedParams;
  if (lags < 1 || n < lags + 1 || df < 1) return { ...NAN_RESULT };
  const rho = autocorrelations(series, lags);
  if (rho === null) return { ...NAN_RESULT };
  let q = 0;
  for (let k = 1; k <= lags; k++) q += rho[k - 1] * rho[k - 1];
  q *= n;
  return { statistic: q, degreesOfFreedom: df, pValue: chiSquareSurvival(q, df) };
}
