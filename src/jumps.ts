/**
 * Jump detection via bipower variation (Barndorff-Nielsen & Shephard, 2004/2006).
 *
 * Realized variance (RV = Σ rᵢ²) mixes two very different kinds of risk: the
 * continuous diffusion of price, and discrete jumps. Bipower variation (BV)
 * estimates only the *continuous* part — multiplying adjacent absolute returns
 * is robust to a lone large jump (a jump inflates one return but is paired with
 * a small neighbour). The difference RV − BV isolates the jump contribution.
 *
 *   BV = (π/2) · Σᵢ |rᵢ₋₁| · |rᵢ|
 *   jump variation = max(RV − BV, 0)
 *
 * Each function takes a return series and returns a non-negative number; the
 * relative jump is the share of realized variance attributable to jumps, in
 * [0, 1].
 */

// 1 / μ₁² where μ₁ = E[|Z|] = √(2/π) for Z ~ N(0,1); 1/μ₁² = π/2.
const MU1_INV_SQ = Math.PI / 2;

/** Realized variance Σ rᵢ² (local helper). */
function realizedVar(returns: readonly number[]): number {
  let s = 0;
  for (const r of returns) s += r * r;
  return s;
}

/**
 * Bipower variation: (π/2) · Σ |rᵢ₋₁||rᵢ|. A jump-robust estimate of the
 * continuous (diffusive) part of realized variance. Returns 0 for fewer than
 * two returns.
 */
export function bipowerVariation(returns: readonly number[]): number {
  const n = returns.length;
  if (n < 2) return 0;
  let s = 0;
  for (let i = 1; i < n; i++) s += Math.abs(returns[i - 1]) * Math.abs(returns[i]);
  return MU1_INV_SQ * s;
}

/**
 * Jump variation: max(RV − BV, 0), the part of realized variance attributable
 * to discrete jumps. Returns 0 for fewer than two returns.
 */
export function jumpVariation(returns: readonly number[]): number {
  if (returns.length < 2) return 0;
  const j = realizedVar(returns) - bipowerVariation(returns);
  return j > 0 ? j : 0;
}

/**
 * Relative jump: jump variation as a share of realized variance, in [0, 1].
 * Returns 0 when realized variance is 0 or there are fewer than two returns.
 */
export function relativeJumpVariation(returns: readonly number[]): number {
  if (returns.length < 2) return 0;
  const total = realizedVar(returns);
  if (total === 0) return 0;
  const j = total - bipowerVariation(returns);
  return j > 0 ? j / total : 0;
}
