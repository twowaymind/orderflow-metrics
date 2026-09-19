"""Portmanteau autocorrelation tests - is a series *serially uncorrelated*, or is there
structure left to exploit?

``efficiency`` gives a single lag-k autocorrelation and the variance ratio; these two roll
the *whole* autocorrelation function up to lag h into one number and turn it into a formal
hypothesis test. Under the null "the series is white noise" both statistics are chi2 with h
degrees of freedom, so a small p-value says: the autocorrelations up to lag h are jointly
too large to be chance - the series is predictable (return autocorrelation,
momentum/mean-reversion) or, run on squared returns, has volatility clustering; run on
model residuals, the model is misspecified.

    - ``ljung_box`` (Ljung & Box 1978) - the standard portmanteau test,
      Q = n(n+2)*sum_{k=1..h} rho_k^2/(n-k), chi2(h). The (n+2)/(n-k) weighting is a
      small-sample refinement of Box-Pierce and is what almost everyone reports.
    - ``box_pierce`` (Box & Pierce 1970) - the original, Q = n*sum_{k=1..h} rho_k^2,
      chi2(h); kept for completeness and because some references still quote it.

When the series is the residual of a fitted ARMA(p, q), pass ``fitted_params = p + q``: the
degrees of freedom drop to h - (p + q), as Ljung-Box prescribes. The chi2 p-value uses an
exact regularized incomplete gamma (``math.lgamma`` + a series/continued-fraction split),
valid for *any* degrees of freedom - no statistics library. ``nan`` for a series shorter
than ``lags + 1``, ``lags < 1``, a constant series, or degrees of freedom below 1.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class PortmanteauResult:
    """Result of a portmanteau (Ljung-Box / Box-Pierce) autocorrelation test."""

    statistic: float  # the Q test statistic (chi2 distributed under the white-noise null)
    degrees_of_freedom: float  # df of the chi2 reference (lags - fitted_params)
    p_value: float  # p-value; a small value rejects the "no autocorrelation" null


_NAN = PortmanteauResult(math.nan, math.nan, math.nan)


def _lower_gamma_series(a: float, x: float) -> float:
    """Lower regularized incomplete gamma P(a, x) via the series expansion (x < a+1)."""
    if x <= 0:
        return 0.0
    ap = a
    total = 1.0 / a
    delta = total
    for _ in range(1000):
        ap += 1
        delta *= x / ap
        total += delta
        if abs(delta) < abs(total) * 1e-16:
            break
    return total * math.exp(-x + a * math.log(x) - math.lgamma(a))


def _upper_gamma_cf(a: float, x: float) -> float:
    """Upper regularized incomplete gamma Q(a, x) via the Lentz continued fraction (x >= a+1)."""
    tiny = 1e-300
    b = x + 1 - a
    c = 1.0 / tiny
    d = 1.0 / b
    h = d
    for i in range(1, 1000):
        an = -i * (i - a)
        b += 2
        d = an * d + b
        if abs(d) < tiny:
            d = tiny
        c = b + an / c
        if abs(c) < tiny:
            c = tiny
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1) < 1e-16:
            break
    return math.exp(-x + a * math.log(x) - math.lgamma(a)) * h


def chi_square_survival(x: float, df: float) -> float:
    """Upper tail of the chi2 distribution, P(chi2_df > x), for any positive degrees of
    freedom. Exact and dependency-free via the regularized incomplete gamma Q(df/2, x/2).
    Returns 1 for ``x <= 0`` and ``nan`` for ``df <= 0``.
    """
    if not (df > 0):
        return math.nan
    if not (x > 0):
        return 1.0
    a = df / 2.0
    y = x / 2.0
    return 1.0 - _lower_gamma_series(a, y) if y < a + 1 else _upper_gamma_cf(a, y)


def _autocorrelations(series: Sequence[float], h: int) -> list[float] | None:
    """Autocorrelations rho_1..rho_h (biased estimator, full-sample variance denominator)."""
    n = len(series)
    mean = sum(series) / n
    dev = [v - mean for v in series]
    den = 0.0
    for d in dev:
        den += d * d
    if den == 0:
        return None  # constant series - autocorrelation undefined
    rho = []
    for k in range(1, h + 1):
        num = 0.0
        for t in range(k, n):
            num += dev[t] * dev[t - k]
        rho.append(num / den)
    return rho


def ljung_box(
    series: Sequence[float], lags: int, fitted_params: int = 0
) -> PortmanteauResult:
    """Ljung-Box portmanteau test (1978) for autocorrelation up to lag ``lags``:
    Q = n(n+2)*sum_{k=1..h} rho_k^2/(n-k), compared to chi2 with ``lags - fitted_params``
    degrees of freedom. ``series`` is the values to test (returns, or model residuals, or
    squared returns for a volatility-clustering check); ``lags`` (h) the number of
    autocorrelation lags to jointly test; ``fitted_params`` (default 0) the number of
    estimated ARMA parameters when ``series`` is a residual, which reduces the degrees of
    freedom. Returns the statistic, its degrees of freedom, and a p-value - a small p-value
    rejects the white-noise null. ``nan`` for ``series`` shorter than ``lags + 1``,
    ``lags < 1``, a constant series, or degrees of freedom below 1.
    """
    n = len(series)
    df = lags - fitted_params
    if lags < 1 or n < lags + 1 or df < 1:
        return _NAN
    rho = _autocorrelations(series, lags)
    if rho is None:
        return _NAN
    q = 0.0
    for k in range(1, lags + 1):
        q += rho[k - 1] * rho[k - 1] / (n - k)
    q *= n * (n + 2)
    return PortmanteauResult(q, df, chi_square_survival(q, df))


def box_pierce(
    series: Sequence[float], lags: int, fitted_params: int = 0
) -> PortmanteauResult:
    """Box-Pierce portmanteau test (1970), the original: Q = n*sum_{k=1..h} rho_k^2,
    compared to chi2 with ``lags - fitted_params`` degrees of freedom. Same inputs and null
    as ``ljung_box`` but without the (n+2)/(n-k) small-sample weighting - ``ljung_box`` is
    preferred in practice; this is kept for completeness. Returns the statistic, its degrees
    of freedom, and a p-value. ``nan`` for ``series`` shorter than ``lags + 1``,
    ``lags < 1``, a constant series, or degrees of freedom below 1.
    """
    n = len(series)
    df = lags - fitted_params
    if lags < 1 or n < lags + 1 or df < 1:
        return _NAN
    rho = _autocorrelations(series, lags)
    if rho is None:
        return _NAN
    q = 0.0
    for k in range(1, lags + 1):
        q += rho[k - 1] * rho[k - 1]
    q *= n
    return PortmanteauResult(q, df, chi_square_survival(q, df))
