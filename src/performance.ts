/**
 * Risk-adjusted performance ratios — Sharpe, Sortino, maximum drawdown, and Calmar.
 *
 * A raw return says nothing about the risk taken to earn it. These are the headline
 * numbers every desk and fund reports to put return and risk on the same footing:
 *
 *   - `sharpeRatio` (Sharpe 1966/1994) — mean excess return per unit of *total*
 *     volatility. The classic reward-to-variability ratio.
 *   - `sortinoRatio` (Sortino & Price 1994) — mean excess return per unit of
 *     *downside* deviation only. Upside volatility isn't risk, so it doesn't punish a
 *     strategy for its good surprises.
 *   - `maxDrawdown` — the largest peak-to-trough decline of the compounded equity
 *     curve, as a positive fraction. The number that actually decides whether you can
 *     stay in a strategy.
 *   - `calmarRatio` — annualized return divided by maximum drawdown: return earned per
 *     unit of worst-case pain.
 *
 * Conventions (documented, so the numbers are reproducible): Sharpe uses the *sample*
 * standard deviation (ddof = 1); Sortino's downside deviation is the target
 * semideviation `√((1/N)·Σ min(rₜ − target, 0)²)` (all N observations in the
 * denominator); drawdown compounds returns into an equity curve `∏(1 + rₜ)`; Calmar's
 * annualized return is geometric, `(∏(1 + rₜ))^(periodsPerYear/N) − 1`. Pass simple
 * (not log) per-period returns. Everything is dependency-free.
 */

function mean(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Sample standard deviation (ddof = 1); NaN for fewer than two observations. */
function sampleStd(xs: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return NaN;
  const m = mean(xs);
  let v = 0;
  for (const x of xs) v += (x - m) * (x - m);
  return Math.sqrt(v / (n - 1));
}

/**
 * Sharpe ratio (per period): mean excess return divided by the sample standard
 * deviation of excess returns, with `riskFree` the per-period risk-free rate. Multiply
 * by `√(periods per year)` to annualize, or use `annualizedSharpeRatio`. Returns `NaN`
 * for fewer than two returns or a zero-variance series. Pass simple per-period returns.
 */
export function sharpeRatio(returns: readonly number[], riskFree = 0): number {
  if (returns.length < 2) return NaN;
  const excess = returns.map((r) => r - riskFree);
  const sd = sampleStd(excess);
  if (!(sd > 0)) return NaN;
  return mean(excess) / sd;
}

/**
 * Annualized Sharpe ratio: the per-period `sharpeRatio` scaled by `√periodsPerYear`
 * (e.g. 252 for daily, 12 for monthly). Returns `NaN` for fewer than two returns, a
 * zero-variance series, or a non-positive `periodsPerYear`. Pass simple per-period returns.
 */
export function annualizedSharpeRatio(
  returns: readonly number[],
  periodsPerYear: number,
  riskFree = 0,
): number {
  if (!(periodsPerYear > 0)) return NaN;
  return sharpeRatio(returns, riskFree) * Math.sqrt(periodsPerYear);
}

/**
 * Sortino ratio (per period): mean excess return divided by the downside deviation —
 * the target semideviation `√((1/N)·Σ min(rₜ − target, 0)²)`, which counts only returns
 * below `target`. Rewards upside volatility instead of penalizing it. Returns `NaN` for
 * an empty series or when there is no downside (zero downside deviation). Pass simple
 * per-period returns.
 */
export function sortinoRatio(returns: readonly number[], target = 0): number {
  const n = returns.length;
  if (n === 0) return NaN;
  let dsq = 0;
  for (const r of returns) {
    const d = r - target;
    if (d < 0) dsq += d * d;
  }
  const downsideDev = Math.sqrt(dsq / n);
  if (!(downsideDev > 0)) return NaN;
  const excessMean = mean(returns) - target;
  return excessMean / downsideDev;
}

/**
 * Maximum drawdown: the largest peak-to-trough decline of the compounded equity curve
 * `∏(1 + rₜ)`, returned as a positive fraction in [0, 1] (0.2 = a 20% drawdown). A
 * monotonically non-declining curve gives 0. Returns `NaN` for an empty series. Pass
 * simple per-period returns.
 */
export function maxDrawdown(returns: readonly number[]): number {
  if (returns.length === 0) return NaN;
  let equity = 1;
  let peak = 1;
  let maxDd = 0;
  for (const r of returns) {
    equity *= 1 + r;
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

/**
 * Calmar ratio: geometric annualized return divided by maximum drawdown —
 * `((∏(1 + rₜ))^(periodsPerYear/N) − 1) / maxDrawdown`. Return per unit of worst-case
 * decline. Returns `NaN` for an empty series, a non-positive `periodsPerYear`, or a
 * drawdown-free curve (zero maximum drawdown). Pass simple per-period returns.
 */
export function calmarRatio(returns: readonly number[], periodsPerYear: number): number {
  const n = returns.length;
  if (n === 0 || !(periodsPerYear > 0)) return NaN;
  const dd = maxDrawdown(returns);
  if (!(dd > 0)) return NaN;
  let growth = 1;
  for (const r of returns) growth *= 1 + r;
  if (growth <= 0) return NaN;
  const annualizedReturn = Math.pow(growth, periodsPerYear / n) - 1;
  return annualizedReturn / dd;
}
