/**
 * Online (streaming) estimators — O(1) per update, no rescans.
 *
 * Batch metrics recompute over the whole history every time a tick arrives;
 * that is fine offline but wasteful in a live pipeline. The estimators here
 * update in constant time and constant memory as each observation streams in,
 * which is what you want feeding volatility or risk off a real-time tape.
 *
 * They are numerically careful: `Welford` and `RollingWindow` use Welford's
 * and West's algorithms rather than the naive Σx² − (Σx)²/n form, which loses
 * precision catastrophically when the mean is large relative to the variance.
 *
 *   Welford        — running mean & variance over all data seen so far
 *   Ewma           — exponentially weighted moving average (a level)
 *   EwmaVariance   — RiskMetrics-style EWMA variance (a volatility)
 *   RollingWindow  — mean & variance over a fixed trailing window
 *
 * Sample variance uses the (n − 1) denominator; each class also exposes the
 * population (n) form. Variance getters are floored at 0 to absorb the tiny
 * negative values floating-point round-off can produce near zero.
 */

/**
 * Streaming mean and variance over every value pushed so far, via Welford's
 * online algorithm. Constant time and memory per update, and numerically
 * stable regardless of the mean's magnitude.
 */
export class Welford {
  #n = 0;
  #mean = 0;
  #m2 = 0;

  /** Incorporate one observation. */
  push(x: number): void {
    this.#n += 1;
    const delta = x - this.#mean;
    this.#mean += delta / this.#n;
    this.#m2 += delta * (x - this.#mean);
  }

  /** Number of observations seen. */
  get count(): number {
    return this.#n;
  }

  /** Running mean (0 before any observation). */
  get mean(): number {
    return this.#n > 0 ? this.#mean : 0;
  }

  /** Sample variance, (n − 1) denominator (0 for fewer than two observations). */
  get variance(): number {
    if (this.#n < 2) return 0;
    const v = this.#m2 / (this.#n - 1);
    return v > 0 ? v : 0;
  }

  /** Population variance, n denominator (0 before any observation). */
  get populationVariance(): number {
    if (this.#n < 1) return 0;
    const v = this.#m2 / this.#n;
    return v > 0 ? v : 0;
  }

  /** Sample standard deviation. */
  get std(): number {
    return Math.sqrt(this.variance);
  }
}

/**
 * Exponentially weighted moving average of a level: vₜ = λ·vₜ₋₁ + (1 − λ)·xₜ.
 * `lambda` is the weight on history (decay), in (0, 1) — larger is smoother and
 * slower to react. Seeded with the first value pushed.
 */
export class Ewma {
  readonly #lambda: number;
  #value = 0;
  #init = false;

  constructor(lambda: number) {
    if (!(lambda > 0 && lambda < 1)) {
      throw new RangeError("lambda must be in the open interval (0, 1)");
    }
    this.#lambda = lambda;
  }

  /** Incorporate one observation. */
  push(x: number): void {
    this.#value = this.#init ? this.#lambda * this.#value + (1 - this.#lambda) * x : x;
    this.#init = true;
  }

  /** Current EWMA level (0 before any observation). */
  get value(): number {
    return this.#value;
  }

  /** Whether at least one value has been pushed. */
  get initialized(): boolean {
    return this.#init;
  }
}

/**
 * RiskMetrics-style exponentially weighted variance of a return series:
 * σ²ₜ = λ·σ²ₜ₋₁ + (1 − λ)·r²ₜ. Assumes approximately zero-mean returns (the
 * standard RiskMetrics assumption). `lambda` in (0, 1) is the decay; RiskMetrics
 * uses 0.94 for daily data. Seeded with r² of the first value pushed.
 */
export class EwmaVariance {
  readonly #lambda: number;
  #var = 0;
  #init = false;

  constructor(lambda: number) {
    if (!(lambda > 0 && lambda < 1)) {
      throw new RangeError("lambda must be in the open interval (0, 1)");
    }
    this.#lambda = lambda;
  }

  /** Incorporate one return. */
  push(r: number): void {
    this.#var = this.#init ? this.#lambda * this.#var + (1 - this.#lambda) * r * r : r * r;
    this.#init = true;
  }

  /** Current EWMA variance (0 before any observation). */
  get variance(): number {
    return this.#var;
  }

  /** Current EWMA volatility (standard deviation). */
  get std(): number {
    return Math.sqrt(this.#var);
  }

  /** Whether at least one value has been pushed. */
  get initialized(): boolean {
    return this.#init;
  }
}

/**
 * Mean and variance over a fixed trailing window of the last `size` values.
 * Each push is O(1): the incoming value is added and, once the window is full,
 * the oldest is removed, both via West's (1979) incremental update — so there is
 * no per-tick rescan and no Σx² cancellation.
 */
export class RollingWindow {
  readonly #size: number;
  readonly #buf: number[] = [];
  #idx = 0;
  #n = 0;
  #mean = 0;
  #m2 = 0;

  constructor(size: number) {
    if (!Number.isInteger(size) || size < 1) {
      throw new RangeError("size must be a positive integer");
    }
    this.#size = size;
  }

  /** Push one value, evicting the oldest once the window is full. */
  push(x: number): void {
    if (this.#n < this.#size) {
      // Window not yet full: plain Welford add.
      this.#n += 1;
      const delta = x - this.#mean;
      this.#mean += delta / this.#n;
      this.#m2 += delta * (x - this.#mean);
      this.#buf.push(x);
      return;
    }
    // Full: add the newcomer, then remove the oldest (West's add + remove).
    const old = this.#buf[this.#idx];
    const n1 = this.#n + 1;
    const delta = x - this.#mean;
    const mean1 = this.#mean + delta / n1;
    const m2Added = this.#m2 + delta * (x - mean1);
    const mean0 = (n1 * mean1 - old) / this.#size;
    this.#m2 = m2Added - (old - mean0) * (old - mean1);
    this.#mean = mean0;
    this.#buf[this.#idx] = x;
    this.#idx = (this.#idx + 1) % this.#size;
  }

  /** Configured window size. */
  get size(): number {
    return this.#size;
  }

  /** Number of values currently in the window (≤ size). */
  get count(): number {
    return this.#n;
  }

  /** Whether the window has filled to `size`. */
  get full(): boolean {
    return this.#n === this.#size;
  }

  /** Mean of the current window (0 when empty). */
  get mean(): number {
    return this.#n > 0 ? this.#mean : 0;
  }

  /** Sample variance of the current window (0 for fewer than two values). */
  get variance(): number {
    if (this.#n < 2) return 0;
    const v = this.#m2 / (this.#n - 1);
    return v > 0 ? v : 0;
  }

  /** Population variance of the current window (0 when empty). */
  get populationVariance(): number {
    if (this.#n < 1) return 0;
    const v = this.#m2 / this.#n;
    return v > 0 ? v : 0;
  }

  /** Sample standard deviation of the current window. */
  get std(): number {
    return Math.sqrt(this.variance);
  }
}
