"""Fair-value and quoting helpers derived from the top of book."""
from __future__ import annotations

from .types import L1Quote


def weighted_mid(q: L1Quote) -> float:
    """Imbalance-weighted mid price (a simple micro-price).

    Each side is weighted by the *opposite* size, so heavy resting bid size
    pulls the estimate toward the ask (upward pressure), and vice versa. Falls
    back to the arithmetic mid when both sizes are zero.
    """
    total = q.bid_size + q.ask_size
    if total == 0:
        return (q.bid_price + q.ask_price) / 2
    return q.bid_price * (q.ask_size / total) + q.ask_price * (q.bid_size / total)


def mid(q: L1Quote) -> float:
    """Arithmetic mid price: (bid + ask) / 2."""
    return (q.bid_price + q.ask_price) / 2


def relative_spread_bps(q: L1Quote) -> float:
    """Quoted spread in basis points: (ask - bid) / mid * 10_000."""
    m = mid(q)
    if m == 0:
        return 0.0
    return ((q.ask_price - q.bid_price) / m) * 10_000
