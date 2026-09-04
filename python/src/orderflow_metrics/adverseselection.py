"""Adverse selection and markout profiles.

A single markout (``markout`` in ``impact``) asks "did the mid move against me
one horizon after the fill?". But toxicity has a *shape*: an informed fill keeps
drifting against the resting side for seconds, while a benign one snaps back. The
**markout profile** is that shape - the signed post-fill move at a sequence of
increasing horizons - the standard transaction-cost-analysis lens on adverse
selection. Averaged across many fills it is the markout curve every market-making
and execution desk plots.

Sign convention matches ``markout``: the value is measured from the *taker's*
side (buy -> mid up is positive, sell -> mid down is positive), so a positive
markout is the liquidity taker's realized edge and the liquidity provider's
adverse selection. To read it as provider toxicity, flip the sign.

The ``adverse_selection_score`` normalizes a markout by the half-spread, so the
post-fill move is expressed in units of the spread cushion the maker was paid: a
score above 1 means the price moved further than the half-spread - the fill was
toxic beyond what the spread compensated.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Sequence

from .types import Side


def _dir(side: Side) -> float:
    return 1.0 if side == "buy" else -1.0


@dataclass(frozen=True)
class MarkoutProfileObservation:
    """One fill and the mids observed at each markout horizon after it."""

    side: Side
    mid_at_trade: float
    mids_after: Sequence[float] = field(default_factory=tuple)
    """mids at increasing horizons after the fill (e.g. +1s, +5s, +30s)"""


def markout_profile(
    side: Side, mid_at_trade: float, mids_after: Sequence[float]
) -> List[float]:
    """Markout profile of one fill: the signed post-fill mid move at each
    horizon, ``dir(side) * (mid_h - mid_at_trade)``. Positive = the market moved
    the taker's way (adverse selection for the provider). Returns a list the same
    length as ``mids_after``.
    """
    d = _dir(side)
    return [d * (m - mid_at_trade) for m in mids_after]


def adverse_selection_score(
    side: Side, mid_at_trade: float, mid_after: float, spread: float
) -> float:
    """Adverse-selection (toxicity) score: a markout normalized by the
    half-spread, ``dir(side)*(mid_after - mid_at_trade) / (spread/2)``. The
    post-fill move in units of the spread cushion - above 1 means the price moved
    further than the half-spread, i.e. the fill was toxic beyond what the quoted
    spread paid for. Returns 0 for a non-positive spread.
    """
    if spread <= 0:
        return 0.0
    return (_dir(side) * (mid_after - mid_at_trade)) / (spread / 2.0)


def average_markout_profile(
    observations: Sequence[MarkoutProfileObservation],
) -> List[float]:
    """Average markout profile across many fills: the mean markout at each
    horizon, the aggregate adverse-selection curve. Observations may have
    different-length ``mids_after``; each horizon is averaged over the fills that
    reach it. Returns an empty list for no observations.
    """
    if not observations:
        return []
    horizons = max(len(o.mids_after) for o in observations)

    out: List[float] = []
    for h in range(horizons):
        total = 0.0
        count = 0
        for o in observations:
            if h < len(o.mids_after):
                total += _dir(o.side) * (o.mids_after[h] - o.mid_at_trade)
                count += 1
        out.append(0.0 if count == 0 else total / count)
    return out
