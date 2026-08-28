"""Two-Scale Realized Variance (TSRV) - Zhang, Mykland & Ait-Sahalia (2005).

Plain realized variance is biased upward by microstructure noise, and sparse
(subsampled) realized variance reduces that bias but doesn't remove it. TSRV
removes it: it combines two sampling scales - a slow, subsampled RV and the fast
all-ticks RV (essentially a pure measurement of the noise) - and subtracts a
bias correction, yielding a *consistent* estimator of integrated variance that
uses every observation.

    TSRV = (1 - nbar/n)^-1 * ( RV_sparse(K) - (nbar/n) * RV_all )

where RV_all is the finest-grid sum(r**2), RV_sparse(K) is realized variance on
a grid K times coarser averaged over all K offsets (subsampling), and
nbar = (n - K + 1)/K is the average number of returns per slow subgrid. `K` (the
slow scale) is best read off a volatility signature plot (see the ``noise``
module).
"""
from __future__ import annotations

import math
from typing import Sequence

from .noise import sparse_realized_variance


def _realized_var_all(returns: Sequence[float]) -> float:
    return sum(r * r for r in returns)


def two_scale_realized_variance(returns: Sequence[float], slow_scale: int) -> float:
    """Two-scale realized variance: a microstructure-noise-consistent estimator
    of integrated variance. ``slow_scale`` (K >= 2) is the coarse sampling
    factor. Returns plain realized variance for ``slow_scale < 2`` and 0 for
    fewer than two returns. The estimate can be slightly negative in
    heavy-noise / very-small-sample cases, like any bias-corrected variance
    estimator.
    """
    n = len(returns)
    k = int(slow_scale)
    if n < 2:
        return 0.0
    if k < 2:
        return _realized_var_all(returns)

    rv_sparse = sparse_realized_variance(returns, k)
    rv_all = _realized_var_all(returns)
    n_bar = (n - k + 1) / k
    adj = 1.0 - n_bar / n
    if adj <= 0:
        return rv_sparse
    return (rv_sparse - (n_bar / n) * rv_all) / adj


def two_scale_realized_volatility(returns: Sequence[float], slow_scale: int) -> float:
    """Square root of :func:`two_scale_realized_variance`, floored at 0."""
    v = two_scale_realized_variance(returns, slow_scale)
    return math.sqrt(v) if v > 0 else 0.0
