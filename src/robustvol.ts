/**
 * Jump-robust realized variance and realized quarticity.
 *
 * Plain realized variance (RV = Σ rᵢ²) is inflated by discrete jumps. Like
 * bipower variation, MinRV and MedRV estimate only the *continuous* part of
 * variance, but using the minimum / median of neighbouring absolute returns —
 * which is even more robust to jumps (and, for MedRV, to occasional zero
 * returns and isolated outliers) than the product form of bipower variation.
 * Andersen, Dobrev & Schaumburg (2012).
 *
 *   MinRV = (π/(π−2)) · (n/(n−1)) · Σ min(|rᵢ₋₁|, |rᵢ|)²
 *   MedRV = (π/(6−4√3+π)) · (n/(n−2)) · Σ med(|rᵢ₋₁|, |rᵢ|, |rᵢ₊₁|)²
 *
 * Realized quarticity (RQ = (n/3) · Σ rᵢ⁴) estimates the integrated quarticity
 * ∫σ⁴ — the quantity that sets the standard error of realized variance and
 * appears in the denominator of jump tests. Barndorff-Nielsen & Shephard (2002).
 *
 * Each function takes a return series and returns a non-negative number.
 */

// π / (π − 2): the MinRV scaling constant (from E[min(|Z₁|,|Z₂|)²], Z ~ N(0,1)).
const MIN_RV_SCALE = Math.PI / (Math.PI - 2);
// π / (6 − 4√3 + π): the MedRV scaling constant (from E[med(|Z₁|,|Z₂|,|Z₃|)²]).
const MED_RV_SCALE = Math.PI / (6 - 4 * Math.sqrt(3) + Math.PI);

/**
 * MinRV — jump-robust integrated variance from the squared minimum of adjacent
 * absolute returns. A single jump inflates one return but is paired with a
 * smaller neighbour, so `min` discards it. Returns 0 for fewer than two returns.
 */
export function minRV(returns: readonly number[]): number {
  const n = returns.length;
  if (n < 2) return 0;
  let s = 0;
  for (let i = 1; i < n; i++) {
    const a = Math.abs(returns[i - 1]);
    const b = Math.abs(returns[i]);
    const m = a < b ? a : b;
    s += m * m;
  }
  return MIN_RV_SCALE * (n / (n - 1)) * s;
}

/**
 * MedRV — jump-robust integrated variance from the squared median of three
 * consecutive absolute returns. The median ignores a lone jump *and* a lone
 * near-zero return, making it the most robust of the three continuous-variance
 * estimators here. Returns 0 for fewer than three returns.
 */
export function medRV(returns: readonly number[]): number {
  const n = returns.length;
  if (n < 3) return 0;
  let s = 0;
  for (let i = 1; i < n - 1; i++) {
    const a = Math.abs(returns[i - 1]);
    const b = Math.abs(returns[i]);
    const c = Math.abs(returns[i + 1]);
    // median of a, b, c without allocating an array
    const med = Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    s += med * med;
  }
  return MED_RV_SCALE * (n / (n - 2)) * s;
}

/**
 * Realized quarticity: (n/3) · Σ rᵢ⁴, an estimate of the integrated quarticity
 * ∫σ⁴ used to form the standard error of realized variance and to standardise
 * jump tests. Returns 0 for an empty series.
 */
export function realizedQuarticity(returns: readonly number[]): number {
  const n = returns.length;
  if (n < 1) return 0;
  let s = 0;
  for (const r of returns) {
    const r2 = r * r;
    s += r2 * r2;
  }
  return (n / 3) * s;
}
