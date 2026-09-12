/**
 * Lee-Mykland (2008) nonparametric jump test — detecting *individual* jumps and
 * their timing.
 *
 * Bipower variation (see `jumps`) tells you how much of a whole sample's variance
 * came from jumps, but not *where* the jumps were. Lee & Mykland (2008), "Jumps in
 * Financial Markets: A New Nonparametric Test and Jump Dynamics" (Review of Financial
 * Studies 21(6), 2535–2563), give a test that flags each return that is too large to
 * be diffusion, and pins down the instant it happened.
 *
 * For each return rᵢ they form a standardized statistic
 *
 *   L(i) = rᵢ / σ̂(tᵢ)
 *
 * where σ̂(tᵢ) is a *local* volatility estimate from a jump-robust bipower average
 * over the K returns just before i (the return being tested is excluded, so a jump
 * cannot inflate its own benchmark):
 *
 *   σ̂(tᵢ)² = (π/2) · (1/(K−2)) · Σⱼ |rⱼ| · |rⱼ₋₁|,   j = i−K+2 … i−1
 *
 * Under the continuous-path null L(i) is asymptotically standard normal, so the
 * *maximum* of |L| over n test points follows a Gumbel law. A return is a jump when
 *
 *   |L(i)| > Sₙ · β* + Cₙ,   β* = −log(−log(1−α))
 *   Cₙ = √(2 log n) − (log π + log log n) / (2√(2 log n)),   Sₙ = 1/√(2 log n)
 *
 * with n the number of test statistics and α the significance level. This EVT
 * threshold controls the chance of even one false jump across the whole sample —
 * far stricter, and far more informative about timing, than a per-sample RV−BV split.
 *
 * Feed log-return series. The window K trades off local-constancy of volatility
 * (small K) against estimation noise (large K); Lee & Mykland show K ≈ √n satisfies
 * the asymptotics, which is the default here — override it to match your sampling
 * frequency. Everything is dependency-free.
 */

// (π/2) = 1/μ₁² where μ₁ = E[|Z|] = √(2/π) for Z ~ N(0,1); standardizes bipower.
const MU1_INV_SQ = Math.PI / 2;

/** Options for the Lee-Mykland jump test. */
export interface LeeMyklandOptions {
  /** Local-volatility window K (number of returns, ≥ 3). Default `max(3, round(√n))`. */
  windowSize?: number;
  /** Significance level α in (0, 1) for jump detection. Default 0.01. */
  significance?: number;
}

/** A detected jump: its return index, the test statistic, and its sign. */
export interface LeeMyklandJump {
  /** Index (into the input series) of the return flagged as a jump. */
  index: number;
  /** The standardized statistic L(i); its magnitude exceeds the critical value. */
  statistic: number;
  /** Jump direction: +1 for an up-move, −1 for a down-move. */
  direction: 1 | -1;
}

/** Default window when none is given: max(3, round(√n)). */
function defaultWindow(n: number): number {
  return Math.max(3, Math.round(Math.sqrt(n)));
}

/**
 * Lee-Mykland standardized statistics L(i) = rᵢ / σ̂(tᵢ), one per input return.
 * The first `K−1` entries are `NaN` (no full local window yet), as is any entry whose
 * local-volatility window is degenerate (zero). Larger |L(i)| means the return is more
 * extreme relative to the local diffusive volatility just before it. Pass log returns.
 */
export function leeMyklandStatistics(
  returns: readonly number[],
  options: LeeMyklandOptions = {},
): number[] {
  const n = returns.length;
  const K = options.windowSize ?? defaultWindow(n);
  const L: number[] = new Array(n).fill(NaN);
  if (K < 3 || n < K) return L;
  for (let i = K - 1; i < n; i++) {
    let s = 0;
    for (let j = i - K + 2; j <= i - 1; j++) {
      s += Math.abs(returns[j]) * Math.abs(returns[j - 1]);
    }
    const variance = (MU1_INV_SQ * s) / (K - 2);
    if (variance <= 0) continue; // degenerate local window → leave NaN
    L[i] = returns[i] / Math.sqrt(variance);
  }
  return L;
}

/**
 * Critical value Sₙ·β* + Cₙ for the Lee-Mykland test: a statistic whose absolute
 * value exceeds it is a jump at significance `significance`. `numStatistics` is the
 * number of test points the maximum is taken over (typically `returns.length − K + 1`).
 * Returns `NaN` for fewer than two statistics or a significance outside (0, 1).
 */
export function leeMyklandCriticalValue(
  numStatistics: number,
  significance = 0.01,
): number {
  const n = numStatistics;
  if (!(n > 1) || !(significance > 0 && significance < 1)) return NaN;
  const root = Math.sqrt(2 * Math.log(n));
  const cn = root - (Math.log(Math.PI) + Math.log(Math.log(n))) / (2 * root);
  const sn = 1 / root;
  const betaStar = -Math.log(-Math.log(1 - significance));
  return sn * betaStar + cn;
}

/**
 * Detected jumps under the Lee-Mykland test: every return whose standardized statistic
 * |L(i)| exceeds the Gumbel critical value at level `significance`. The threshold is
 * computed from the number of non-`NaN` statistics, so it controls the family-wide
 * false-positive rate across the whole series. Returns an empty array when there are
 * too few statistics to test. Pass log returns.
 */
export function leeMyklandJumps(
  returns: readonly number[],
  options: LeeMyklandOptions = {},
): LeeMyklandJump[] {
  const stats = leeMyklandStatistics(returns, options);
  const significance = options.significance ?? 0.01;
  let numStats = 0;
  for (const v of stats) if (!Number.isNaN(v)) numStats++;
  const jumps: LeeMyklandJump[] = [];
  if (numStats < 2) return jumps;
  const crit = leeMyklandCriticalValue(numStats, significance);
  if (Number.isNaN(crit)) return jumps;
  for (let i = 0; i < stats.length; i++) {
    const v = stats[i];
    if (!Number.isNaN(v) && Math.abs(v) > crit) {
      jumps.push({ index: i, statistic: v, direction: v > 0 ? 1 : -1 });
    }
  }
  return jumps;
}
