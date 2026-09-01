/**
 * Realized semicovariance — Bollerslev, Li, Patton & Quaedvlieg (2020).
 *
 * Realized covariance (Σ xᵢyᵢ, see `covariance.ts`) treats every co-movement the
 * same, whether the two assets rose together, fell together, or moved in
 * opposite directions. But those cases mean very different things for a
 * portfolio: assets crashing *together* is the risk that actually hurts.
 * Realized semicovariance splits the realized covariance by the signs of the two
 * returns into three components that sum back to it:
 *
 *   P (concordant positive) = Σ max(xᵢ,0)·max(yᵢ,0)          — both up
 *   N (concordant negative) = Σ min(xᵢ,0)·min(yᵢ,0)          — both down
 *   M (mixed / discordant)  = Σ [max(xᵢ,0)·min(yᵢ,0) + min(xᵢ,0)·max(yᵢ,0)]
 *
 *   P + N + M = realized covariance   (P ≥ 0, N ≥ 0, M ≤ 0)
 *
 * It is the cross-asset analogue of realized semivariance (`semivar.ts`). The
 * *negative* component `N` — the covariance built purely from joint downside
 * moves — is the one that drives crash correlation and downside beta, and it
 * predicts future covariance better than the mixed part. Series are paired
 * element-wise over their common length, so align them to the same sampling grid
 * first.
 */

/** The three sign-based components of realized covariance; they sum to it. */
export interface Semicovariance {
  /** concordant positive: both returns up — Σ max(x,0)·max(y,0) (≥ 0) */
  positive: number;
  /** concordant negative: both returns down — Σ min(x,0)·min(y,0) (≥ 0) */
  negative: number;
  /** mixed / discordant: opposite-sign returns (≤ 0) */
  mixed: number;
}

/**
 * Realized semicovariance: the sign-decomposition of realized covariance into
 * concordant-positive (both up), concordant-negative (both down), and mixed
 * (opposite signs) parts. The three components sum to `realizedCovariance(x, y)`;
 * `positive` and `negative` are non-negative and `mixed` is non-positive. The
 * `negative` component is joint downside covariance — the crash-risk half. Both
 * empty → all zeros.
 */
export function realizedSemicovariance(
  x: readonly number[],
  y: readonly number[],
): Semicovariance {
  const n = Math.min(x.length, y.length);
  let positive = 0;
  let negative = 0;
  let mixed = 0;
  for (let i = 0; i < n; i++) {
    const xp = x[i] > 0 ? x[i] : 0;
    const xm = x[i] < 0 ? x[i] : 0;
    const yp = y[i] > 0 ? y[i] : 0;
    const ym = y[i] < 0 ? y[i] : 0;
    positive += xp * yp;
    negative += xm * ym;
    mixed += xp * ym + xm * yp;
  }
  return { positive, negative, mixed };
}
