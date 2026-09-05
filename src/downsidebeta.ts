/**
 * Downside and upside beta — conditional, sign-asymmetric market sensitivity.
 *
 * Ordinary (realized) beta averages an asset's co-movement with the market over
 * all days — but the co-movement that gets *priced* is the one on the way down.
 * Ang, Chen & Xing (2006), "Downside Risk", split beta by the sign of the
 * market return:
 *
 *   β⁻ = Cov(rᵢ, r_m | r_m < 0) / Var(r_m | r_m < 0)   — down-market beta
 *   β⁺ = Cov(rᵢ, r_m | r_m > 0) / Var(r_m | r_m > 0)   — up-market beta
 *
 * Each is an ordinary regression beta computed only over the periods where the
 * market moved the relevant way (covariance and variance both demeaned within
 * that subset — this is a *conditional* beta, not the uncentered `realizedBeta`
 * in `covariance.ts`). An asset with β⁻ > β⁺ tightens its grip on the market
 * exactly when the market falls: the downside-risk asymmetry investors demand a
 * premium for. `betaAsymmetry` is that gap, β⁻ − β⁺.
 *
 * Returns exceed their common length are ignored; the series are paired by index
 * (align them to the same market first). Returns `NaN` when a side has fewer
 * than two qualifying periods or zero conditional market variance.
 */

/** Ordinary regression beta over the periods where the market has the wanted sign. */
function conditionalBeta(
  asset: readonly number[],
  market: readonly number[],
  wantPositive: boolean,
): number {
  const n = Math.min(asset.length, market.length);
  const a: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n; i++) {
    if (wantPositive ? market[i] > 0 : market[i] < 0) {
      a.push(asset[i]);
      m.push(market[i]);
    }
  }
  const k = m.length;
  if (k < 2) return NaN;

  let meanA = 0;
  let meanM = 0;
  for (let i = 0; i < k; i++) {
    meanA += a[i];
    meanM += m[i];
  }
  meanA /= k;
  meanM /= k;

  let cov = 0;
  let varM = 0;
  for (let i = 0; i < k; i++) {
    const dm = m[i] - meanM;
    cov += (a[i] - meanA) * dm;
    varM += dm * dm;
  }
  return varM === 0 ? NaN : cov / varM;
}

/**
 * Downside beta: the asset's regression beta computed only over days the market
 * fell (`market < 0`) — Ang, Chen & Xing (2006). `NaN` for fewer than two
 * down-market days or zero conditional market variance.
 */
export function downsideBeta(
  asset: readonly number[],
  market: readonly number[],
): number {
  return conditionalBeta(asset, market, false);
}

/**
 * Upside beta: the asset's regression beta computed only over days the market
 * rose (`market > 0`). `NaN` for fewer than two up-market days or zero
 * conditional market variance.
 */
export function upsideBeta(
  asset: readonly number[],
  market: readonly number[],
): number {
  return conditionalBeta(asset, market, true);
}

/**
 * Beta asymmetry `β⁻ − β⁺`: how much more the asset co-moves with the market on
 * the way down than on the way up. Positive = extra downside sensitivity (the
 * priced kind). `NaN` if either conditional beta is undefined.
 */
export function betaAsymmetry(
  asset: readonly number[],
  market: readonly number[],
): number {
  return downsideBeta(asset, market) - upsideBeta(asset, market);
}
