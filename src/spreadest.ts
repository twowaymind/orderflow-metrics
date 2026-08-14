/**
 * Bid-ask spread estimators from daily OHLC data.
 *
 * When all you have is low-frequency bars — daily high, low, and close — you can
 * still back out an estimate of the effective bid-ask spread. Two well-known,
 * dependency-free estimators:
 *
 *  - Corwin & Schultz (2012): the high-low range over two consecutive periods
 *    reflects both fundamental volatility and the bid-ask bounce. The bounce can
 *    be isolated because volatility scales with the time interval while the
 *    spread does not.
 *  - Abdi & Ranaldo (2017): compares each close to the mid-point of the current
 *    and the next period's high-low range; their covariance recovers the spread.
 *
 * Both return a *proportional* spread (a fraction of price, e.g. 0.01 = 100 bps).
 * Negative estimates — noise when the true spread is close to zero — are floored
 * at 0. Prices must be strictly positive.
 */

export interface Ohlc {
  high: number;
  low: number;
  close: number;
}

/** 3 - 2√2 ≈ 0.1716, the Corwin-Schultz normalizing constant. */
const K = 3 - 2 * Math.SQRT2;

/**
 * Corwin-Schultz (2012) high-low proportional spread estimate, averaged over all
 * consecutive bar pairs. Per-pair negative estimates are set to 0 before
 * averaging (as recommended in the paper). Returns 0 for fewer than two bars.
 */
export function corwinSchultz(bars: Ohlc[]): number {
  if (bars.length < 2) return 0;
  let sum = 0;
  let n = 0;
  for (let i = 0; i + 1 < bars.length; i++) {
    const a = bars[i];
    const b = bars[i + 1];
    const hlA = Math.log(a.high / a.low);
    const hlB = Math.log(b.high / b.low);
    const beta = hlA * hlA + hlB * hlB;
    const g = Math.log(Math.max(a.high, b.high) / Math.min(a.low, b.low));
    const gamma = g * g;
    const alpha =
      (Math.sqrt(2 * beta) - Math.sqrt(beta)) / K - Math.sqrt(gamma / K);
    const s = (2 * (Math.exp(alpha) - 1)) / (1 + Math.exp(alpha));
    sum += s > 0 ? s : 0;
    n++;
  }
  return n === 0 ? 0 : sum / n;
}

/**
 * Abdi-Ranaldo (2017) proportional spread estimate from close, high, and low.
 * Uses the covariance of each log-close with the mid-range of the current and
 * next bar: S = sqrt(max(4 · E[(c_t − η_t)(c_t − η_{t+1})], 0)), where
 * η = (log high + log low) / 2. Returns 0 for fewer than two bars or when the
 * estimate is negative.
 */
export function abdiRanaldo(bars: Ohlc[]): number {
  if (bars.length < 2) return 0;
  let sum = 0;
  let n = 0;
  for (let t = 0; t + 1 < bars.length; t++) {
    const c = Math.log(bars[t].close);
    const etaT = (Math.log(bars[t].high) + Math.log(bars[t].low)) / 2;
    const etaN = (Math.log(bars[t + 1].high) + Math.log(bars[t + 1].low)) / 2;
    sum += (c - etaT) * (c - etaN);
    n++;
  }
  const s2 = 4 * (n === 0 ? 0 : sum / n);
  return s2 > 0 ? Math.sqrt(s2) : 0;
}
