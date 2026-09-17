/**
 * The Lo-MacKinlay variance-ratio test — a formal test of the random-walk hypothesis.
 *
 * `varianceRatio` (in the efficiency module) reports the ratio itself; this is the test
 * around it. Lo & MacKinlay (1988), "Stock Market Prices Do Not Follow Random Walks:
 * Evidence from a Simple Specification Test" (Review of Financial Studies 1(1), 41–66),
 * ask whether that ratio is far enough from 1 to reject a random walk.
 *
 * If returns are a random walk, the variance of a q-period return is exactly q times the
 * variance of a one-period return, so the variance ratio
 *
 *   VR(q) = σ²(q) / (q · σ²(1))
 *
 * is 1. VR > 1 signals positive autocorrelation (trending / momentum); VR < 1 signals
 * mean reversion. The test standardizes `VR(q) − 1` into a z-statistic that is
 * asymptotically standard normal under the null:
 *
 *   z(q) = √n · (VR(q) − 1) / √θ(q)
 *
 * with two variants of θ. The homoskedastic form (`zStatistic`) assumes constant
 * variance, `θ = 2(2q−1)(q−1)/(3q)`. The heteroskedasticity-robust form
 * (`robustZStatistic`) — the one to trust on real returns, whose volatility clusters —
 * replaces θ with a sum of autocorrelation-weighted return-square products, so a
 * rejection reflects genuine serial dependence rather than changing volatility. Each
 * comes with a two-sided p-value.
 *
 * Uses the overlapping, bias-corrected estimator of Lo & MacKinlay (matching the
 * standard implementation), and the dependency-free `standardNormalCdf` from `vpin` for
 * the p-values. Pass log returns; `q ≥ 2`.
 */

import { standardNormalCdf } from "./vpin.ts";

/** Result of the Lo-MacKinlay variance-ratio test at a given aggregation `q`. */
export interface VarianceRatioResult {
  /** The variance ratio VR(q); 1 under a random walk, >1 trending, <1 mean-reverting. */
  ratio: number;
  /** Homoskedastic z-statistic (assumes constant variance). */
  zStatistic: number;
  /** Heteroskedasticity-robust z-statistic (the one to trust on real returns). */
  robustZStatistic: number;
  /** Two-sided p-value for `zStatistic`. */
  pValue: number;
  /** Two-sided p-value for `robustZStatistic`. */
  robustPValue: number;
}

const NAN_RESULT: VarianceRatioResult = {
  ratio: NaN,
  zStatistic: NaN,
  robustZStatistic: NaN,
  pValue: NaN,
  robustPValue: NaN,
};

const twoSided = (z: number): number =>
  Number.isNaN(z) ? NaN : 2 - 2 * standardNormalCdf(Math.abs(z));

/**
 * Lo-MacKinlay variance-ratio test at aggregation `q` (default 2). Returns the variance
 * ratio plus the homoskedastic and heteroskedasticity-robust z-statistics and their
 * two-sided p-values, using the overlapping bias-corrected estimator. A ratio near 1
 * (large p-value) is consistent with a random walk; a small p-value rejects it, with the
 * ratio's side telling you momentum (>1) or mean reversion (<1). Returns all `NaN` for
 * `q < 2`, fewer than `q + 1` returns, or a zero-variance series. Pass log returns.
 */
export function varianceRatioTest(
  returns: readonly number[],
  q = 2,
): VarianceRatioResult {
  const nq = returns.length;
  if (!Number.isInteger(q) || q < 2 || nq <= q) return { ...NAN_RESULT };

  let mu = 0;
  for (const r of returns) mu += r;
  mu /= nq;

  // one-period variance (debiased, ddof = 1)
  let s1 = 0;
  for (const r of returns) s1 += (r - mu) * (r - mu);
  const sigma2_1 = s1 / (nq - 1);
  if (!(sigma2_1 > 0)) return { ...NAN_RESULT };

  // overlapping q-period returns via a cumulative-sum level series
  const level = new Array(nq + 1);
  level[0] = 0;
  for (let i = 0; i < nq; i++) level[i + 1] = level[i] + returns[i];
  let sq = 0;
  for (let t = q; t <= nq; t++) {
    const dyq = level[t] - level[t - q];
    const e = dyq - q * mu;
    sq += e * e;
  }
  const m = q * (nq - q + 1) * (1 - q / nq);
  const sigma2_q = sq / m; // == (sq / (nq*q)) * (nq*q) / m
  const ratio = sigma2_q / sigma2_1;

  // homoskedastic variance
  const thetaHomo = (2 * (2 * q - 1) * (q - 1)) / (3 * q);
  const zStatistic = (Math.sqrt(nq) * (ratio - 1)) / Math.sqrt(thetaHomo);

  // heteroskedasticity-robust variance
  const z2 = returns.map((r) => (r - mu) * (r - mu));
  let scale = 0;
  for (const v of z2) scale += v;
  scale = scale * scale;
  let thetaRobust = 0;
  for (let k = 1; k < q; k++) {
    let acc = 0;
    for (let t = k; t < nq; t++) acc += z2[t] * z2[t - k];
    const delta = (nq * acc) / scale;
    thetaRobust += 4 * (1 - k / q) * (1 - k / q) * delta;
  }
  const robustZStatistic =
    thetaRobust > 0 ? (Math.sqrt(nq) * (ratio - 1)) / Math.sqrt(thetaRobust) : NaN;

  return {
    ratio,
    zStatistic,
    robustZStatistic,
    pValue: twoSided(zStatistic),
    robustPValue: twoSided(robustZStatistic),
  };
}
