/**
 * The Kelly criterion — position sizing for maximum long-run growth.
 *
 * Risk and performance metrics tell you how good a bet is; the Kelly criterion (Kelly
 * 1956, made famous in markets by Ed Thorp) tells you *how much to bet*. Betting too
 * little leaves growth on the table; betting too much courts ruin even with an edge.
 * Kelly is the fraction that maximizes the expected *logarithm* of wealth — the unique
 * size that maximizes long-run compound growth, and the one past which more leverage
 * makes you poorer, not richer.
 *
 *   - `kellyFraction` — the classic discrete bet: for a wager that wins with
 *     probability p at odds b (win b per 1 risked), the optimal stake is
 *     `f* = p − (1 − p)/b`. A negative result means the bet has no edge — don't take it.
 *   - `kellyLeverage` — the continuous, mean-variance form: for a return stream the
 *     growth-optimal leverage is `μ / σ²`, excess mean over variance. The everyday
 *     "Kelly leverage" a systematic desk quotes.
 *   - `growthOptimalLeverage` — the *exact* empirical optimum: the leverage λ that
 *     maximizes the realized mean log-growth `(1/N)·Σ log(1 + λ·rₜ)` over the return
 *     series, found with a dependency-free golden-section search. No Gaussian
 *     assumption — it reads the growth-optimal size straight off the data.
 *
 * Kelly is aggressive by construction; practitioners commonly size at a fraction of it
 * (half-Kelly) to trade a little growth for much lower drawdown. Everything is
 * dependency-free.
 */

/**
 * Discrete Kelly bet fraction: `f* = p − (1 − p)/b`, the stake (as a fraction of
 * bankroll) that maximizes long-run growth for a bet that wins with probability
 * `winProbability` at payoff odds `winLossRatio` (units won per unit risked). A
 * negative value means there is no edge and the bet should be skipped. Returns `NaN`
 * for a probability outside [0, 1] or a non-positive `winLossRatio`.
 */
export function kellyFraction(winProbability: number, winLossRatio: number): number {
  if (!(winProbability >= 0 && winProbability <= 1) || !(winLossRatio > 0)) return NaN;
  return winProbability - (1 - winProbability) / winLossRatio;
}

/**
 * Mean-variance (continuous) Kelly leverage: `meanReturn / variance` — the
 * growth-optimal leverage for a return stream under the Gaussian approximation. Pass
 * the mean *excess* return and the variance of returns per period. Returns `NaN` for a
 * non-positive variance.
 */
export function kellyLeverage(meanReturn: number, variance: number): number {
  if (!(variance > 0)) return NaN;
  return meanReturn / variance;
}

/**
 * Exact empirical growth-optimal leverage: the λ that maximizes the realized mean
 * log-growth `(1/N)·Σ log(1 + λ·rₜ)` over the return series, via a dependency-free
 * golden-section search over the range where every `1 + λ·rₜ` stays positive. Makes no
 * distributional assumption — the empirical counterpart of `kellyLeverage`. A positive
 * result is long leverage, negative is short. Returns `NaN` for fewer than two returns,
 * an all-zero series, or a series whose returns all share one sign (the optimum is then
 * unbounded). Pass simple per-period returns.
 */
export function growthOptimalLeverage(returns: readonly number[]): number {
  const n = returns.length;
  if (n < 2) return NaN;
  let maxPos = -Infinity;
  let minNeg = Infinity;
  for (const r of returns) {
    if (r > maxPos) maxPos = r;
    if (r < minNeg) minNeg = r;
  }
  // need both a positive and a negative return to bracket a finite optimum
  if (!(maxPos > 0) || !(minNeg < 0)) return NaN;
  const lo = -1 / maxPos; // 1 + λ·maxPos > 0
  const hi = -1 / minNeg; // 1 + λ·minNeg > 0
  const g = (lam: number): number => {
    let s = 0;
    for (const r of returns) {
      const x = 1 + lam * r;
      if (x <= 0) return -Infinity;
      s += Math.log(x);
    }
    return s / n;
  };
  const eps = (hi - lo) * 1e-9;
  let a = lo + eps;
  let b = hi - eps;
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = b - gr * (b - a);
  let d = a + gr * (b - a);
  let fc = g(c);
  let fd = g(d);
  for (let i = 0; i < 500 && b - a > 1e-11; i++) {
    if (fc > fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - gr * (b - a);
      fc = g(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + gr * (b - a);
      fd = g(d);
    }
  }
  return (a + b) / 2;
}
