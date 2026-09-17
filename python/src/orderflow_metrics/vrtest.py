"""The Lo-MacKinlay variance-ratio test - a formal test of the random-walk hypothesis.

``variance_ratio`` (in the efficiency module) reports the ratio itself; this is the test
around it. Lo & MacKinlay (1988), "Stock Market Prices Do Not Follow Random Walks:
Evidence from a Simple Specification Test" (Review of Financial Studies 1(1), 41-66),
ask whether that ratio is far enough from 1 to reject a random walk.

If returns are a random walk, the variance of a q-period return is exactly q times the
variance of a one-period return, so the variance ratio ``VR(q) = sigma2(q)/(q*sigma2(1))``
is 1. VR > 1 signals positive autocorrelation (trending / momentum); VR < 1 signals mean
reversion. The test standardizes ``VR(q) - 1`` into a z-statistic that is asymptotically
standard normal under the null: ``z(q) = sqrt(n)*(VR(q)-1)/sqrt(theta(q))``, with two
variants of theta. The homoskedastic form (``z_statistic``) assumes constant variance,
``theta = 2(2q-1)(q-1)/(3q)``. The heteroskedasticity-robust form (``robust_z_statistic``)
- the one to trust on real returns, whose volatility clusters - replaces theta with a sum
of autocorrelation-weighted return-square products. Each comes with a two-sided p-value.

Uses the overlapping, bias-corrected estimator of Lo & MacKinlay (matching the standard
implementation), and the dependency-free ``standard_normal_cdf`` from ``vpin`` for the
p-values. Pass log returns; ``q >= 2``.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

from .vpin import standard_normal_cdf


@dataclass(frozen=True)
class VarianceRatioResult:
    """Result of the Lo-MacKinlay variance-ratio test at a given aggregation ``q``."""

    ratio: float  # VR(q); 1 under a random walk, >1 trending, <1 mean-reverting
    z_statistic: float  # homoskedastic z-statistic (assumes constant variance)
    robust_z_statistic: float  # heteroskedasticity-robust z-statistic
    p_value: float  # two-sided p-value for z_statistic
    robust_p_value: float  # two-sided p-value for robust_z_statistic


_NAN = VarianceRatioResult(math.nan, math.nan, math.nan, math.nan, math.nan)


def _two_sided(z: float) -> float:
    if math.isnan(z):
        return math.nan
    return 2 - 2 * standard_normal_cdf(abs(z))


def variance_ratio_test(returns: Sequence[float], q: int = 2) -> VarianceRatioResult:
    """Lo-MacKinlay variance-ratio test at aggregation ``q`` (default 2). Returns the
    variance ratio plus the homoskedastic and heteroskedasticity-robust z-statistics and
    their two-sided p-values, using the overlapping bias-corrected estimator. A ratio
    near 1 (large p-value) is consistent with a random walk; a small p-value rejects it,
    with the ratio's side telling you momentum (>1) or mean reversion (<1). Returns all
    ``nan`` for ``q < 2``, fewer than ``q + 1`` returns, or a zero-variance series. Pass
    log returns.
    """
    nq = len(returns)
    if not isinstance(q, int) or q < 2 or nq <= q:
        return _NAN

    mu = sum(returns) / nq
    s1 = sum((r - mu) ** 2 for r in returns)
    sigma2_1 = s1 / (nq - 1)
    if not (sigma2_1 > 0):
        return _NAN

    # overlapping q-period returns via a cumulative-sum level series
    level = [0.0] * (nq + 1)
    for i in range(nq):
        level[i + 1] = level[i] + returns[i]
    sq = 0.0
    for t in range(q, nq + 1):
        e = (level[t] - level[t - q]) - q * mu
        sq += e * e
    m = q * (nq - q + 1) * (1 - q / nq)
    sigma2_q = sq / m
    ratio = sigma2_q / sigma2_1

    theta_homo = (2 * (2 * q - 1) * (q - 1)) / (3 * q)
    z_stat = math.sqrt(nq) * (ratio - 1) / math.sqrt(theta_homo)

    z2 = [(r - mu) ** 2 for r in returns]
    scale = sum(z2) ** 2
    theta_robust = 0.0
    for k in range(1, q):
        acc = sum(z2[t] * z2[t - k] for t in range(k, nq))
        delta = nq * acc / scale
        theta_robust += 4 * (1 - k / q) ** 2 * delta
    robust_z = (
        math.sqrt(nq) * (ratio - 1) / math.sqrt(theta_robust)
        if theta_robust > 0
        else math.nan
    )

    return VarianceRatioResult(
        ratio=ratio,
        z_statistic=z_stat,
        robust_z_statistic=robust_z,
        p_value=_two_sided(z_stat),
        robust_p_value=_two_sided(robust_z),
    )
