"""Realized higher moments from an intraday return series.

Following Amaya, Christoffersen, Jacobs & Vasquez (2015), the realized skewness
and kurtosis of a set of high-frequency returns summarise the shape of the
intraday return distribution — asymmetry and tail heaviness — beyond what
realized variance (see :mod:`volatility`) captures. Realized skewness in
particular has been shown to predict the cross-section of subsequent returns.

With N returns r and realized variance RV = sum(r**2):

    realized skewness = sqrt(N) * sum(r**3) / RV**1.5
    realized kurtosis = N * sum(r**4) / RV**2

The sqrt(N) and N scalings make the estimates comparable across sampling
frequencies. Both return 0 for an empty series or one with no variation.
"""
from __future__ import annotations

import math
from typing import Sequence


def realized_skewness(returns: Sequence[float]) -> float:
    """Realized skewness: sqrt(N) * sum(r**3) / (sum(r**2))**1.5."""
    n = len(returns)
    if n == 0:
        return 0.0
    s2 = 0.0
    s3 = 0.0
    for r in returns:
        r2 = r * r
        s2 += r2
        s3 += r2 * r
    if s2 == 0:
        return 0.0
    return math.sqrt(n) * s3 / s2 ** 1.5


def realized_kurtosis(returns: Sequence[float]) -> float:
    """Realized kurtosis: N * sum(r**4) / (sum(r**2))**2."""
    n = len(returns)
    if n == 0:
        return 0.0
    s2 = 0.0
    s4 = 0.0
    for r in returns:
        r2 = r * r
        s2 += r2
        s4 += r2 * r2
    if s2 == 0:
        return 0.0
    return n * s4 / (s2 * s2)
