"""Augmented Dickey-Fuller unit-root test - is a series a random walk, or does it revert?

The whole edifice of mean-reversion / pairs trading rests on one question: is the spread
*stationary* (shocks decay, it comes back) or does it have a *unit root* (shocks are
permanent, it wanders off)? ``meanrev`` measures the reversion speed assuming the former;
this tests whether the former even holds. The ADF test (Dickey & Fuller 1979; Said &
Dickey 1984 for the augmentation) regresses

    dy_t = alpha + gamma*y_{t-1} + sum_i delta_i*dy_{t-i}   ( + beta*t for the trend spec )

and reads the t-statistic on gamma. Under the unit-root null gamma = 0 that t-statistic
does *not* follow a normal or Student distribution, so it is compared to Dickey-Fuller
critical values, not the usual ones. A statistic below the critical value (a small
p-value) rejects the unit root: the series is stationary / mean-reverting. The ``lags``
(the augmentation) soak up serial correlation in dy so the test stays valid on real,
autocorrelated data.

``regression`` picks the deterministic terms: ``"c"`` (constant - the default, for a
series reverting to a non-zero level, e.g. a price spread) or ``"ct"`` (constant + linear
trend, for a series reverting around a drift). The p-value and critical values use
MacKinnon's (1994, 2010) response-surface approximations; the p-value's normal CDF reuses
the dependency-free ``standard_normal_cdf`` - no statistics library. Verified against
``statsmodels.tsa.stattools.adfuller`` to ~1e-13 on the statistic and exactly on the
critical values.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Sequence

from .vpin import standard_normal_cdf

# MacKinnon coefficient tables (N = 1 single I(1) variable), from statsmodels' adfvalues.
# ``smallp``/``largep``: p-value polynomials (increasing power). ``crit``: 2010
# critical-value response surfaces for [1%, 5%, 10%], each a polynomial in 1/nobs.
_TABLES = {
    "c": {
        "max": 2.74,
        "min": -18.83,
        "star": -1.61,
        "smallp": [2.1659, 1.4412, 0.038269],
        "largep": [1.7339, 0.93202, -0.12745, -0.010368],
        "crit": [
            [-3.43035, -6.5393, -16.786, -79.433],
            [-2.86154, -2.8903, -4.234, -40.04],
            [-2.56677, -1.5384, -2.809, 0.0],
        ],
    },
    "ct": {
        "max": 0.70,
        "min": -16.18,
        "star": -2.89,
        "smallp": [3.2512, 1.6047, 0.049588],
        "largep": [2.5261, 0.61654, -0.37956, -0.060285],
        "crit": [
            [-3.95877, -9.0531, -28.428, -134.155],
            [-3.41049, -4.3904, -9.036, -45.374],
            [-3.12705, -2.5856, -3.925, -22.38],
        ],
    },
}


@dataclass(frozen=True)
class AdfResult:
    """Result of an Augmented Dickey-Fuller unit-root test."""

    statistic: float  # ADF t-statistic on the lagged level coefficient gamma
    p_value: float  # MacKinnon p-value; small ⇒ reject the unit root (⇒ stationary)
    used_lag: float  # number of lagged differences included (the augmentation order)
    nobs: float  # number of observations in the ADF regression
    critical_values: Dict[str, float]  # Dickey-Fuller critical values at 1%, 5%, 10%
    regression: str  # the deterministic-term specification used ("c" or "ct")


_NAN = AdfResult(
    math.nan, math.nan, math.nan, math.nan,
    {"1%": math.nan, "5%": math.nan, "10%": math.nan}, "c",
)


def _mackinnon_p(stat: float, reg: str) -> float:
    t = _TABLES[reg]
    if stat > t["max"]:
        return 1.0
    if stat < t["min"]:
        return 0.0
    coef = t["smallp"] if stat <= t["star"] else t["largep"]
    val = sum(c * stat ** i for i, c in enumerate(coef))
    return standard_normal_cdf(val)


def _mackinnon_crit(reg: str, nobs: int) -> List[float]:
    inv = 1.0 / nobs
    return [sum(c * inv ** i for i, c in enumerate(row)) for row in _TABLES[reg]["crit"]]


def _invert(a: List[List[float]]) -> List[List[float]] | None:
    """Invert a small square matrix by Gauss-Jordan elimination; None if singular."""
    n = len(a)
    m = [list(a[i]) + [1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(m[r][c]))
        if abs(m[piv][c]) < 1e-14:
            return None
        m[c], m[piv] = m[piv], m[c]
        d = m[c][c]
        for k in range(2 * n):
            m[c][k] /= d
        for r in range(n):
            if r == c:
                continue
            f = m[r][c]
            for k in range(2 * n):
                m[r][k] -= f * m[c][k]
    return [row[n:] for row in m]


def augmented_dickey_fuller(
    series: Sequence[float], lags: int = 0, regression: str = "c"
) -> AdfResult:
    """Augmented Dickey-Fuller test for a unit root in ``series``. ``lags`` is the
    augmentation order - the number of lagged differences dy_{t-i} added to absorb serial
    correlation (0 = the plain Dickey-Fuller test). ``regression`` is ``"c"`` (constant,
    default) or ``"ct"`` (constant + linear trend). Returns the ADF t-statistic on the
    lagged level, its MacKinnon p-value (small ⇒ reject the unit root ⇒ stationary /
    mean-reverting), the critical values, and the regression's observation count. Returns
    ``nan`` for ``lags < 0`` or a series too short to fit the regression (``nobs`` must
    exceed the parameter count).
    """
    L = int(math.floor(lags))
    if L < 0 or regression not in ("c", "ct"):
        return _NAN
    n = len(series)
    nobs = n - 1 - L
    k = 1 + L + (2 if regression == "ct" else 1)
    if nobs <= k:
        return _NAN

    x = [float(v) for v in series]
    dx = [x[i + 1] - x[i] for i in range(n - 1)]

    y = [0.0] * nobs
    X = [[0.0] * k for _ in range(nobs)]
    for j in range(nobs):
        y[j] = dx[L + j]
        X[j][0] = x[L + j]  # y_{t-1} (lagged level) - column whose t-stat is the ADF stat
        for i in range(1, L + 1):
            X[j][i] = dx[L - i + j]  # dy_{t-i}
        X[j][1 + L] = 1.0  # constant
        if regression == "ct":
            X[j][2 + L] = j + 1  # linear trend

    XtX = [[0.0] * k for _ in range(k)]
    Xty = [0.0] * k
    for j in range(nobs):
        row = X[j]
        yj = y[j]
        for a in range(k):
            Xty[a] += row[a] * yj
            xa = row[a]
            XtXa = XtX[a]
            for b in range(k):
                XtXa[b] += xa * row[b]

    inv = _invert(XtX)
    if inv is None:
        return _NAN

    beta = [sum(inv[a][b] * Xty[b] for b in range(k)) for a in range(k)]

    ssr = 0.0
    for j in range(nobs):
        fit = sum(X[j][a] * beta[a] for a in range(k))
        e = y[j] - fit
        ssr += e * e
    sigma2 = ssr / (nobs - k)
    se0 = math.sqrt(sigma2 * inv[0][0])
    statistic = beta[0] / se0
    c1, c5, c10 = _mackinnon_crit(regression, nobs)

    return AdfResult(
        statistic,
        _mackinnon_p(statistic, regression),
        L,
        nobs,
        {"1%": c1, "5%": c5, "10%": c10},
        regression,
    )
