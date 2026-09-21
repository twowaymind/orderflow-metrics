/**
 * Augmented Dickey-Fuller unit-root test — is a series a random walk, or does it revert?
 *
 * The whole edifice of mean-reversion / pairs trading rests on one question: is the
 * spread *stationary* (shocks decay, it comes back) or does it have a *unit root* (shocks
 * are permanent, it wanders off)? `meanrev` measures the reversion speed assuming the
 * former; this tests whether the former even holds. The ADF test (Dickey & Fuller 1979;
 * Said & Dickey 1984 for the augmentation) regresses
 *
 *     Δyₜ = α + γ·yₜ₋₁ + Σᵢ δᵢ·Δyₜ₋ᵢ  ( + β·t for the trend spec )
 *
 * and reads the t-statistic on γ. Under the unit-root null γ = 0 that t-statistic does
 * *not* follow a normal or Student distribution, so it is compared to Dickey-Fuller
 * critical values, not the usual ones. A statistic below the critical value (a small
 * p-value) rejects the unit root: the series is stationary / mean-reverting. The `lags`
 * (the augmentation) soak up serial correlation in Δy so the test stays valid on real,
 * autocorrelated data.
 *
 * `regression` picks the deterministic terms: `"c"` (constant — the default, for a series
 * reverting to a non-zero level, e.g. a price spread) or `"ct"` (constant + linear trend,
 * for a series reverting around a drift). The p-value and critical values use MacKinnon's
 * (1994, 2010) response-surface approximations; the p-value's normal CDF reuses the
 * dependency-free `standardNormalCdf` — no statistics library. Verified against
 * `statsmodels.tsa.stattools.adfuller` to ~1e-13 on the statistic and exactly on the
 * critical values.
 */

import { standardNormalCdf } from "./vpin.ts";

/** Deterministic-term specification for the ADF regression. */
export type AdfRegression = "c" | "ct";

/** Result of an Augmented Dickey-Fuller unit-root test. */
export interface AdfResult {
  /** ADF t-statistic on the lagged level coefficient γ. */
  statistic: number;
  /** MacKinnon approximate p-value; a small value rejects the unit root (⇒ stationary). */
  pValue: number;
  /** Number of lagged differences included (the augmentation order). */
  usedLag: number;
  /** Number of observations in the ADF regression. */
  nobs: number;
  /** Dickey-Fuller critical values at the 1%, 5% and 10% levels. */
  criticalValues: { "1%": number; "5%": number; "10%": number };
  /** The deterministic-term specification used. */
  regression: AdfRegression;
}

const NAN_RESULT: AdfResult = {
  statistic: NaN,
  pValue: NaN,
  usedLag: NaN,
  nobs: NaN,
  criticalValues: { "1%": NaN, "5%": NaN, "10%": NaN },
  regression: "c",
};

// MacKinnon coefficient tables (N = 1 single I(1) variable), from statsmodels' adfvalues.
// `smallp`/`largep`: p-value polynomials (increasing power). `crit`: 2010 critical-value
// response surfaces for [1%, 5%, 10%], each a polynomial in 1/nobs (increasing power).
interface MacKinnonTable {
  max: number;
  min: number;
  star: number;
  smallp: number[];
  largep: number[];
  crit: [number[], number[], number[]];
}

const TABLES: Record<AdfRegression, MacKinnonTable> = {
  c: {
    max: 2.74,
    min: -18.83,
    star: -1.61,
    smallp: [2.1659, 1.4412, 0.038269],
    largep: [1.7339, 0.93202, -0.12745, -0.010368],
    crit: [
      [-3.43035, -6.5393, -16.786, -79.433],
      [-2.86154, -2.8903, -4.234, -40.04],
      [-2.56677, -1.5384, -2.809, 0.0],
    ],
  },
  ct: {
    max: 0.7,
    min: -16.18,
    star: -2.89,
    smallp: [3.2512, 1.6047, 0.049588],
    largep: [2.5261, 0.61654, -0.37956, -0.060285],
    crit: [
      [-3.95877, -9.0531, -28.428, -134.155],
      [-3.41049, -4.3904, -9.036, -45.374],
      [-3.12705, -2.5856, -3.925, -22.38],
    ],
  },
};

/** MacKinnon (1994) approximate p-value of an ADF t-statistic. */
function mackinnonP(stat: number, reg: AdfRegression): number {
  const t = TABLES[reg];
  if (stat > t.max) return 1;
  if (stat < t.min) return 0;
  const coef = stat <= t.star ? t.smallp : t.largep;
  let val = 0;
  for (let i = 0; i < coef.length; i++) val += coef[i] * stat ** i;
  return standardNormalCdf(val);
}

