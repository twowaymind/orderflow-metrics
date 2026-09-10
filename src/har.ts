/**
 * HAR-RV — the Heterogeneous Autoregressive model of Realized Volatility
 * (Corsi 2009).
 *
 * Realized volatility is persistent: a volatile day is followed by volatile days,
 * and the memory decays slowly. Corsi (2009), "A Simple Approximate Long-Memory
 * Model of Realized Volatility" (Journal of Financial Econometrics 7(2), 174–196),
 * captures that long memory without any fractional-integration machinery. It
 * regresses tomorrow's realized variance on three averages of the past — a *daily*
 * term (yesterday), a *weekly* term (the last 5), and a *monthly* term (the last
 * 22) — each standing in for a class of market participant acting on a different
 * horizon:
 *
 *   RVₜ₊₁ = β₀ + β_d·RVₜ^(d) + β_w·RVₜ^(w) + β_m·RVₜ^(m) + εₜ
 *
 * where RVₜ^(d) = RVₜ, RVₜ^(w) = mean(RVₜ₋₄…RVₜ), RVₜ^(m) = mean(RVₜ₋₂₁…RVₜ). Three
 * regressors and an intercept reproduce the slow decay that makes volatility
 * forecastable, and the model is the workhorse benchmark for realized-volatility
 * forecasting. `harForecast` fits it by ordinary least squares over the supplied
 * history and returns the one-step-ahead forecast together with the coefficients;
 * the OLS solve uses a dependency-free Gaussian elimination — no linear-algebra
 * library. Feed a series of per-period realized variances (or volatilities).
 */

/** Window lengths for the weekly and monthly HAR terms. Defaults: 5 and 22. */
export interface HarOptions {
  /** Length of the "weekly" average (default 5). */
  weekly?: number;
  /** Length of the "monthly" average (default 22). */
  monthly?: number;
}

/** The three heterogeneous components of a realized-volatility series. */
export interface HarComponents {
  /** RVₜ^(d) — the most recent observation. */
  daily: number;
  /** RVₜ^(w) — mean of the last `weekly` observations. */
  weekly: number;
  /** RVₜ^(m) — mean of the last `monthly` observations. */
  monthly: number;
}

/** Fitted HAR-RV coefficients and the resulting one-step-ahead forecast. */
export interface HarForecast {
  /** One-step-ahead forecast RV̂ₜ₊₁ from the tail of the series. */
  forecast: number;
  /** Fitted coefficients β₀, β_d, β_w, β_m. */
  coefficients: {
    intercept: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
}

function mean(xs: readonly number[], from: number, to: number): number {
  let s = 0;
  for (let i = from; i <= to; i++) s += xs[i];
  return s / (to - from + 1);
}

/**
 * The latest heterogeneous components of a realized-volatility series: the most
 * recent value (`daily`), the mean of the last `weekly` values, and the mean of the
 * last `monthly` values (Corsi 2009). A window longer than the series averages over
 * whatever is available. Returns all `NaN` for an empty series.
 */
export function harComponents(rv: readonly number[], opts: HarOptions = {}): HarComponents {
  const n = rv.length;
  if (n === 0) return { daily: NaN, weekly: NaN, monthly: NaN };
  const weekly = Math.max(1, Math.floor(opts.weekly ?? 5));
  const monthly = Math.max(1, Math.floor(opts.monthly ?? 22));
  return {
    daily: rv[n - 1],
    weekly: mean(rv, Math.max(0, n - weekly), n - 1),
    monthly: mean(rv, Math.max(0, n - monthly), n - 1),
  };
}

/** Solve A·x = b in place by Gaussian elimination with partial pivoting; null if singular. */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    if (Math.abs(m[piv][c]) < 1e-15) return null;
    [m[c], m[piv]] = [m[piv], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/**
 * Fit the HAR-RV model of Corsi (2009) to a realized-volatility series by ordinary
 * least squares and return the one-step-ahead forecast with the fitted coefficients.
 * Regresses each RVₜ₊₁ on `[1, RVₜ^(d), RVₜ^(w), RVₜ^(m)]` over every date with a
 * full monthly window and a next-day target, then applies the fit to the tail of
 * the series. Needs at least `monthly + 4` observations (four parameters); returns
 * all `NaN` on too little data or a singular design.
 */
export function harForecast(rv: readonly number[], opts: HarOptions = {}): HarForecast {
  const n = rv.length;
  const weekly = Math.max(1, Math.floor(opts.weekly ?? 5));
  const monthly = Math.max(1, Math.floor(opts.monthly ?? 22));
  const nan: HarForecast = {
    forecast: NaN,
    coefficients: { intercept: NaN, daily: NaN, weekly: NaN, monthly: NaN },
  };
  // need enough rows (t from monthly-1 .. n-2) to fit 4 parameters
  if (n < monthly + 4) return nan;

  const X: number[][] = [];
  const y: number[] = [];
  for (let t = monthly - 1; t < n - 1; t++) {
    X.push([
      1,
      rv[t],
      mean(rv, t - weekly + 1, t),
      mean(rv, t - monthly + 1, t),
    ]);
    y.push(rv[t + 1]);
  }

  // normal equations XᵀX β = Xᵀy
  const p = 4;
  const xtx: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const xty: number[] = new Array(p).fill(0);
  for (let r = 0; r < X.length; r++) {
    for (let i = 0; i < p; i++) {
      xty[i] += X[r][i] * y[r];
      for (let j = 0; j < p; j++) xtx[i][j] += X[r][i] * X[r][j];
    }
  }
  const beta = solve(xtx, xty);
  if (beta === null) return nan;

  const c = harComponents(rv, { weekly, monthly });
  const forecast = beta[0] + beta[1] * c.daily + beta[2] * c.weekly + beta[3] * c.monthly;
  return {
    forecast,
    coefficients: { intercept: beta[0], daily: beta[1], weekly: beta[2], monthly: beta[3] },
  };
}
