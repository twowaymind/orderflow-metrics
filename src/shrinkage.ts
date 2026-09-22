/**
 * Ledoit-Wolf shrinkage covariance — a covariance matrix you can actually invert.
 *
 * The sample covariance matrix is the obvious estimator and, for portfolio work, a trap.
 * With p assets and only n observations, it has p(p+1)/2 numbers to estimate from n·p
 * data points; when p approaches or exceeds n the matrix becomes ill-conditioned or
 * outright singular, its smallest eigenvalues collapse toward zero, and any optimizer
 * that inverts it (mean-variance weights, risk parity, a Kelly allocation) amplifies that
 * noise into wild, unstable positions. Ledoit &amp; Wolf (2004) fix it by pulling the sample
 * covariance toward a simple, well-conditioned target — a scaled identity μ·I, where
 * μ = trace(S)/p is the average variance — by an amount the data itself chooses:
 *
 *     Σ&#770; = (1 − δ)·S + δ·μ·I
 *
 * The shrinkage intensity δ ∈ [0, 1] is estimated to minimize expected error: noisier or
 * higher-dimensional samples (small n, large p) get pulled harder toward the target,
 * clean low-dimensional ones barely at all. The result is always positive-definite and
 * invertible, with off-diagonal noise damped and eigenvalues pushed away from zero — the
 * standard first step before feeding a covariance to any optimizer.
 *
 * `ledoitWolfShrinkage(observations)` takes `observations` as rows (each row one period's
 * returns across the p assets) and returns the shrunk covariance, the intensity δ, and the
 * target scale μ. Covariances use the maximum-likelihood (divide-by-n) convention, as in
 * the original paper. Dependency-free; matches `sklearn.covariance.ledoit_wolf` to ~1e-15.
 */

/** Result of a Ledoit-Wolf shrinkage covariance estimate. */
export interface ShrinkageCovariance {
  /** The shrunk covariance matrix (p × p), always positive-definite and invertible. */
  covariance: number[][];
  /** Shrinkage intensity δ ∈ [0, 1]: 0 = pure sample covariance, 1 = pure μ·I target. */
  shrinkage: number;
  /** Target scale μ = trace(S)/p, the average sample variance (the identity is μ·I). */
  mu: number;
}

const NAN_RESULT: ShrinkageCovariance = { covariance: [], shrinkage: NaN, mu: NaN };

/**
 * Ledoit-Wolf (2004) shrinkage estimator of a covariance matrix. `observations` is an
 * n × p matrix — n rows, each the p asset returns for one period. `assumeCentered` skips
 * mean subtraction when the data is already known to be mean-zero. Returns the shrunk
 * covariance Σ&#770; = (1 − δ)·S + δ·μ·I (maximum-likelihood, divide-by-n), the estimated
 * shrinkage intensity δ, and the target scale μ = trace(S)/p. With a single asset (p = 1)
 * shrinkage is 0 and the covariance is the sample variance. Returns `NaN` for an empty or
 * ragged input.
 */
export function ledoitWolfShrinkage(
  observations: readonly (readonly number[])[],
  options: { assumeCentered?: boolean } = {},
): ShrinkageCovariance {
  const n = observations.length;
  if (n === 0) return { ...NAN_RESULT };
  const p = observations[0].length;
  if (p === 0) return { ...NAN_RESULT };
  for (const row of observations) if (row.length !== p) return { ...NAN_RESULT };

  // center each column (unless the data is already known to be mean-zero)
  const means = new Array<number>(p).fill(0);
  if (!options.assumeCentered) {
    for (const row of observations) for (let i = 0; i < p; i++) means[i] += row[i];
    for (let i = 0; i < p; i++) means[i] /= n;
  }
  const X: number[][] = observations.map((row) => row.map((v, i) => v - means[i]));

  // sample (MLE) covariance S = XᵀX / n
  const S: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (let k = 0; k < n; k++) {
    const xk = X[k];
    for (let i = 0; i < p; i++) {
      const xki = xk[i];
      const Si = S[i];
      for (let j = 0; j < p; j++) Si[j] += xki * xk[j];
    }
  }
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) S[i][j] /= n;

  let mu = 0;
  for (let i = 0; i < p; i++) mu += S[i][i];
  mu /= p;

  if (p === 1) return { covariance: [[S[0][0]]], shrinkage: 0, mu };

  // beta_ = Σ_{i,j} Σ_k X²ₖᵢ·X²ₖⱼ   (the sum of the entries of (X²)ᵀ(X²))
  let betaRaw = 0;
  {
    const H: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (let k = 0; k < n; k++) {
      const xk = X[k];
      for (let i = 0; i < p; i++) {
        const x2 = xk[i] * xk[i];
        const Hi = H[i];
        for (let j = 0; j < p; j++) Hi[j] += x2 * (xk[j] * xk[j]);
      }
    }
    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) betaRaw += H[i][j];
  }

  // delta_ = Σ_{i,j} S[i][j]²   (since (XᵀX)[i][j] = n·S[i][j], the n² cancels)
  let deltaRaw = 0;
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) deltaRaw += S[i][j] * S[i][j];

  let beta = (betaRaw / n - deltaRaw) / (p * n);
  const delta = (deltaRaw - p * mu * mu) / p; // ‖S − μI‖²_F / p
  beta = Math.min(beta, delta);
  const shrinkage = beta === 0 ? 0 : beta / delta;

  // Σ̂ = (1 − δ)·S + δ·μ·I
  const covariance: number[][] = Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) => {
      const shrunk = (1 - shrinkage) * S[i][j];
      return i === j ? shrunk + shrinkage * mu : shrunk;
    }),
  );

  return { covariance, shrinkage, mu };
}
