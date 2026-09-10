"""HAR-RV - the Heterogeneous Autoregressive model of Realized Volatility
(Corsi 2009).

Realized volatility is persistent: a volatile day is followed by volatile days, and
the memory decays slowly. Corsi (2009), "A Simple Approximate Long-Memory Model of
Realized Volatility" (Journal of Financial Econometrics 7(2), 174-196), captures that
long memory without any fractional-integration machinery. It regresses tomorrow's
realized variance on three averages of the past - a *daily* term (yesterday), a
*weekly* term (the last 5), and a *monthly* term (the last 22) - each standing in for
a class of market participant acting on a different horizon::

    RV_{t+1} = b0 + b_d * RV_t^(d) + b_w * RV_t^(w) + b_m * RV_t^(m) + e_t

where ``RV_t^(d) = RV_t``, ``RV_t^(w) = mean(RV_{t-4}..RV_t)``, ``RV_t^(m) =
mean(RV_{t-21}..RV_t)``. Three regressors and an intercept reproduce the slow decay
that makes volatility forecastable, and the model is the workhorse benchmark for
realized-volatility forecasting. ``har_forecast`` fits it by ordinary least squares
over the supplied history and returns the one-step-ahead forecast together with the
coefficients; the OLS solve uses a dependency-free Gaussian elimination - no
linear-algebra library. Feed a series of per-period realized variances (or
volatilities).
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional, Sequence


@dataclass(frozen=True)
class HarComponents:
    """The three heterogeneous components of a realized-volatility series."""

    daily: float  # RV_t^(d) - the most recent observation
    weekly: float  # RV_t^(w) - mean of the last `weekly` observations
    monthly: float  # RV_t^(m) - mean of the last `monthly` observations


@dataclass(frozen=True)
class HarCoefficients:
    intercept: float
    daily: float
    weekly: float
    monthly: float


@dataclass(frozen=True)
class HarForecast:
    """Fitted HAR-RV coefficients and the resulting one-step-ahead forecast."""

    forecast: float
    coefficients: HarCoefficients


def _mean(xs: Sequence[float], lo: int, hi: int) -> float:
    return sum(xs[lo : hi + 1]) / (hi - lo + 1)


def har_components(
    rv: Sequence[float], weekly: int = 5, monthly: int = 22
) -> HarComponents:
    """The latest heterogeneous components of a realized-volatility series: the most
    recent value (``daily``), the mean of the last ``weekly`` values, and the mean of
    the last ``monthly`` values (Corsi 2009). A window longer than the series averages
    over whatever is available. Returns all ``nan`` for an empty series.
    """
    n = len(rv)
    if n == 0:
        return HarComponents(math.nan, math.nan, math.nan)
    w = max(1, int(weekly))
    m = max(1, int(monthly))
    return HarComponents(
        daily=rv[n - 1],
        weekly=_mean(rv, max(0, n - w), n - 1),
        monthly=_mean(rv, max(0, n - m), n - 1),
    )


def _solve(a: List[List[float]], b: List[float]) -> Optional[List[float]]:
    """Solve a*x = b by Gaussian elimination with partial pivoting; None if singular."""
    n = len(b)
    m = [list(row) + [b[i]] for i, row in enumerate(a)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(m[r][c]))
        if abs(m[piv][c]) < 1e-15:
            return None
        m[c], m[piv] = m[piv], m[c]
        for r in range(n):
            if r == c:
                continue
            f = m[r][c] / m[c][c]
            for k in range(c, n + 1):
                m[r][k] -= f * m[c][k]
    return [m[i][n] / m[i][i] for i in range(n)]


def har_forecast(
    rv: Sequence[float], weekly: int = 5, monthly: int = 22
) -> HarForecast:
    """Fit the HAR-RV model of Corsi (2009) to a realized-volatility series by
    ordinary least squares and return the one-step-ahead forecast with the fitted
    coefficients. Regresses each ``RV_{t+1}`` on ``[1, RV_t^(d), RV_t^(w), RV_t^(m)]``
    over every date with a full monthly window and a next-day target, then applies the
    fit to the tail of the series. Needs at least ``monthly + 4`` observations (four
    parameters); returns all ``nan`` on too little data or a singular design.
    """
    n = len(rv)
    w = max(1, int(weekly))
    m = max(1, int(monthly))
    nan = HarForecast(math.nan, HarCoefficients(math.nan, math.nan, math.nan, math.nan))
    if n < m + 4:
        return nan

    X: List[List[float]] = []
    y: List[float] = []
    for t in range(m - 1, n - 1):
        X.append([1.0, rv[t], _mean(rv, t - w + 1, t), _mean(rv, t - m + 1, t)])
        y.append(rv[t + 1])

    p = 4
    xtx = [[0.0] * p for _ in range(p)]
    xty = [0.0] * p
    for r in range(len(X)):
        for i in range(p):
            xty[i] += X[r][i] * y[r]
            for j in range(p):
                xtx[i][j] += X[r][i] * X[r][j]

    beta = _solve(xtx, xty)
    if beta is None:
        return nan

    c = har_components(rv, weekly=w, monthly=m)
    forecast = beta[0] + beta[1] * c.daily + beta[2] * c.weekly + beta[3] * c.monthly
    return HarForecast(
        forecast=forecast,
        coefficients=HarCoefficients(beta[0], beta[1], beta[2], beta[3]),
    )
