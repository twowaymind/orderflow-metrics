"""Downside and upside beta - conditional, sign-asymmetric market sensitivity.

Ordinary (realized) beta averages an asset's co-movement with the market over
all days - but the co-movement that gets *priced* is the one on the way down.
Ang, Chen & Xing (2006), "Downside Risk", split beta by the sign of the market
return::

    beta_minus = Cov(r_i, r_m | r_m < 0) / Var(r_m | r_m < 0)   # down-market beta
    beta_plus  = Cov(r_i, r_m | r_m > 0) / Var(r_m | r_m > 0)   # up-market beta

Each is an ordinary regression beta computed only over the periods where the
market moved the relevant way (covariance and variance both demeaned within that
subset - a *conditional* beta, not the uncentered ``realized_beta`` in
``covariance``). An asset with beta_minus > beta_plus tightens its grip on the
market exactly when the market falls: the downside-risk asymmetry investors
demand a premium for. ``beta_asymmetry`` is that gap, beta_minus - beta_plus.

Returns beyond their common length are ignored; the series are paired by index
(align them to the same market first). Returns ``nan`` when a side has fewer than
two qualifying periods or zero conditional market variance.
"""
from __future__ import annotations

import math
from typing import List, Sequence


def _conditional_beta(
    asset: Sequence[float], market: Sequence[float], want_positive: bool
) -> float:
    """Ordinary regression beta over the periods where the market has the wanted sign."""
    n = min(len(asset), len(market))
    a: List[float] = []
    m: List[float] = []
    for i in range(n):
        if (market[i] > 0) if want_positive else (market[i] < 0):
            a.append(asset[i])
            m.append(market[i])
    k = len(m)
    if k < 2:
        return math.nan

    mean_a = sum(a) / k
    mean_m = sum(m) / k
    cov = 0.0
    var_m = 0.0
    for i in range(k):
        dm = m[i] - mean_m
        cov += (a[i] - mean_a) * dm
        var_m += dm * dm
    return math.nan if var_m == 0 else cov / var_m


def downside_beta(asset: Sequence[float], market: Sequence[float]) -> float:
    """Downside beta: the asset's regression beta computed only over days the
    market fell (``market < 0``) - Ang, Chen & Xing (2006). ``nan`` for fewer
    than two down-market days or zero conditional market variance.
    """
    return _conditional_beta(asset, market, False)


def upside_beta(asset: Sequence[float], market: Sequence[float]) -> float:
    """Upside beta: the asset's regression beta computed only over days the
    market rose (``market > 0``). ``nan`` for fewer than two up-market days or
    zero conditional market variance.
    """
    return _conditional_beta(asset, market, True)


def beta_asymmetry(asset: Sequence[float], market: Sequence[float]) -> float:
    """Beta asymmetry ``beta_minus - beta_plus``: how much more the asset
    co-moves with the market on the way down than on the way up. Positive = extra
    downside sensitivity (the priced kind). ``nan`` if either conditional beta is
    undefined.
    """
    return downside_beta(asset, market) - upside_beta(asset, market)
