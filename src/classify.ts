/**
 * Trade-sign classification.
 *
 * Public trade prints usually don't tell you which side was the aggressor.
 * These rules infer it, so downstream OFI / imbalance / VPIN inputs can be
 * signed. Output is +1 (buyer-initiated), −1 (seller-initiated), 0 (unknown).
 */

export type Sign = 1 | -1 | 0;

/**
 * Tick rule: classify by the change vs the previous trade price.
 * An unchanged ("zero tick") price carries the last non-zero sign; the first
 * trade is unclassifiable (0).
 */
export function tickRule(prices: readonly number[]): Sign[] {
  const out: Sign[] = [];
  let last: Sign = 0;
  for (let i = 0; i < prices.length; i++) {
    if (i > 0) {
      const d = prices[i] - prices[i - 1];
      if (d > 0) last = 1;
      else if (d < 0) last = -1;
      // d === 0 -> keep last (zero-tick)
    }
    out.push(last);
  }
  return out;
}

export interface PriceVsMid {
  price: number;
  mid: number;
}

/**
 * Lee-Ready (1991): quote rule first — a print above the prevailing mid is
 * buyer-initiated, below is seller-initiated — with the tick rule breaking
 * at-the-mid ties.
 */
export function leeReady(obs: readonly PriceVsMid[]): Sign[] {
  const out: Sign[] = [];
  let last: Sign = 0;
  for (let i = 0; i < obs.length; i++) {
    const { price, mid } = obs[i];
    let sign: Sign;
    if (price > mid) sign = 1;
    else if (price < mid) sign = -1;
    else if (i > 0) {
      const d = price - obs[i - 1].price;
      sign = d > 0 ? 1 : d < 0 ? -1 : last;
    } else {
      sign = 0;
    }
    if (sign !== 0) last = sign;
    out.push(sign);
  }
  return out;
}
