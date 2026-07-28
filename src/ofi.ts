/**
 * Order Flow Imbalance (OFI).
 *
 * Implements the level-1 OFI of Cont, Kukanov & Stoikov (2014), "The price
 * impact of order book events". For consecutive best-quote observations
 * (n-1, n) the event contribution is:
 *
 *   e_n =  q^b_n · 1{P^b_n ≥ P^b_{n-1}}  −  q^b_{n-1} · 1{P^b_n ≤ P^b_{n-1}}
 *        − q^a_n · 1{P^a_n ≤ P^a_{n-1}}  +  q^a_{n-1} · 1{P^a_n ≥ P^a_{n-1}}
 *
 * OFI over a window is the sum of e_n. Positive OFI means net buy-side
 * pressure at the top of book; it is a strong linear predictor of short-term
 * price moves.
 */
import type { L1Quote } from "./types.ts";

/** OFI contribution of a single best-quote transition (prev → curr). */
export function ofiContribution(prev: L1Quote, curr: L1Quote): number {
  const bidTerm =
    (curr.bidPrice >= prev.bidPrice ? curr.bidSize : 0) -
    (curr.bidPrice <= prev.bidPrice ? prev.bidSize : 0);

  const askTerm =
    (curr.askPrice >= prev.askPrice ? prev.askSize : 0) -
    (curr.askPrice <= prev.askPrice ? curr.askSize : 0);

  return bidTerm + askTerm;
}

/** Per-step OFI contributions for a sequence of quotes (length n-1). */
export function ofiSeries(quotes: L1Quote[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < quotes.length; i++) {
    out.push(ofiContribution(quotes[i - 1], quotes[i]));
  }
  return out;
}

/** Cumulative OFI over the whole sequence of quotes. */
export function ofi(quotes: L1Quote[]): number {
  let total = 0;
  for (let i = 1; i < quotes.length; i++) {
    total += ofiContribution(quotes[i - 1], quotes[i]);
  }
  return total;
}
