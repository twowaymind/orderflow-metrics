"""Realized semivariance and signed jump variation
(Barndorff-Nielsen, Kinnebrock & Shephard, 2010; Patton & Shephard, 2015).

Realized variance (RV = sum(r**2)) treats an up-move and a down-move of equal
size as identical risk. But most traders care far more about the downside.
Realized semivariance splits RV by the *sign* of each return:

    RS+ = sum(r**2 for r > 0)   (upside)
    RS- = sum(r**2 for r < 0)   (downside)
    RS+ + RS- = RV              (zero returns contribute to neither)

The two halves carry different information: RS- (bad volatility) is the part
that predicts future risk and demands a premium, while RS+ (good volatility)
behaves quite differently. Their difference is the *signed* jump variation,
which — unlike ordinary jump variation — keeps the direction of jump risk:

    signed jump variation = RS+ - RS-

A positive value means upside moves dominate; a negative value means the series
is downside-heavy. Each function takes a return series.
"""
from __future__ import annotations

from typing import NamedTuple, Sequence


class Semivariance(NamedTuple):
    """Upside / downside decomposition of realized variance. Both are >= 0."""

    upside: float
    downside: float


def realized_semivariance(returns: Sequence[float]) -> Semivariance:
    """Split realized variance into upside (RS+) and downside (RS-) parts.

    Zero returns are ignored, so ``upside + downside`` equals realized variance.
    An empty series returns ``Semivariance(0.0, 0.0)``.
    """
    upside = 0.0
    downside = 0.0
    for r in returns:
        if r > 0:
            upside += r * r
        elif r < 0:
            downside += r * r
    return Semivariance(upside, downside)


def downside_variance_ratio(returns: Sequence[float]) -> float:
    """RS- / (RS+ + RS-): the share of realized variance from negative returns.

    In [0, 1]; returns 0 when realized variance is 0 (or the series is empty).
    A value above 0.5 marks a downside-heavy window.
    """
    upside, downside = realized_semivariance(returns)
    total = upside + downside
    return downside / total if total > 0 else 0.0


def signed_jump_variation(returns: Sequence[float]) -> float:
    """RS+ - RS- (Patton & Shephard, 2015).

    Positive when upside moves dominate, negative when downside moves dominate;
    unlike jump variation it can take either sign. Returns 0 for an empty series.
    """
    upside, downside = realized_semivariance(returns)
    return upside - downside
