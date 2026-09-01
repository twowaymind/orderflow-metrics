"""Realized semicovariance - Bollerslev, Li, Patton & Quaedvlieg (2020).

Realized covariance (sum x_i*y_i, see ``covariance``) treats every co-movement
the same, whether the two assets rose together, fell together, or moved in
opposite directions. Those cases mean very different things for a portfolio:
assets crashing *together* is the risk that actually hurts. Realized
semicovariance splits the realized covariance by the signs of the two returns
into three components that sum back to it:

    P (concordant positive) = sum max(x_i,0)*max(y_i,0)          - both up
    N (concordant negative) = sum min(x_i,0)*min(y_i,0)          - both down
    M (mixed / discordant)  = sum [max(x_i,0)*min(y_i,0) + min(x_i,0)*max(y_i,0)]

    P + N + M = realized covariance   (P >= 0, N >= 0, M <= 0)

It is the cross-asset analogue of realized semivariance (``semivar``). The
*negative* component ``N`` - the covariance built purely from joint downside
moves - is the one that drives crash correlation and downside beta, and it
predicts future covariance better than the mixed part. Series are paired
element-wise over their common length, so align them to the same sampling grid
first.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class Semicovariance:
    """The three sign-based components of realized covariance; they sum to it."""

    positive: float
    """concordant positive: both returns up - sum max(x,0)*max(y,0) (>= 0)"""
    negative: float
    """concordant negative: both returns down - sum min(x,0)*min(y,0) (>= 0)"""
    mixed: float
    """mixed / discordant: opposite-sign returns (<= 0)"""


def realized_semicovariance(
    x: Sequence[float], y: Sequence[float]
) -> Semicovariance:
    """Realized semicovariance: the sign-decomposition of realized covariance
    into concordant-positive (both up), concordant-negative (both down), and
    mixed (opposite signs) parts. The three components sum to
    ``realized_covariance(x, y)``; ``positive`` and ``negative`` are
    non-negative and ``mixed`` is non-positive. The ``negative`` component is
    joint downside covariance - the crash-risk half. Both empty -> all zeros.
    """
    n = min(len(x), len(y))
    positive = negative = mixed = 0.0
    for i in range(n):
        xp = x[i] if x[i] > 0 else 0.0
        xm = x[i] if x[i] < 0 else 0.0
        yp = y[i] if y[i] > 0 else 0.0
        ym = y[i] if y[i] < 0 else 0.0
        positive += xp * yp
        negative += xm * ym
        mixed += xp * ym + xm * yp
    return Semicovariance(positive, negative, mixed)
