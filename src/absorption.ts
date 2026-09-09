/**
 * Absorption ratio — the fraction of total variance a market absorbs into its
 * leading principal components (Kritzman, Li, Page & Rigobon 2011).
 *
 * A covariance matrix carries the whole cross-section of co-movement. Its
 * eigenvalues say how that variance is distributed across independent directions:
 * a few large eigenvalues mean the market is being driven by a handful of common
 * factors; many comparable eigenvalues mean risk is spread out. Kritzman, Li, Page
 * & Rigobon (2011), "Principal Components as a Measure of Systemic Risk" (Journal of
 * Portfolio Management 37(4), 112–126), turn that into one number:
 *
 *   absorption ratio = ( Σ of the largest k eigenvalues ) / ( Σ of all eigenvalues )
 *
 * It is the share of total variance explained by the top k principal components.
 * A high ratio means the market is tightly coupled — most of its movement collapses
 * onto a few factors, so a shock in one place propagates everywhere; this is the
 * fragile, "correlations → 1" regime that precedes and accompanies crises. A low
 * ratio means risk is diffuse and the system is more resilient. The authors show
 * spikes in the absorption ratio lead drawdowns.
 *
 * Eigenvalues are computed with a dependency-free cyclic Jacobi rotation solver for
 * real symmetric matrices — no linear-algebra library required. The input is any
 * symmetric covariance (or correlation) matrix; build one from return series with
 * the tools in `covariance.ts`, or supply an exponentially-weighted estimate as the
 * original authors do.
 */

/** Off-diagonal sum of squares of the upper triangle — the Jacobi convergence gauge. */
function offDiagonalNorm(a: readonly number[][], n: number): number {
  let s = 0;
  for (let p = 0; p < n; p++) {
    for (let q = p + 1; q < n; q++) s += a[p][q] * a[p][q];
  }
  return s;
}

/**
 * Eigenvalues of a real symmetric matrix, in descending order, via cyclic Jacobi
 * rotations. Dependency-free. The input must be square and symmetric (only the
 * values matter; the matrix is copied, not mutated). Empty input returns `[]`; a
 * 1×1 returns its single entry. Convergence is to full double precision for the
 * small matrices typical of a covariance block.
 */
export function symmetricEigenvalues(matrix: readonly (readonly number[])[]): number[] {
  const n = matrix.length;
  if (n === 0) return [];
  // work on a mutable copy
  const a: number[][] = matrix.map((row) => row.slice());
  if (n === 1) return [a[0][0]];

  const maxSweeps = 100;
  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    if (offDiagonalNorm(a, n) < 1e-300) break;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p][q];
        if (Math.abs(apq) < 1e-300) continue;
        // rotation that zeroes a[p][q]
        const tau = (a[q][q] - a[p][p]) / (2 * apq);
        const t =
          tau === 0 ? 1 : (tau > 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;
        // apply G on the right (columns p, q)
        for (let k = 0; k < n; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        // apply Gᵀ on the left (rows p, q)
        for (let k = 0; k < n; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
      }
    }
  }

  const eigenvalues: number[] = [];
  for (let i = 0; i < n; i++) eigenvalues.push(a[i][i]);
  eigenvalues.sort((x, y) => y - x);
  return eigenvalues;
}

/** Default number of components: a fifth of the assets, as in Kritzman et al. (2011). */
function defaultComponents(n: number): number {
  return Math.max(1, Math.round(n / 5));
}

/**
 * Absorption ratio: the fraction of a covariance matrix's total variance captured
 * by its largest `numComponents` eigenvalues (Kritzman, Li, Page & Rigobon 2011).
 * In `[0, 1]` for a positive-semidefinite covariance. A rising ratio signals a
 * market collapsing onto fewer factors — tightly coupled and fragile.
 *
 * `numComponents` defaults to a fifth of the assets (their convention), rounded and
 * floored at 1; any value is clamped to `[1, n]`. Returns `NaN` for an empty matrix
 * or one whose eigenvalues sum to zero (no variance to absorb).
 */
export function absorptionRatio(
  covariance: readonly (readonly number[])[],
  numComponents?: number,
): number {
  const n = covariance.length;
  if (n === 0) return NaN;
  const k = Math.min(n, Math.max(1, Math.round(numComponents ?? defaultComponents(n))));
  const eigenvalues = symmetricEigenvalues(covariance); // descending
  let total = 0;
  for (const e of eigenvalues) total += e;
  if (total === 0) return NaN;
  let top = 0;
  for (let i = 0; i < k; i++) top += eigenvalues[i];
  return top / total;
}
