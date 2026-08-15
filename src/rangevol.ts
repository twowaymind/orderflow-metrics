/**
 * Range-based volatility estimators from OHLC candles.
 *
 * Close-to-close realized volatility (see `volatility`) throws away most of each
 * bar — it reads only the close. But the open, high, and low carry information
 * too, and using them yields far more efficient volatility estimates from the
 * same data. Four classic estimators, in increasing order of what they use:
 *
 *  - Parkinson (1980): the high-low range only.
 *  - Garman-Klass (1980): adds the open and close.
 *  - Rogers-Satchell (1991): drift-independent (correct under a trending mean).
 *  - Yang-Zhang (2000): drift-independent and robust to overnight jumps.
 *
 * Each returns the estimated volatility (standard deviation) *per bar*. To
 * annualize, multiply the variance by the number of bars per year, or the
 * volatility by its square root. Prices must be strictly positive.
 */

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

const LN2 = Math.LN2;

/** Parkinson (1980) high-low volatility. Returns 0 for an empty input. */
export function parkinsonVolatility(bars: Candle[]): number {
  const n = bars.length;
  if (n === 0) return 0;
  let s = 0;
  for (const b of bars) {
    const hl = Math.log(b.high / b.low);
    s += hl * hl;
  }
  return Math.sqrt(s / (4 * LN2) / n);
}

/** Garman-Klass (1980) OHLC volatility. Returns 0 for an empty input. */
export function garmanKlassVolatility(bars: Candle[]): number {
  const n = bars.length;
  if (n === 0) return 0;
  let s = 0;
  for (const b of bars) {
    const hl = Math.log(b.high / b.low);
    const co = Math.log(b.close / b.open);
    s += 0.5 * hl * hl - (2 * LN2 - 1) * co * co;
  }
  const v = s / n;
  return v > 0 ? Math.sqrt(v) : 0;
}

/**
 * Rogers-Satchell (1991) drift-independent OHLC volatility. Correct even when
 * the price has a non-zero mean drift. Returns 0 for an empty input.
 */
export function rogersSatchellVolatility(bars: Candle[]): number {
  const n = bars.length;
  if (n === 0) return 0;
  let s = 0;
  for (const b of bars) {
    s +=
      Math.log(b.high / b.close) * Math.log(b.high / b.open) +
      Math.log(b.low / b.close) * Math.log(b.low / b.open);
  }
  const v = s / n;
  return v > 0 ? Math.sqrt(v) : 0;
}

/**
 * Yang-Zhang (2000) volatility: a minimum-variance combination of overnight,
 * open-to-close, and Rogers-Satchell variances that is both drift-independent
 * and robust to opening jumps. Uses each bar's open relative to the previous
 * close, so it needs at least three bars; returns 0 otherwise.
 */
export function yangZhangVolatility(bars: Candle[]): number {
  const n = bars.length;
  if (n < 3) return 0;
  const overnight: number[] = [];
  const openClose: number[] = [];
  let rs = 0;
  for (let i = 1; i < n; i++) {
    const prev = bars[i - 1];
    const b = bars[i];
    overnight.push(Math.log(b.open / prev.close));
    openClose.push(Math.log(b.close / b.open));
    rs +=
      Math.log(b.high / b.close) * Math.log(b.high / b.open) +
      Math.log(b.low / b.close) * Math.log(b.low / b.open);
  }
  const m = overnight.length;
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const ob = mean(overnight);
  const cb = mean(openClose);
  let so = 0;
  let sc = 0;
  for (let i = 0; i < m; i++) {
    so += (overnight[i] - ob) ** 2;
    sc += (openClose[i] - cb) ** 2;
  }
  so /= m - 1;
  sc /= m - 1;
  const rsv = rs / m;
  const k = 0.34 / (1.34 + (m + 1) / (m - 1));
  const v = so + k * sc + (1 - k) * rsv;
  return v > 0 ? Math.sqrt(v) : 0;
}
