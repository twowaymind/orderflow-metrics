"""Multi-level Order Flow Imbalance (deep-book OFI).

The level-1 OFI in ``ofi`` (Cont, Kukanov & Stoikov, 2014) only sees the best
bid and ask. In fragmented, high-frequency books the top of book flickers -
queues appear and vanish tick to tick - so top-of-book OFI alone is noisy.
Multi-level OFI (Cont, Cucuringu & Zhang, 2023, "Cross-impact of order flow
imbalance in equity markets") applies the same event-flow logic at each of the
top ``K`` price levels and returns the vector of per-level OFIs, capturing
pressure building deeper in the book.

For a level with prev/curr bid ``(P_bid, q_bid)`` and ask ``(P_ask, q_ask)``,
the OFI at that level is the Cont-Kukanov-Stoikov contribution evaluated at that
depth::

    OFI_k =  q_bid_curr * 1{P_bid_curr >= P_bid_prev}  -  q_bid_prev * 1{P_bid_curr <= P_bid_prev}
           + q_ask_prev * 1{P_ask_curr >= P_ask_prev}  -  q_ask_curr * 1{P_ask_curr <= P_ask_prev}

A single scalar is recovered by weighting the levels - ``depth_weighted_ofi``
uses geometric depth decay so the near touch dominates but deeper pressure still
counts. Levels beyond the depth present in either snapshot contribute 0. Each
side is best-first: bids by descending price, asks by ascending price, aligned
across snapshots by level index.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence

from .orderbook import Level


@dataclass(frozen=True)
class BookSnapshot:
    """A top-of-book snapshot: both sides as best-first level sequences."""

    bids: Sequence[Level]
    """bid levels, best (highest price) first"""
    asks: Sequence[Level]
    """ask levels, best (lowest price) first"""


def _level_ofi(pb: Level, cb: Level, pa: Level, ca: Level) -> float:
    """Cont-Kukanov-Stoikov OFI contribution at one price level (prev -> curr)."""
    bid_term = (cb.size if cb.price >= pb.price else 0.0) - (
        pb.size if cb.price <= pb.price else 0.0
    )
    ask_term = (pa.size if ca.price >= pa.price else 0.0) - (
        ca.size if ca.price <= pa.price else 0.0
    )
    return bid_term + ask_term


def multi_level_ofi(
    prev: BookSnapshot, curr: BookSnapshot, levels: int
) -> List[float]:
    """Multi-level OFI vector between two consecutive book snapshots: the
    per-level OFI for levels 1..``levels``. A level absent from either snapshot
    (on either side) contributes 0, so the result always has length
    ``max(levels, 0)``.
    """
    out: List[float] = []
    for i in range(levels):
        if (
            i < len(prev.bids)
            and i < len(curr.bids)
            and i < len(prev.asks)
            and i < len(curr.asks)
        ):
            out.append(_level_ofi(prev.bids[i], curr.bids[i], prev.asks[i], curr.asks[i]))
        else:
            out.append(0.0)
    return out


def multi_level_ofi_series(
    snapshots: Sequence[BookSnapshot], levels: int
) -> List[List[float]]:
    """Per-step multi-level OFI vectors for a sequence of snapshots (length
    n-1). Each element is the ``multi_level_ofi`` vector between consecutive
    snapshots.
    """
    return [
        multi_level_ofi(snapshots[i - 1], snapshots[i], levels)
        for i in range(1, len(snapshots))
    ]


def depth_weighted_ofi(
    prev: BookSnapshot, curr: BookSnapshot, levels: int, decay: float = 0.5
) -> float:
    """Depth-weighted scalar OFI: the multi-level OFI vector collapsed with
    geometric depth-decay weights ``w_k = decay**(k-1)`` (k = 1..levels),
    normalized to sum to 1. ``decay`` in (0, 1]: 1 weights every level equally
    (a plain average across levels), smaller values concentrate weight on the
    near touch. Returns 0 for a non-positive ``levels`` or ``decay``.
    """
    if levels <= 0 or decay <= 0:
        return 0.0
    v = multi_level_ofi(prev, curr, levels)
    wsum = 0.0
    acc = 0.0
    w = 1.0
    for i in range(levels):
        acc += w * v[i]
        wsum += w
        w *= decay
    return 0.0 if wsum == 0 else acc / wsum
