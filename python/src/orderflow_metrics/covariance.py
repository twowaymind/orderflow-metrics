"""Realized covariance, correlation, and beta between two return series.

Single-asset volatility says how much one instrument moved; trading and risk
live in how instruments move *together*. Summing the products of contemporaneous
returns gives the realized (co)variance — the model-free, high-frequency analogue
of covariance:

    realized covariance   = sum(x[i] * y[i])
    realized correlation  = sum(x*y) / (sqrt(sum(x**2)) * sqrt(sum(y**2)))   in [-1, 1]
    realized beta         = sum(a*m) / sum(m**2)                             (asset a vs market m)

The two series are paired element-wise over their common length, so they must be
aligned to the same sampling grid (equal length, matching timestamps).
Correlation is scale-free; beta is the covariance of an asset with a market,
normalized by the market's variance — the sensitivity of the asset to it.
"""
from __future__ import annotations

import math
from typing import Sequence


def realized_covariance(x: Sequence[float], y: Sequence[float]) -> float:
    """sum(x[i] * y[i]) over contemporaneous returns.

    Symmetric in its arguments; returns 0 for empty input. Series are paired over
    their common length, so align them to the same sampling grid first.
    """
    n = min(len(x), len(y))
    return sum(x[i] * y[i] for i in range(n))


def realized_correlation(x: Sequence[float], y: Sequence[float]) -> float:
    """sum(x*y) / (sqrt(sum(x**2)) * sqrt(sum(y**2))), in [-1, 1].

    Scale-free measure of co-movement. Returns 0 when either series has zero
    realized variance (or is empty).
    """
    n = min(len(x), len(y))
    if n == 0:
        return 0.0
    sxy = sxx = syy = 0.0
    for i in range(n):
        sxy += x[i] * y[i]
        sxx += x[i] * x[i]
        syy += y[i] * y[i]
    denom = math.sqrt(sxx) * math.sqrt(syy)
    return sxy / denom if denom > 0 else 0.0


def realized_beta(asset: Sequence[float], market: Sequence[float]) -> float:
    """sum(a*m) / sum(m**2): realized covariance divided by the market's realized
    variance — the asset's sensitivity to the market.

    Returns 0 when the market has zero realized variance (or the input is empty).
    """
    n = min(len(asset), len(market))
    if n == 0:
        return 0.0
    cov = varm = 0.0
    for i in range(n):
        cov += asset[i] * market[i]
        varm += market[i] * market[i]
    return cov / varm if varm > 0 else 0.0
