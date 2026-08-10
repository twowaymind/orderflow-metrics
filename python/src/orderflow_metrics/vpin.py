"""VPIN — Volume-Synchronized Probability of Informed Trading.

Easley, Lopez de Prado & O'Hara (2012), "Flow Toxicity and Liquidity in a
High-Frequency World". Trades are grouped into equal-volume buckets; each bucket
is split into buy/sell volume by Bulk Volume Classification (BVC) using the
standardized close-to-close price change; VPIN is the average absolute order
imbalance across a rolling window of buckets::

    V_buy  = V * Phi(dP / sigma)
    V_sell = V * (1 - Phi(dP / sigma))
    VPIN   = sum |V_buy - V_sell| / sum V     over the window
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional, Sequence

from .types import Trade


@dataclass(frozen=True)
class VolumeBucket:
    """An equal-volume bucket: close-to-close price change and its volume."""

    price_change: float
    volume: float


def _erf(x: float) -> float:
    # Abramowitz & Stegun 7.1.26 — max error ~ 1.5e-7.
    t = 1 / (1 + 0.3275911 * abs(x))
    y = 1 - (
        (
            (((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736)
            * t
            + 0.254829592
        )
        * t
        * math.exp(-x * x)
    )
    return y if x >= 0 else -y


def standard_normal_cdf(x: float) -> float:
    """Standard normal CDF Phi(x)."""
    return 0.5 * (1 + _erf(x / math.sqrt(2)))


def bvc_buy_fraction(price_change: float, sigma: float) -> float:
    """BVC buy-volume fraction for a bucket, given its price change and sigma."""
    if not (sigma > 0):
        return 0.5
    return standard_normal_cdf(price_change / sigma)


def bucket_by_volume(trades: Sequence[Trade], bucket_size: float) -> List[VolumeBucket]:
    """Aggregate a trade stream into equal-volume buckets (splitting trades)."""
    if bucket_size <= 0:
        raise ValueError("bucket_size must be positive")
    buckets: List[VolumeBucket] = []
    filled = 0.0
    prev_close = trades[0].price if trades else 0.0

    for t in trades:
        remaining = t.size
        while filled + remaining >= bucket_size:
            remaining -= bucket_size - filled
            buckets.append(
                VolumeBucket(price_change=t.price - prev_close, volume=bucket_size)
            )
            prev_close = t.price
            filled = 0.0
        filled += remaining
    return buckets


def _population_std(xs: Sequence[float]) -> float:
    if not xs:
        return 0.0
    mean = sum(xs) / len(xs)
    v = sum((b - mean) ** 2 for b in xs) / len(xs)
    return math.sqrt(v)


def vpin(
    buckets: Sequence[VolumeBucket],
    window: Optional[int] = None,
    sigma: Optional[float] = None,
) -> float:
    """VPIN over the last ``window`` buckets (default: all of them).

    ``sigma`` for BVC defaults to the std dev of the window's price changes.
    Returns a value in [0, 1].
    """
    if not buckets:
        return 0.0
    w = window if window is not None else len(buckets)
    sliced = list(buckets)[-w:]
    s = sigma if sigma is not None else _population_std([b.price_change for b in sliced])

    imbalance = 0.0
    volume = 0.0
    for b in sliced:
        buy_frac = bvc_buy_fraction(b.price_change, s)
        imbalance += b.volume * abs(2 * buy_frac - 1)
        volume += b.volume
    return 0.0 if volume == 0 else imbalance / volume
