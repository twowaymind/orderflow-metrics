"""Realized volatility from a return series.

Returns are period returns (e.g. log returns between consecutive prints or
bars). Realized variance is the sum of squared returns; realized volatility is
its square root. Annualized volatility scales the per-period variance by the
number of periods in a year (zero-mean convention, standard for high-frequency
returns).
"""
from __future__ import annotations

import math
from typing import Sequence


def realized_variance(returns: Sequence[float]) -> float:
    """Realized variance: sum of squared returns."""
    return sum(r * r for r in returns)


def realized_volatility(returns: Sequence[float]) -> float:
    """Realized volatility over the sample: sqrt(sum of squared returns)."""
    return math.sqrt(realized_variance(returns))


def annualized_volatility(returns: Sequence[float], periods_per_year: float) -> float:
    """Annualized volatility: sqrt( mean(r^2) * periods_per_year ).

    ``periods_per_year`` is how many return periods make up a year (e.g. 252 for
    daily, 252*390 for 1-minute equity bars). Returns 0 for an empty series.
    """
    n = len(returns)
    if n == 0:
        return 0.0
    return math.sqrt((realized_variance(returns) / n) * periods_per_year)
