"""Execution-cost and price-impact metrics.

Standard transaction-cost analysis (TCA) building blocks:
  - effective spread  — realized cost against the quote midpoint
  - realized spread   — liquidity-provider revenue (post-trade reversion)
  - price impact      — permanent component (effective - realized)
  - Kyle's lambda     — price impact per unit of signed order flow
  - Roll's estimator  — effective spread implied by price-change autocovariance

Sign convention: buys are +1, sells are -1. All spread measures are in the same
price units as the inputs.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

from .types import Side


def _dir(side: Side) -> int:
    return 1 if side == "buy" else -1


def effective_half_spread(price: float, mid: float, side: Side) -> float:
    """Effective half-spread: d * (price - mid)."""
    return _dir(side) * (price - mid)


def effective_spread(price: float, mid: float, side: Side) -> float:
    """Effective (full) spread: 2 * d * (price - mid)."""
    return 2 * effective_half_spread(price, mid, side)


def realized_spread(price: float, mid_after: float, side: Side) -> float:
    """Realized (full) spread using the mid observed later: 2 * d * (price - mid_after)."""
    return 2 * _dir(side) * (price - mid_after)


def price_impact(mid: float, mid_after: float, side: Side) -> float:
    """Permanent price impact: 2 * d * (mid_after - mid) = effective - realized."""
    return 2 * _dir(side) * (mid_after - mid)


@dataclass(frozen=True)
class FlowObservation:
    """A mid-price change paired with the signed traded volume over the interval."""

    price_change: float
    signed_volume: float


def kyle_lambda(obs: Sequence[FlowObservation]) -> float:
    """Kyle's lambda — OLS slope of price change on signed order flow.

    ``dP = lambda * signed_volume + eps``. Returns 0 for degenerate input.
    """
    n = len(obs)
    if n < 2:
        return 0.0

    mx = sum(o.signed_volume for o in obs) / n
    my = sum(o.price_change for o in obs) / n

    cov = 0.0
    varx = 0.0
    for o in obs:
        dx = o.signed_volume - mx
        cov += dx * (o.price_change - my)
        varx += dx * dx
    return 0.0 if varx == 0 else cov / varx


def roll_spread(prices: Sequence[float]) -> float:
    """Roll's (1984) implied effective spread from a series of trade prices.

    ``2 * sqrt(-cov(dP_t, dP_{t-1}))``. Returns 0 when the autocovariance is
    non-negative (the estimator is undefined there).
    """
    if len(prices) < 3:
        return 0.0

    dp = [prices[i] - prices[i - 1] for i in range(1, len(prices))]
    n = len(dp)
    mean = sum(dp) / n
    cov = 0.0
    for i in range(1, n):
        cov += (dp[i] - mean) * (dp[i - 1] - mean)
    cov /= n - 1

    return 2 * math.sqrt(-cov) if cov < 0 else 0.0
