/**
 * Information-driven bars.
 *
 * Sampling a raw trade stream on a fixed *time* grid (1m, 5m, …) oversamples
 * quiet periods and undersamples busy ones, and produces returns that are far
 * from IID. Sampling on *activity* instead — a bar every N ticks, every N
 * units of volume, or every N units of traded value — yields bars with much
 * better statistical properties (López de Prado, *Advances in Financial
 * Machine Learning*, ch. 2). These bars are the natural upstream sampling
 * layer for the rest of this library: build them first, then compute OFI,
 * imbalance, volatility, VPIN, … on the resulting series.
 *
 * Trades are never split across bars: the trade that crosses the threshold is
 * included whole and closes the bar, so `volume`/`dollar` may slightly exceed
 * the threshold. A trailing partial bar (below threshold at end of stream) is
 * dropped, matching `bucketByVolume` in the VPIN module.
 */
import type { Trade } from "./types.ts";

/** One OHLCV bar aggregated from a slice of trades. */
export interface Bar {
  /** Price of the first trade in the bar. */
  open: number;
  /** Highest trade price in the bar. */
  high: number;
  /** Lowest trade price in the bar. */
  low: number;
  /** Price of the last trade in the bar. */
  close: number;
  /** Total traded size. */
  volume: number;
  /** Total traded value, Σ price·size. */
  dollar: number;
  /** Volume-weighted average price, `dollar / volume`. */
  vwap: number;
  /** Number of trades aggregated into the bar. */
  ticks: number;
  /** Size of buyer-initiated trades. */
  buyVolume: number;
  /** Size of seller-initiated trades. */
  sellVolume: number;
  /** Timestamp of the first trade, if the feed provided one. */
  start?: number;
  /** Timestamp of the last trade, if the feed provided one. */
  end?: number;
}

/** Aggregate a non-empty slice of trades into a single bar. */
function buildBar(trades: readonly Trade[]): Bar {
  const first = trades[0];
  const last = trades[trades.length - 1];

  let high = first.price;
  let low = first.price;
  let volume = 0;
  let dollar = 0;
  let buyVolume = 0;
  let sellVolume = 0;

  for (const t of trades) {
    if (t.price > high) high = t.price;
    if (t.price < low) low = t.price;
    volume += t.size;
    dollar += t.price * t.size;
    if (t.side === "buy") buyVolume += t.size;
    else sellVolume += t.size;
  }

  const bar: Bar = {
    open: first.price,
    high,
    low,
    close: last.price,
    volume,
    dollar,
    vwap: volume > 0 ? dollar / volume : first.price,
    ticks: trades.length,
    buyVolume,
    sellVolume,
  };
  if (first.ts !== undefined) bar.start = first.ts;
  if (last.ts !== undefined) bar.end = last.ts;
  return bar;
}

/**
 * Emit a bar every `threshold` trades (tick bars).
 *
 * @param threshold number of trades per bar (integer ≥ 1)
 */
export function tickBars(trades: readonly Trade[], threshold: number): Bar[] {
  const step = Math.floor(threshold);
  if (step < 1) return [];
  const bars: Bar[] = [];
  for (let i = 0; i + step <= trades.length; i += step) {
    bars.push(buildBar(trades.slice(i, i + step)));
  }
  return bars;
}

/**
 * Emit a bar each time cumulative size reaches `threshold` (volume bars).
 * The trade that crosses the threshold closes the bar and is included whole.
 *
 * @param threshold volume per bar (> 0)
 */
export function volumeBars(trades: readonly Trade[], threshold: number): Bar[] {
  return accumulate(trades, threshold, (t) => t.size);
}

/**
 * Emit a bar each time cumulative traded value (Σ price·size) reaches
 * `threshold` (dollar bars). Dollar bars are the most robust of the three to
 * changes in price level and are usually preferred (López de Prado, 2018).
 *
 * @param threshold traded value per bar (> 0)
 */
export function dollarBars(trades: readonly Trade[], threshold: number): Bar[] {
  return accumulate(trades, threshold, (t) => t.price * t.size);
}

/** Shared accumulator for volume / dollar bars. */
function accumulate(
  trades: readonly Trade[],
  threshold: number,
  weight: (t: Trade) => number,
): Bar[] {
  if (!(threshold > 0)) return [];
  const bars: Bar[] = [];
  let start = 0;
  let acc = 0;
  for (let i = 0; i < trades.length; i++) {
    acc += weight(trades[i]);
    if (acc >= threshold) {
      bars.push(buildBar(trades.slice(start, i + 1)));
      start = i + 1;
      acc = 0;
    }
  }
  return bars;
}
