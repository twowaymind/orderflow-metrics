/**
 * Book and trade imbalance metrics.
 *
 * Both return a value in [-1, 1]: positive = buy-side heavy, negative =
 * sell-side heavy, 0 = balanced (or empty input).
 */
import type { L1Quote, Trade } from "./types.ts";

/** Top-of-book depth imbalance: (bidSize − askSize) / (bidSize + askSize). */
export function depthImbalance(q: L1Quote): number {
  const denom = q.bidSize + q.askSize;
  return denom === 0 ? 0 : (q.bidSize - q.askSize) / denom;
}

/** Trade imbalance: (buyVolume − sellVolume) / (buyVolume + sellVolume). */
export function tradeImbalance(trades: Trade[]): number {
  let buy = 0;
  let sell = 0;
  for (const t of trades) {
    if (t.side === "buy") buy += t.size;
    else sell += t.size;
  }
  const denom = buy + sell;
  return denom === 0 ? 0 : (buy - sell) / denom;
}
