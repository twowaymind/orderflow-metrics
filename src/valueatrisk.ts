/**
 * Value-at-Risk (VaR) and Expected Shortfall (ES) — the standard measures of tail
 * risk, including the Cornish-Fisher modified VaR that corrects the Gaussian number
 * for skewness and fat tails.
 *
 * VaR at confidence level `c` is the loss that a portfolio will not exceed with
 * probability `c` over the horizon (e.g. the 95% VaR is the 5%-tail loss). Expected
 * Shortfall — a.k.a. Conditional VaR — is the *average* loss in that tail, the
 * coherent risk measure the Basel framework moved to precisely because it sees the
 * shape of the tail beyond the cutoff. Both are returned as **positive loss
 * magnitudes** (a 95% VaR of 0.02 means a 2% loss).
 *
 * Three lenses on the same tail:
 *   - `valueAtRisk` / `expectedShortfall` — historical (empirical): read the tail
 *     straight off the realized return distribution, no distributional assumption.
 *   - `gaussianValueAtRisk` — parametric normal: VaR = −(μ + z·σ), with `z` the
 *     standard-normal quantile at `1 − c`.
 *   - `cornishFisherValueAtRisk` — the normal quantile `z` expanded with the sample
 *     skewness `S` and excess kurtosis `K` (Cornish-Fisher; Favre & Galéano 2002):
 *       z_cf = z + (z²−1)/6·S + (z³−3z)/24·K − (2z³−5z)/36·S²
 *     A left-skewed, fat-tailed series pushes VaR *above* the Gaussian figure — the
 *     correction that stops normal VaR from understating crash risk.
 *
 * The Gaussian quantile uses a dependency-free rational-approximation inverse normal
 * CDF (`inverseNormalCdf`, Acklam) accurate to ~1e-9 — no statistics library.
 * `level` is the confidence `c` in (0, 1), default 0.95.
 */

/**
 * Inverse standard-normal CDF (quantile function) Φ⁻¹(p) via Acklam's rational
 * approximation; accurate to roughly 1e-9 over p ∈ (0, 1). Returns `NaN` outside the
 * open interval. A dependency-free companion to the `standardNormalCdf` in `vpin`.
 */
export function inverseNormalCdf(p: number): number {
  if (!(p > 0 && p < 1)) return NaN;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0,
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= phigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

/** Linearly-interpolated empirical quantile at probability `p` (numpy "linear"). */
function quantile(sorted: readonly number[], p: number): number {
  const n = sorted.length;
  if (n === 1) return sorted[0];
  const pos = (n - 1) * p;
  const lo = Math.floor(pos);
  const frac = pos - lo;
  if (lo + 1 >= n) return sorted[n - 1];
  return sorted[lo] + frac * (sorted[lo + 1] - sorted[lo]);
}

function mean(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Population mean and standard deviation (ddof = 0). */
function meanStd(returns: readonly number[]): { mu: number; sd: number } {
  const mu = mean(returns);
  let v = 0;
  for (const r of returns) v += (r - mu) * (r - mu);
  return { mu, sd: Math.sqrt(v / returns.length) };
}

const validLevel = (level: number): boolean => level > 0 && level < 1;

/**
 * Historical (empirical) Value-at-Risk at confidence `level`, as a positive loss.
 * Reads the `1 − level` quantile straight off the return distribution (linearly
 * interpolated) — no distributional assumption. Returns `NaN` for an empty series or
 * a `level` outside (0, 1). Pass a return series.
 */
export function valueAtRisk(returns: readonly number[], level = 0.95): number {
  if (returns.length === 0 || !validLevel(level)) return NaN;
  const sorted = [...returns].sort((x, y) => x - y);
  return -quantile(sorted, 1 - level);
}

/**
 * Historical Expected Shortfall (Conditional VaR) at confidence `level`, as a positive
 * loss: the average of the returns at or below the historical VaR threshold — the mean
 * loss *given* the tail is breached. Returns `NaN` for an empty series or a `level`
 * outside (0, 1). Pass a return series.
 */
export function expectedShortfall(returns: readonly number[], level = 0.95): number {
  if (returns.length === 0 || !validLevel(level)) return NaN;
  const sorted = [...returns].sort((x, y) => x - y);
  const threshold = quantile(sorted, 1 - level);
  const tail = sorted.filter((r) => r <= threshold);
  if (tail.length === 0) return -threshold;
  return -mean(tail);
}

/**
 * Parametric Gaussian Value-at-Risk at confidence `level`, as a positive loss:
 * `−(μ + z·σ)` with `z = Φ⁻¹(1 − level)` and μ, σ the sample mean and (population)
 * standard deviation. Assumes normal returns. Returns `NaN` for an empty series or a
 * `level` outside (0, 1). Pass a return series.
 */
export function gaussianValueAtRisk(returns: readonly number[], level = 0.95): number {
  if (returns.length === 0 || !validLevel(level)) return NaN;
  const { mu, sd } = meanStd(returns);
  const z = inverseNormalCdf(1 - level);
  return -(mu + sd * z);
}

/**
 * Cornish-Fisher modified Value-at-Risk at confidence `level`, as a positive loss.
 * Expands the normal quantile with the sample skewness `S` and excess kurtosis `K`
 * (both population estimators) —
 *   z_cf = z + (z²−1)/6·S + (z³−3z)/24·K − (2z³−5z)/36·S²,   z = Φ⁻¹(1 − level)
 * — then returns `−(μ + z_cf·σ)`. Captures the extra crash risk a left-skewed, fat-
 * tailed return series carries beyond the Gaussian figure. Needs at least two returns
 * (σ > 0); returns `NaN` for fewer, a degenerate (zero-variance) series, or a `level`
 * outside (0, 1). Pass a return series.
 */
export function cornishFisherValueAtRisk(returns: readonly number[], level = 0.95): number {
  if (returns.length < 2 || !validLevel(level)) return NaN;
  const { mu, sd } = meanStd(returns);
  if (sd <= 0) return NaN;
  const n = returns.length;
  let s3 = 0;
  let s4 = 0;
  for (const r of returns) {
    const z = (r - mu) / sd;
    s3 += z * z * z;
    s4 += z * z * z * z;
  }
  const skew = s3 / n;
  const exKurt = s4 / n - 3;
  const z = inverseNormalCdf(1 - level);
  const zcf =
    z +
    ((z * z - 1) / 6) * skew +
    ((z * z * z - 3 * z) / 24) * exKurt -
    ((2 * z * z * z - 5 * z) / 36) * skew * skew;
  return -(mu + sd * zcf);
}
