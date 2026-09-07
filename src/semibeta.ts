/**
 * Realized semibetas — the four-way sign decomposition of market beta.
 *
 * Realized beta (`covariance.ts`) is the uncentered ratio Σ aᵢmᵢ / Σ mᵢ². Every
 * cross-product aᵢmᵢ carries a sign that depends on *which way each series moved*:
 * both up, both down, or opposite directions. Bollerslev, Patton & Quaedvlieg
 * (2022), "Realized semibetas: Disentangling 'good' and 'bad' downside risks"
 * (Journal of Financial Economics 144, 227–246), split the sum into those four
 * regions, each normalized by the market's realized variance RVₘ = Σ mᵢ²:
 *
 *   β^P  = Σ aᵢ⁺mᵢ⁺ / RVₘ    both up      — "good" upside co-movement
 *   β^N  = Σ aᵢ⁻mᵢ⁻ / RVₘ    both down    — "bad" downside co-movement (priced)
 *   β^M⁺ = −Σ aᵢ⁻mᵢ⁺ / RVₘ   market up, asset down    (a mixed, hedging term)
 *   β^M⁻ = −Σ aᵢ⁺mᵢ⁻ / RVₘ   market down, asset up     (a mixed, hedging term)
 *
 * where x⁺ = max(x,0) and x⁻ = min(x,0). All four are non-negative (the concordant
 * products are positive; the mixed products are negative, so their sums are negated).
 * They reconstruct realized beta exactly:
 *
 *   β = β^P + β^N − β^M⁺ − β^M⁻
 *
 * BPQ show it is β^N — co-movement when both the asset and the market fall — that
 * commands a risk premium, while β^P does not, and the two mixed semibetas earn a
 * *negative* premium (they behave like hedges). Unlike the conditional down-market
 * beta in `downsidebeta.ts` (Ang-Chen-Xing, demeaned within the down subset), these
 * are uncentered and additive, and condition on the signs of *both* series.
 *
 * Series are paired by index over their common length (align to the same grid
 * first). When RVₘ = 0 every semibeta is 0, preserving the reconstruction.
 */

/** The four realized semibetas of an asset against a market. All ≥ 0. */
export interface Semibetas {
  /** β^P — both asset and market up (concordant positive). */
  concordantPositive: number;
  /** β^N — both asset and market down (concordant negative); the priced "bad" beta. */
  concordantNegative: number;
  /** β^M⁺ — market up, asset down (mixed, factor positive). */
  mixedMarketUp: number;
  /** β^M⁻ — market down, asset up (mixed, factor negative). */
  mixedMarketDown: number;
}

const pos = (x: number): number => (x > 0 ? x : 0);
const neg = (x: number): number => (x < 0 ? x : 0);

/**
 * The four realized semibetas of `asset` against `market` (Bollerslev, Patton &
 * Quaedvlieg 2022). Each is non-negative and normalized by the market's realized
 * variance; together they satisfy
 * `β = concordantPositive + concordantNegative − mixedMarketUp − mixedMarketDown`,
 * where `β` is `realizedBeta`. Returns all zeros when the market has zero realized
 * variance (or the input is empty).
 */
export function realizedSemibetas(
  asset: readonly number[],
  market: readonly number[],
): Semibetas {
  const n = Math.min(asset.length, market.length);
  let cP = 0;
  let cN = 0;
  let mUp = 0;
  let mDown = 0;
  let rvM = 0;
  for (let i = 0; i < n; i++) {
    const a = asset[i];
    const m = market[i];
    rvM += m * m;
    cP += pos(a) * pos(m);
    cN += neg(a) * neg(m);
    mUp += neg(a) * pos(m); // market up, asset down → ≤ 0
    mDown += pos(a) * neg(m); // market down, asset up → ≤ 0
  }
  if (rvM === 0) {
    return { concordantPositive: 0, concordantNegative: 0, mixedMarketUp: 0, mixedMarketDown: 0 };
  }
  return {
    concordantPositive: cP / rvM,
    concordantNegative: cN / rvM,
    mixedMarketUp: -mUp / rvM + 0, // + 0 normalizes −0 to 0
    mixedMarketDown: -mDown / rvM + 0,
  };
}

/**
 * Downside semibeta β^N: the "bad" component where the asset and the market fall
 * together (Σ aᵢ⁻mᵢ⁻ / RVₘ). This is the semibeta BPQ (2022) find carries a
 * positive risk premium. Returns 0 when the market has zero realized variance.
 */
export function downsideSemibeta(
  asset: readonly number[],
  market: readonly number[],
): number {
  return realizedSemibetas(asset, market).concordantNegative;
}

/**
 * Semibeta asymmetry `β^N − β^P`: how much more the asset co-moves with the market
 * when both fall than when both rise. Positive = the priced downside skew in an
 * asset's market exposure. Zero when the market has zero realized variance.
 */
export function semibetaAsymmetry(
  asset: readonly number[],
  market: readonly number[],
): number {
  const s = realizedSemibetas(asset, market);
  return s.concordantNegative - s.concordantPositive;
}
