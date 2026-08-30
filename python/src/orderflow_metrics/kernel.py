"""Realized kernel - Barndorff-Nielsen, Hansen, Lund & Shephard (2008).

The flagship noise-robust estimator of integrated variance. Plain realized
variance (sum r_i**2) is inflated by microstructure noise; the two-scale
estimator (``tsrv``) corrects it with two sampling grids. The realized kernel
corrects it differently and more efficiently: it adds *weighted realized
autocovariances* of the returns, which cancel the bias the noise injects into
the neighbouring lags.

    K(X) = gamma_0 + sum_{h=1}^{H} k( h / (H+1) ) * ( gamma_h + gamma_{-h} )

where gamma_h = sum_j r_j * r_{j-h} is the realized autocovariance at lag h
(gamma_0 is plain RV, gamma_{-h} = gamma_h), ``H`` is the bandwidth (how many
lags to include), and k(.) is the Parzen kernel - a smooth, positive-
semidefinite weight that guarantees a non-negative estimate:

    k(x) = 1 - 6x**2 + 6x**3   for 0 <= x <= 1/2
    k(x) = 2(1 - x)**3         for 1/2 < x <= 1
    k(x) = 0                   for x > 1

Larger ``H`` removes more noise bias at the cost of variance; in practice it's
chosen proportional to n**(3/5) from the noise-to-signal ratio, or read off a
volatility signature plot (see the ``noise`` module).
"""
from __future__ import annotations

import math
from typing import Sequence


def parzen_kernel(x: float) -> float:
    """The Parzen kernel weight, k(x), for x >= 0."""
    if x <= 0:
        return 1.0
    if x <= 0.5:
        return 1 - 6 * x * x + 6 * x * x * x
    if x <= 1:
        u = 1 - x
        return 2 * u * u * u
    return 0.0


def realized_autocovariance(returns: Sequence[float], h: int) -> float:
    """Realized autocovariance at lag ``h`` (h >= 0): sum_j r_j * r_{j-h} over
    the overlapping returns. ``h = 0`` is plain realized variance. Returns 0
    when ``h`` is negative or ``h >= len(returns)``.
    """
    n = len(returns)
    if h < 0 or h >= n:
        return 0.0
    return sum(returns[j] * returns[j - h] for j in range(h, n))


def realized_kernel(returns: Sequence[float], bandwidth: int) -> float:
    """Realized kernel: a microstructure-noise-robust estimator of integrated
    variance using Parzen-weighted realized autocovariances up to lag
    ``bandwidth``. The Parzen kernel makes the estimate non-negative by
    construction. ``bandwidth < 1`` falls back to plain realized variance
    (gamma_0); a ``bandwidth`` at or above the sample length is clamped to
    ``n - 1``. Returns 0 for an empty series.
    """
    n = len(returns)
    if n == 0:
        return 0.0
    gamma0 = realized_autocovariance(returns, 0)
    h = int(bandwidth)
    if h < 1:
        return gamma0
    h_max = min(h, n - 1)
    k = gamma0
    for lag in range(1, h_max + 1):
        # gamma_h + gamma_{-h} = 2 * gamma_h (realized autocovariance is symmetric)
        k += parzen_kernel(lag / (h + 1)) * 2.0 * realized_autocovariance(returns, lag)
    return k


def realized_kernel_volatility(returns: Sequence[float], bandwidth: int) -> float:
    """Square root of :func:`realized_kernel`, floored at 0."""
    v = realized_kernel(returns, bandwidth)
    return math.sqrt(v) if v > 0 else 0.0
