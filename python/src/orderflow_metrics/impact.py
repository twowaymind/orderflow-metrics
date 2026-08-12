"""Market-impact models and trade markouts.

Two pre-trade cost models — the empirical square-root law and the linear
Almgren-Chriss temporary/permanent decomposition — plus post-trade markouts, the
realized adverse-selection drift after a fill. Together they cover the "what will
it cost / what did it cost" pair around execution.

Sign convention for markouts: buys are +1, sells are -1.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

from .types import Side


def _dir(side: Side) -> int:
    return 1 if side == "buy" else -1


def square_root_impact(
    sigma: float,
    order_size: float,
    market_volume: float,
    coefficient: float = 1.0,
) -> float:
    """Square-root law of market impact: ``coefficient * sigma * sqrt(Q / V)``.

    The widely-observed empirical scaling of impact with participation: cost
    grows with volatility ``sigma`` and the square root of the order size ``Q``
    relative to market volume ``V``. ``coefficient`` (Y, typically ~0.5-1)
    absorbs the asset/venue-specific constant. Returns a dimensionless cost
    fraction, or 0 for non-positive volume or size.
    """
    if not (market_volume > 0) or order_size <= 0:
        return 0.0
    return coefficient * sigma * math.sqrt(order_size / market_volume)


def linear_permanent_impact(gamma: float, quantity: float) -> float:
    """Linear permanent impact: the lasting price shift ``gamma * quantity``."""
    return gamma * quantity


def linear_temporary_impact(eta: float, rate: float) -> float:
    """Linear temporary impact at trading rate ``rate``: ``eta * rate``."""
    return eta * rate


@dataclass(frozen=True)
class ImpactCost:
    """Expected impact cost of a schedule, split into its two components."""

    permanent: float
    temporary: float
    total: float


def almgren_chriss_cost(
    quantity: float,
    duration: float,
    eta: float,
    gamma: float,
) -> ImpactCost:
    """Almgren-Chriss expected impact cost of a uniform (TWAP) liquidation.

    Liquidate ``quantity`` over ``duration`` under linear temporary (``eta``)
    and permanent (``gamma``) impact::

        permanent = 0.5 * gamma * Q**2      (paid on average over the trade)
        temporary = eta * Q**2 / T          (uniform rate Q/T over T)

    ``duration`` must be positive.
    """
    if not (duration > 0):
        raise ValueError("duration must be positive")
    permanent = 0.5 * gamma * quantity * quantity
    temporary = (eta * quantity * quantity) / duration
    return ImpactCost(permanent=permanent, temporary=temporary, total=permanent + temporary)


def markout(side: Side, mid_at_trade: float, mid_after: float) -> float:
    """Signed post-trade markout: ``d * (mid_after - mid_at_trade)``.

    How far the mid moved in the aggressor's favour over some horizon after the
    fill. Positive = the trade "looked informed"; negative = it faded. This is
    the taker's realized edge and the provider's adverse selection (sign
    flipped).
    """
    return _dir(side) * (mid_after - mid_at_trade)


@dataclass(frozen=True)
class MarkoutObservation:
    """A fill's trade side and the mid at execution vs. at the markout horizon."""

    side: Side
    mid_at_trade: float
    mid_after: float


def average_markout(obs: Sequence[MarkoutObservation]) -> float:
    """Average markout across observations (0 for an empty set)."""
    if not obs:
        return 0.0
    return sum(markout(o.side, o.mid_at_trade, o.mid_after) for o in obs) / len(obs)
