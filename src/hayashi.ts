/**
 * Hayashi-Yoshida covariance — realized covariance for *non-synchronous* prices.
 *
 * Realized covariance (`covariance.ts`) pairs two return series index-by-index, so
 * it silently assumes both assets are observed on the *same* clock. Real ticks are
 * not: two instruments trade at their own, irregular times. Forcing them onto a
 * common grid (previous-tick interpolation, fixed sampling) throws away data and
 * biases covariance toward zero the finer you sample — the Epps effect.
 *
 * Hayashi & Yoshida (2005), "On covariance estimation of non-synchronously observed
 * diffusion processes" (Bernoulli 11(2), 359-379), estimate the integrated
 * covariance directly from each series' own observation times, with no
 * synchronization. Each price series defines return intervals (tᵢ₋₁, tᵢ]; the
 * estimator sums the product of two returns whenever their intervals *overlap in
 * time*:
 *
 *   HY = Σᵢ Σⱼ ΔXᵢ · ΔYⱼ · 1{ (tᵢ₋₁, tᵢ] ∩ (sⱼ₋₁, sⱼ] ≠ ∅ }
 *
 * It is consistent for the integrated covariance and free of the Epps bias. When
 * both series share the same timestamps it collapses exactly to the realized
 * covariance Σ ΔXᵢ·ΔYᵢ. `hayashiYoshidaCorrelation` normalizes it by each series'
 * own realized variance (each computed on its own grid), giving a synchronization-
 * free correlation.
 *
 * Each series must be sorted by ascending time; intervals are half-open, so two
 * that merely touch at an endpoint (…, t] and (t, …] do *not* overlap. Returns are
 * price differences (feed log-prices to estimate log-return covariance).
 */

/** A single timestamped price observation. */
export interface TimedPrice {
  /** Observation time (any consistent, ascending unit). */
  time: number;
  /** Price (or log-price) at that time. */
  price: number;
}

interface Interval {
  start: number;
  end: number;
  ret: number;
}

/** Build return intervals (tᵢ₋₁, tᵢ] with ΔX = pᵢ − pᵢ₋₁ from a sorted series. */
function toIntervals(series: readonly TimedPrice[]): Interval[] {
  const out: Interval[] = [];
  for (let i = 1; i < series.length; i++) {
    out.push({
      start: series[i - 1].time,
      end: series[i].time,
      ret: series[i].price - series[i - 1].price,
    });
  }
  return out;
}

/** Σ over a series' own return intervals of ΔX² — realized variance on its grid. */
function realizedVarianceOf(intervals: readonly Interval[]): number {
  let s = 0;
  for (const iv of intervals) s += iv.ret * iv.ret;
  return s;
}

/**
 * Hayashi-Yoshida covariance of two non-synchronously observed price series: the
 * sum of return cross-products over every pair of time-overlapping intervals
 * (Hayashi & Yoshida 2005). Each series must be sorted by ascending `time`.
 * Reduces to the realized covariance when the two grids coincide. Returns 0 when
 * either series has fewer than two observations.
 */
export function hayashiYoshidaCovariance(
  x: readonly TimedPrice[],
  y: readonly TimedPrice[],
): number {
  const ix = toIntervals(x);
  const iy = toIntervals(y);
  let hy = 0;
  for (const a of ix) {
    for (const b of iy) {
      // Intervals sorted by start; once a Y interval starts at/after this X
      // interval ends, no later Y interval can overlap it either.
      if (b.start >= a.end) break;
      if (b.end <= a.start) continue; // Y ended before X began
      hy += a.ret * b.ret;
    }
  }
  return hy;
}

/**
 * Hayashi-Yoshida correlation: `HY(x, y) / √(RVₓ · RVy)`, where each realized
 * variance is computed on that series' own observation grid — a synchronization-
 * free correlation robust to the Epps effect. Each series must be sorted by
 * ascending `time`. Returns `NaN` when either series has zero realized variance
 * (or fewer than two observations).
 */
export function hayashiYoshidaCorrelation(
  x: readonly TimedPrice[],
  y: readonly TimedPrice[],
): number {
  const ix = toIntervals(x);
  const iy = toIntervals(y);
  const varX = realizedVarianceOf(ix);
  const varY = realizedVarianceOf(iy);
  if (varX <= 0 || varY <= 0) return NaN;
  let hy = 0;
  for (const a of ix) {
    for (const b of iy) {
      if (b.start >= a.end) break;
      if (b.end <= a.start) continue;
      hy += a.ret * b.ret;
    }
  }
  return hy / Math.sqrt(varX * varY);
}
