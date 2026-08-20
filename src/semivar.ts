/**
 * Realized semivariance and signed jump variation
 * (Barndorff-Nielsen, Kinnebrock & Shephard, 2010; Patton & Shephard, 2015).
 *
 * Realized variance (RV = Σ rᵢ²) treats an up-move and a down-move of equal
 * size as identical risk. But most traders care far more about the downside.
 * Realized semivariance splits RV by the *sign* of each return:
 *
 *   RS⁺ = Σ rᵢ² · 1{rᵢ > 0}   (upside)
 *   RS⁻ = Σ rᵢ² · 1{rᵢ < 0}   (downside)
 *   RS⁺ + RS⁻ = RV            (zero returns contribute to neither)
 *
 * The two halves carry different information: RS⁻ (bad volatility) is the part
 * that predicts future risk and demands a premium, while RS⁺ (good volatility)
 * behaves quite differently. Their difference is the *signed* jump variation,
 * which — unlike ordinary jump variation — keeps the direction of jump risk:
 *
 *   signed jump variation = RS⁺ − RS⁻
 *
 * A positive value means upside moves dominate; a negative value means the
 * series is downside-heavy. Each function takes a return series.
 */

/** Upside / downside decomposition of realized variance. Both are ≥ 0. */
export interface Semivariance {
  /** RS⁺ = Σ rᵢ² over strictly positive returns. */
  upside: number;
  /** RS⁻ = Σ rᵢ² over strictly negative returns. */
  downside: number;
}

/**
 * Realized semivariance: splits realized variance into the sum of squared
 * positive returns (upside) and squared negative returns (downside). Zero
 * returns are ignored, so `upside + downside` equals realized variance. An
 * empty series returns { upside: 0, downside: 0 }.
 */
export function realizedSemivariance(returns: readonly number[]): Semivariance {
  let upside = 0;
  let downside = 0;
  for (const r of returns) {
    if (r > 0) upside += r * r;
    else if (r < 0) downside += r * r;
  }
  return { upside, downside };
}

/**
 * Downside variance ratio: RS⁻ / (RS⁺ + RS⁻), the share of realized variance
 * coming from negative returns, in [0, 1]. Returns 0 when realized variance is
 * 0 (or the series is empty). A value above 0.5 marks a downside-heavy window.
 */
export function downsideVarianceRatio(returns: readonly number[]): number {
  const { upside, downside } = realizedSemivariance(returns);
  const total = upside + downside;
  return total > 0 ? downside / total : 0;
}

/**
 * Signed jump variation: RS⁺ − RS⁻ (Patton & Shephard, 2015). Positive when
 * upside moves dominate, negative when downside moves dominate; unlike jump
 * variation it can take either sign. Returns 0 for an empty series.
 */
export function signedJumpVariation(returns: readonly number[]): number {
  const { upside, downside } = realizedSemivariance(returns);
  return upside - downside;
}
