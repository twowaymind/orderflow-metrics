"""Mean reversion and the Ornstein-Uhlenbeck timescale.

A spread, a pair residual, or any stationary series that drifts back toward an
equilibrium can be described by a discrete Ornstein-Uhlenbeck / AR(1) process::

    y_t - y_{t-1} = kappa * (mu - y_{t-1}) + eps_t

where ``kappa`` is the *speed* of mean reversion per step. Regressing the change
``dy_t`` on the lagged level ``y_{t-1}`` recovers a slope ``b = -kappa``, so
``kappa = -b``. From the speed comes the **half-life** - the number of steps a
deviation takes to decay halfway back to the mean, ``ln 2 / kappa`` - the
horizon a pairs / stat-arb strategy actually trades on (Ornstein & Uhlenbeck
1930; the pairs-trading formulation in e.g. Chan 2013). The **z-score** turns
the latest observation into a standardized deviation from the sample mean, the
entry / exit signal itself.

These complement the regime diagnostics in ``efficiency`` (variance ratio) and
``hurst``: those label a series as trending vs mean-reverting, while these
quantify *how fast* it reverts and *how far* it is from home right now. All
three operate on a **level / spread** series, not a return series.
"""
from __future__ import annotations

import math
from typing import Sequence


def mean_reversion_speed(series: Sequence[float]) -> float:
    """Ornstein-Uhlenbeck mean-reversion speed ``kappa`` per step: the negated
    OLS slope of the change ``dy_t`` on the lagged level ``y_{t-1}``.

    ::

        kappa > 0  mean-reverting (larger = faster pull back to the mean)
        kappa = 0  random walk (no reversion)
        kappa < 0  trending / explosive (deviations grow)

    Returns 0 for degenerate input (fewer than 3 points, or a lagged level with
    zero variance).
    """
    n = len(series)
    if n < 3:
        return 0.0

    m = n - 1  # pairs (lagged level, change), t = 1 .. n-1
    xbar = sum(series[t - 1] for t in range(1, n)) / m
    dbar = sum(series[t] - series[t - 1] for t in range(1, n)) / m

    sxx = 0.0
    sxd = 0.0
    for t in range(1, n):
        dx = series[t - 1] - xbar
        dd = (series[t] - series[t - 1]) - dbar
        sxx += dx * dx
        sxd += dx * dd
    if sxx == 0:
        return 0.0

    slope = sxd / sxx  # b = -kappa
    return -slope


def half_life(series: Sequence[float]) -> float:
    """Half-life of mean reversion: ``ln 2 / kappa``, the number of steps a
    deviation takes to decay halfway back to the mean. Returns ``inf`` when the
    series is not mean-reverting (``kappa <= 0``) - a deviation never reverts.
    """
    kappa = mean_reversion_speed(series)
    if kappa <= 0:
        return math.inf
    return math.log(2.0) / kappa


def z_score(series: Sequence[float]) -> float:
    """Z-score of the most recent observation: ``(last - mean) / stddev`` over
    the whole series, using the population standard deviation. A positive value
    is a deviation above the mean, a negative one below; magnitude is how many
    standard deviations from home the series sits right now - the raw
    mean-reversion trading signal. Returns 0 for empty input or a constant
    series (zero dispersion).
    """
    n = len(series)
    if n == 0:
        return 0.0

    mean = sum(series) / n
    variance = sum((v - mean) ** 2 for v in series) / n
    sd = math.sqrt(variance)
    if sd == 0:
        return 0.0
    return (series[-1] - mean) / sd
