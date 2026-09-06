/**
 * Downside covariance and correlation matrices — the crash-correlation half of
 * the covariance matrix, for a whole book of assets.
 *
 * `semicovariance.ts` splits the realized covariance of *two* series by the sign
 * of their returns. This lifts the joint-downside piece to a full N×N matrix:
 * for every pair it keeps only the days both assets fell,
 *
 *   D_ij = Σ min(xᵢ,ₜ, 0) · min(xⱼ,ₜ, 0)
 *
 * — the concordant-negative (both-down) component of the Bollerslev, Li, Patton
 * & Quaedvlieg (2020) decomposition. The diagonal `D_ii = Σ min(xᵢ,0)²` is asset
 * i's downside semivariance (see `semivar.ts`), so normalizing gives a downside
 * *correlation* matrix. Its off-diagonal average is a single, monitorable read
 * on how tightly a book is bound together on the way down — the &ldquo;correlations
 * go to one in a crisis&rdquo; effect turned into a number.
 *
 * All series are paired by index and truncated to their common length, so align
 * them to the same sampling grid first. An empty input returns an empty matrix.
 */

/** Common length across every series (0 if none). */
function commonLength(series: readonly (readonly number[])[]): number {
  if (series.length === 0) return 0;
  let t = Infinity;
  for (const s of series) t = Math.min(t, s.length);
  return t === Infinity ? 0 : t;
}

/**
 * N×N downside covariance matrix: entry `[i][j]` is the joint-downside
 * covariance `Σ min(xᵢ,0)·min(xⱼ,0)` over the two series' common length — the
 * both-down component of realized semicovariance. Symmetric and positive
 * semidefinite; the diagonal is each asset's downside semivariance. Returns `[]`
 * for empty input.
 */
export function downsideCovarianceMatrix(
  series: readonly (readonly number[])[],
): number[][] {
  const n = series.length;
  const t = commonLength(series);
  const m: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  // negative parts, precomputed
  const neg: number[][] = series.map((s) => {
    const out = new Array<number>(t);
    for (let k = 0; k < t; k++) out[k] = s[k] < 0 ? s[k] : 0;
    return out;
  });
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < t; k++) sum += neg[i][k] * neg[j][k];
      m[i][j] = sum;
      m[j][i] = sum;
    }
  }
  return m;
}

/**
 * N×N downside correlation matrix: the downside covariance matrix normalized by
 * the square root of its diagonal, `D_ij / √(D_ii · D_jj)`. The diagonal is 1
 * (or `NaN` for an asset with no downside variance). Any pair involving a
 * zero-downside asset is `NaN`. Returns `[]` for empty input.
 */
export function downsideCorrelationMatrix(
  series: readonly (readonly number[])[],
): number[][] {
  const d = downsideCovarianceMatrix(series);
  const n = d.length;
  const r: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(NaN));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const denom = d[i][i] * d[j][j];
      r[i][j] = denom > 0 ? d[i][j] / Math.sqrt(denom) : NaN;
    }
  }
  return r;
}

/**
 * Average off-diagonal downside correlation: the mean of the upper-triangle
 * entries of the downside correlation matrix — one number for how correlated a
 * book is on the way down. `NaN` pairs (zero-downside assets) are skipped;
 * returns `NaN` when no valid pair exists (fewer than two assets, or none share
 * downside variance).
 */
export function averageDownsideCorrelation(
  series: readonly (readonly number[])[],
): number {
  const r = downsideCorrelationMatrix(series);
  const n = r.length;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!Number.isNaN(r[i][j])) {
        sum += r[i][j];
        count++;
      }
    }
  }
  return count === 0 ? NaN : sum / count;
}
