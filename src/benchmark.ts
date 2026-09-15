/**
 * Benchmark-relative performance — Jensen's alpha, Treynor ratio, tracking error, and
 * the information ratio. Where `performance` judges a return stream on its own, these
 * judge it against a benchmark (an index, a factor, a strategy you're trying to beat).
 *
 *   - `jensensAlpha` (Jensen 1968) — the CAPM intercept: the average return left over
 *     after paying for the market risk taken. Regress excess return on excess benchmark
 *     return, `rₜ − rf = α + β·(mₜ − rf) + εₜ`; `α` is the skill the benchmark can't
 *     explain.
 *   - `treynorRatio` (Treynor 1965) — mean excess return per unit of *systematic* risk
 *     (β), not total volatility. The reward-to-beta counterpart of Sharpe.
 *   - `trackingError` — the sample standard deviation of the active return `rₜ − mₜ`:
 *     how tightly the stream hugs its benchmark.
 *   - `informationRatio` (Grinold & Kahn) — mean active return divided by tracking
 *     error: active reward per unit of active risk. The headline number for judging a
 *     manager against a benchmark.
 *
 * β is the OLS slope `Σ(rₜ−r̄)(mₜ−m̄) / Σ(mₜ−m̄)²`; tracking error uses the sample
 * standard deviation (ddof = 1). The two series are paired by index and truncated to
 * their common length. Pass simple per-period returns. Everything is dependency-free.
 */

function mean(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** OLS slope β = Σ(x−x̄)(y−ȳ) / Σ(y−ȳ)²; NaN if the benchmark has zero variance. */
function slope(x: readonly number[], y: readonly number[]): number {
  const mx = mean(x);
  const my = mean(y);
  let cov = 0;
  let varY = 0;
  for (let i = 0; i < x.length; i++) {
    cov += (x[i] - mx) * (y[i] - my);
    varY += (y[i] - my) * (y[i] - my);
  }
  if (!(varY > 0)) return NaN;
  return cov / varY;
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

/** Pair two series by index over their common length. */
function align(
  a: readonly number[],
  b: readonly number[],
): { x: number[]; y: number[] } {
  const n = Math.min(a.length, b.length);
  return { x: a.slice(0, n), y: b.slice(0, n) };
}

/**
 * Jensen's alpha (per period): the CAPM regression intercept
 * `mean(r − rf) − β·mean(m − rf)`, with β the beta of the returns to the benchmark and
 * `riskFree` the per-period risk-free rate. A positive alpha is benchmark-beating
 * return not explained by market exposure. Returns `NaN` for fewer than two paired
 * points or a zero-variance benchmark. Pass simple per-period returns.
 */
export function jensensAlpha(
  returns: readonly number[],
  benchmark: readonly number[],
  riskFree = 0,
): number {
  const { x, y } = align(returns, benchmark);
  if (x.length < 2) return NaN;
  const beta = slope(x, y);
  if (Number.isNaN(beta)) return NaN;
  const excessR = x.map((r) => r - riskFree);
  const excessM = y.map((m) => m - riskFree);
  return mean(excessR) - beta * mean(excessM);
}

/**
 * Treynor ratio (per period): mean excess return divided by beta — reward per unit of
 * systematic (market) risk rather than total volatility. Returns `NaN` for fewer than
 * two paired points, a zero-variance benchmark, or a zero beta. Pass simple per-period returns.
 */
export function treynorRatio(
  returns: readonly number[],
  benchmark: readonly number[],
  riskFree = 0,
): number {
  const { x, y } = align(returns, benchmark);
  if (x.length < 2) return NaN;
  const beta = slope(x, y);
  if (!Number.isFinite(beta) || beta === 0) return NaN;
  const excessR = x.map((r) => r - riskFree);
  return mean(excessR) / beta;
}

/**
 * Tracking error: the sample standard deviation (ddof = 1) of the active return
 * `rₜ − mₜ` — how far the stream typically drifts from its benchmark per period.
 * Returns `NaN` for fewer than two paired points. Pass simple per-period returns.
 */
export function trackingError(
  returns: readonly number[],
  benchmark: readonly number[],
): number {
  const { x, y } = align(returns, benchmark);
  if (x.length < 2) return NaN;
  const active = x.map((r, i) => r - y[i]);
  return sampleStd(active);
}

/**
 * Information ratio: mean active return `mean(rₜ − mₜ)` divided by the tracking error —
 * active reward per unit of active risk, the standard measure of skill relative to a
 * benchmark. Returns `NaN` for fewer than two paired points or a zero tracking error.
 * Pass simple per-period returns.
 */
export function informationRatio(
  returns: readonly number[],
  benchmark: readonly number[],
): number {
  const { x, y } = align(returns, benchmark);
  if (x.length < 2) return NaN;
  const active = x.map((r, i) => r - y[i]);
  const te = sampleStd(active);
  if (!(te > 0)) return NaN;
  return mean(active) / te;
}
