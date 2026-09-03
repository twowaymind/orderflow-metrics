/**
 * Multi-level Order Flow Imbalance (deep-book OFI).
 *
 * The level-1 OFI in `ofi.ts` (Cont, Kukanov & Stoikov, 2014) only sees the
 * best bid and ask. In fragmented, high-frequency books the top of book
 * flickers — queues appear and vanish tick to tick — so top-of-book OFI alone
 * is noisy. Multi-level OFI (Cont, Cucuringu & Zhang, 2023, "Cross-impact of
 * order flow imbalance in equity markets") applies the same event-flow logic at
 * each of the top `K` price levels and returns the vector of per-level OFIs,
 * capturing pressure building deeper in the book.
 *
 * For a level with prev/curr bid `(P^b, q^b)` and ask `(P^a, q^a)`, the OFI at
 * that level is the Cont–Kukanov–Stoikov contribution evaluated at that depth:
 *
 *   OFI_k =  q^b_curr · 1{P^b_curr ≥ P^b_prev}  −  q^b_prev · 1{P^b_curr ≤ P^b_prev}
 *          + q^a_prev · 1{P^a_curr ≥ P^a_prev}  −  q^a_curr · 1{P^a_curr ≤ P^a_prev}
 *
 * A single scalar is recovered by weighting the levels — `depthWeightedOFI`
 * uses geometric depth decay so the near touch dominates but deeper pressure
 * still counts. Levels beyond the depth present in either snapshot contribute 0.
 * Each side is best-first: bids by descending price, asks by ascending price,
 * aligned across snapshots by level index.
 */
import type { Level } from "./orderbook.ts";

/** A top-of-book snapshot: both sides as best-first level arrays. */
export interface BookSnapshot {
  /** bid levels, best (highest price) first */
  bids: readonly Level[];
  /** ask levels, best (lowest price) first */
  asks: readonly Level[];
}

/** Cont–Kukanov–Stoikov OFI contribution at one price level (prev → curr). */
function levelOFI(pb: Level, cb: Level, pa: Level, ca: Level): number {
  const bidTerm =
    (cb.price >= pb.price ? cb.size : 0) - (cb.price <= pb.price ? pb.size : 0);
  const askTerm =
    (ca.price >= pa.price ? pa.size : 0) - (ca.price <= pa.price ? ca.size : 0);
  return bidTerm + askTerm;
}

/**
 * Multi-level OFI vector between two consecutive book snapshots: the per-level
 * OFI for levels 1…`levels`. A level absent from either snapshot (on either
 * side) contributes 0, so the result always has length `max(levels, 0)`.
 */
export function multiLevelOFI(
  prev: BookSnapshot,
  curr: BookSnapshot,
  levels: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < levels; i++) {
    const pb = prev.bids[i];
    const cb = curr.bids[i];
    const pa = prev.asks[i];
    const ca = curr.asks[i];
    out.push(pb && cb && pa && ca ? levelOFI(pb, cb, pa, ca) : 0);
  }
  return out;
}

/**
 * Per-step multi-level OFI vectors for a sequence of snapshots (length n-1).
 * Each element is the `multiLevelOFI` vector between consecutive snapshots.
 */
export function multiLevelOFISeries(
  snapshots: readonly BookSnapshot[],
  levels: number,
): number[][] {
  const out: number[][] = [];
  for (let i = 1; i < snapshots.length; i++) {
    out.push(multiLevelOFI(snapshots[i - 1], snapshots[i], levels));
  }
  return out;
}

/**
 * Depth-weighted scalar OFI: the multi-level OFI vector collapsed with
 * geometric depth-decay weights `w_k = decay^(k-1)` (k = 1…levels), normalized
 * to sum to 1. `decay` in (0, 1]: 1 weights every level equally (a plain
 * average across levels), smaller values concentrate weight on the near touch.
 * Returns 0 for a non-positive `levels` or `decay`.
 */
export function depthWeightedOFI(
  prev: BookSnapshot,
  curr: BookSnapshot,
  levels: number,
  decay = 0.5,
): number {
  if (levels <= 0 || decay <= 0) return 0;
  const v = multiLevelOFI(prev, curr, levels);
  let wsum = 0;
  let acc = 0;
  let w = 1;
  for (let i = 0; i < levels; i++) {
    acc += w * v[i];
    wsum += w;
    w *= decay;
  }
  return wsum === 0 ? 0 : acc / wsum;
}
