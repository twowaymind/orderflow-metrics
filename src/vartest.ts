/**
 * VaR backtesting — does your Value-at-Risk model actually hold up out of sample?
 *
 * `valueatrisk` produces a VaR forecast; this checks it against what happened. A p%
 * VaR should be breached (the realized loss exceeds the forecast) about p% of the time,
 * and those breaches should be *independent* — scattered, not clustered. Two failures
 * matter: too many (or too few) breaches, and breaches that arrive in bunches (the model
 * is blind to volatility regimes). The Basel backtesting framework is built on exactly
 * these checks.
 *
 *   - `kupiecPOF` (Kupiec 1995) — the proportion-of-failures test of *unconditional
 *     coverage*: are there the right *number* of breaches? Likelihood ratio, χ²(1).
 *   - `christoffersenIndependence` (Christoffersen 1998) — do breaches *cluster*? Tests
 *     the transition counts of the 0/1 breach sequence for serial dependence, χ²(1).
 *   - `christoffersenConditionalCoverage` — the joint test (coverage *and* independence
 *     together), χ²(2). A model can pass the count and still fail here by breaching in
 *     bursts.
 *
 * Feed a breach indicator series: 1 (or `true`) when the period's loss exceeded the VaR
 * forecast, 0 otherwise. `expectedRate` is the model's target breach probability, i.e.
 * `1 − confidence` (0.05 for a 95% VaR). Each test returns its likelihood-ratio
 * statistic and a p-value — a small p-value rejects the model. The χ² p-values use exact
 * closed forms (χ²₁ via the dependency-free `standardNormalCdf`, χ²₂ = e^(−x/2)); no
 * statistics library.
 */

import { standardNormalCdf } from "./vpin.ts";

/** Result of a VaR backtest: the likelihood-ratio statistic and its p-value. */
export interface VarBacktestResult {
  /** Number of breaches (VaR exceedances) observed. */
  exceptions: number;
  /** Number of observations tested. */
  observations: number;
  /** Likelihood-ratio test statistic. */
  statistic: number;
  /** p-value; a small value rejects the model. */
  pValue: number;
}

const NAN_RESULT: VarBacktestResult = {
  exceptions: NaN,
  observations: NaN,
  statistic: NaN,
  pValue: NaN,
};

/** χ² survival function for 1 or 2 degrees of freedom (exact, dependency-free). */
function chiSquareSurvival(x: number, df: 1 | 2): number {
  if (!(x > 0)) return 1;
  if (df === 2) return Math.exp(-x / 2);
  // df === 1: P(χ²₁ > x) = 2·(1 − Φ(√x))
  return 2 * (1 - standardNormalCdf(Math.sqrt(x)));
}

/** c·ln(prob) with the convention 0·ln0 = 0 (and 0 when prob ≤ 0). */
function xln(c: number, prob: number): number {
  return c === 0 || prob <= 0 ? 0 : c * Math.log(prob);
}

const toBreaches = (series: readonly (number | boolean)[]): number[] =>
  series.map((v) => (v ? 1 : 0));

/**
 * Kupiec proportion-of-failures test (1995) of unconditional coverage: are there the
 * right number of VaR breaches for the target rate? `breaches` is the 0/1 (or boolean)
 * exceedance series, `expectedRate` the target breach probability (`1 − confidence`).
 * Returns the likelihood-ratio statistic (χ² with 1 df) and its p-value; a small p-value
 * says the breach *count* is wrong. Returns `NaN` for an empty series or a rate outside
 * (0, 1).
 */
export function kupiecPOF(
  breaches: readonly (number | boolean)[],
  expectedRate: number,
): VarBacktestResult {
  const n = breaches.length;
  if (n === 0 || !(expectedRate > 0 && expectedRate < 1)) return { ...NAN_RESULT };
  const b = toBreaches(breaches);
  let x = 0;
  for (const v of b) x += v;
  const piHat = x / n;
  // LR_uc = 2[ (n-x)·ln((1-π̂)/(1-p)) + x·ln(π̂/p) ], with 0·ln0 = 0
  const term1 = n - x === 0 ? 0 : (n - x) * Math.log((1 - piHat) / (1 - expectedRate));
  const term2 = x === 0 ? 0 : x * Math.log(piHat / expectedRate);
  const statistic = Math.max(0, 2 * (term1 + term2));
  return {
    exceptions: x,
    observations: n,
    statistic,
    pValue: chiSquareSurvival(statistic, 1),
  };
}

/**
 * Christoffersen independence test (1998): do VaR breaches cluster in time? Reads the
 * transition counts of the 0/1 `breaches` sequence and tests whether a breach makes the
 * next-period breach more likely (serial dependence). Returns the likelihood-ratio
 * statistic (χ² with 1 df) and its p-value; a small p-value says breaches are *clustered*,
 * a sign the model misses volatility regimes. Returns `NaN` for fewer than two
 * observations.
 */
export function christoffersenIndependence(
  breaches: readonly (number | boolean)[],
): VarBacktestResult {
  const n = breaches.length;
  if (n < 2) return { ...NAN_RESULT };
  const b = toBreaches(breaches);
  let n00 = 0;
  let n01 = 0;
  let n10 = 0;
  let n11 = 0;
  let x = 0;
  for (const v of b) x += v;
  for (let t = 1; t < n; t++) {
    const prev = b[t - 1];
    const cur = b[t];
    if (prev === 0 && cur === 0) n00++;
    else if (prev === 0 && cur === 1) n01++;
    else if (prev === 1 && cur === 0) n10++;
    else n11++;
  }
  const pi01 = n00 + n01 > 0 ? n01 / (n00 + n01) : 0;
  const pi11 = n10 + n11 > 0 ? n11 / (n10 + n11) : 0;
  const total = n00 + n01 + n10 + n11;
  const piHat = total > 0 ? (n01 + n11) / total : 0;
  const lnNull = xln(n00 + n10, 1 - piHat) + xln(n01 + n11, piHat);
  const lnAlt =
    xln(n00, 1 - pi01) + xln(n01, pi01) + xln(n10, 1 - pi11) + xln(n11, pi11);
  const statistic = Math.max(0, -2 * (lnNull - lnAlt));
  return {
    exceptions: x,
    observations: n,
    statistic,
    pValue: chiSquareSurvival(statistic, 1),
  };
}

/**
 * Christoffersen conditional-coverage test (1998): the joint test of *both* the right
 * breach count and independence, `LR_cc = LR_uc + LR_ind`, χ² with 2 df. A VaR model can
 * pass the Kupiec count and still fail here by breaching in bursts. `breaches` is the 0/1
 * exceedance series, `expectedRate` the target breach probability. Returns the statistic
 * and p-value; a small p-value rejects the model overall. Returns `NaN` for fewer than
 * two observations or a rate outside (0, 1).
 */
export function christoffersenConditionalCoverage(
  breaches: readonly (number | boolean)[],
  expectedRate: number,
): VarBacktestResult {
  const n = breaches.length;
  if (n < 2 || !(expectedRate > 0 && expectedRate < 1)) return { ...NAN_RESULT };
  const uc = kupiecPOF(breaches, expectedRate);
  const ind = christoffersenIndependence(breaches);
  const statistic = uc.statistic + ind.statistic;
  return {
    exceptions: uc.exceptions,
    observations: n,
    statistic,
    pValue: chiSquareSurvival(statistic, 2),
  };
}