/** MacKinnon (2010) critical values [1%, 5%, 10%] for `nobs` observations. */
function mackinnonCrit(reg: AdfRegression, nobs: number): [number, number, number] {
  const inv = 1 / nobs;
  return TABLES[reg].crit.map((row) => {
    let v = 0;
    for (let i = 0; i < row.length; i++) v += row[i] * inv ** i;
    return v;
  }) as [number, number, number];
}

/** Invert a small square matrix by Gauss-Jordan elimination; `null` if singular. */
function invert(a: number[][]): number[][] | null {
  const n = a.length;
  const m = a.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    if (Math.abs(m[piv][c]) < 1e-14) return null;
    [m[c], m[piv]] = [m[piv], m[c]];
    const d = m[c][c];
    for (let k = 0; k < 2 * n; k++) m[c][k] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c];
      for (let k = 0; k < 2 * n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row) => row.slice(n));
}

/**
 * Augmented Dickey-Fuller test for a unit root in `series`. `lags` is the augmentation
 * order — the number of lagged differences Δyₜ₋ᵢ added to absorb serial correlation
 * (0 = the plain Dickey-Fuller test). `regression` is `"c"` (constant, default) or `"ct"`
 * (constant + linear trend). Returns the ADF t-statistic on the lagged level, its
 * MacKinnon p-value (small ⇒ reject the unit root ⇒ stationary / mean-reverting), the
 * critical values, and the regression's observation count. Returns `NaN` for `lags < 0`
 * or a series too short to fit the regression (`nobs` must exceed the parameter count).
 */
export function augmentedDickeyFuller(
  series: readonly number[],
  lags = 0,
  regression: AdfRegression = "c",
): AdfResult {
  const L = Math.floor(lags);
  if (L < 0 || (regression !== "c" && regression !== "ct")) return { ...NAN_RESULT };
  const N = series.length;
  const nobs = N - 1 - L;
  // regressors: level lag + L diff lags + deterministic terms (1 for "c", 2 for "ct")
  const k = 1 + L + (regression === "ct" ? 2 : 1);
  if (nobs <= k) return { ...NAN_RESULT };

  // first difference
  const dx = new Array<number>(N - 1);
  for (let i = 0; i < N - 1; i++) dx[i] = series[i + 1] - series[i];

  // design matrix X (nobs × k) and dependent vector y (Δyₜ)
  const y = new Array<number>(nobs);
  const X: number[][] = Array.from({ length: nobs }, () => new Array<number>(k));
  for (let j = 0; j < nobs; j++) {
    y[j] = dx[L + j];
    X[j][0] = series[L + j]; // yₜ₋₁ (lagged level) — column whose t-stat is the ADF statistic
    for (let i = 1; i <= L; i++) X[j][i] = dx[L - i + j]; // Δyₜ₋ᵢ
    X[j][1 + L] = 1; // constant
    if (regression === "ct") X[j][2 + L] = j + 1; // linear trend
  }

  // normal equations: XᵀX (k×k) and Xᵀy (k)
  const XtX: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const Xty = new Array<number>(k).fill(0);
  for (let j = 0; j < nobs; j++) {
    for (let a = 0; a < k; a++) {
      Xty[a] += X[j][a] * y[j];
      for (let b = 0; b < k; b++) XtX[a][b] += X[j][a] * X[j][b];
    }
  }
  const inv = invert(XtX);
  if (inv === null) return { ...NAN_RESULT };

  // β = (XᵀX)⁻¹Xᵀy
  const beta = new Array<number>(k).fill(0);
  for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) beta[a] += inv[a][b] * Xty[b];

  // residual variance σ² = SSR / (nobs − k)
  let ssr = 0;
  for (let j = 0; j < nobs; j++) {
    let fit = 0;
    for (let a = 0; a < k; a++) fit += X[j][a] * beta[a];
    const e = y[j] - fit;
    ssr += e * e;
  }
  const sigma2 = ssr / (nobs - k);
  const se0 = Math.sqrt(sigma2 * inv[0][0]);
  const statistic = beta[0] / se0;
  const [c1, c5, c10] = mackinnonCrit(regression, nobs);

  return {
    statistic,
    pValue: mackinnonP(statistic, regression),
    usedLag: L,
    nobs,
    criticalValues: { "1%": c1, "5%": c5, "10%": c10 },
    regression,
  };
}
