"""Diebold-Mariano test - is one forecast genuinely more accurate than another?

Two models forecast the same series; one has a lower average error. Is that a real edge or a
lucky sample? Comparing losses by eye, or with a naive t-test, ignores that forecast errors
are serially correlated (especially at multi-step horizons), which inflates significance and
lets noise masquerade as skill. Diebold & Mariano (1995) test equal predictive accuracy
properly: form the loss differential d_t = g(e1_t) - g(e2_t) between the two models' errors
(g = squared or absolute loss), and test whether its mean is zero against a long-run variance
that accounts for autocorrelation up to the forecast horizon. Harvey, Leybourne & Newbold
(1997) add the small-sample correction that makes the test usable on the short samples real
backtests produce, and compare the statistic to a Student-t distribution rather than a normal.

A negative statistic means model 1 has the lower loss (is more accurate); a small p-value
says the difference is unlikely to be chance. It is the honest way to answer "did my new
model actually beat the benchmark?", and the natural significance test on top of the ``har``
forecasting tooling. The Student-t p-value uses an exact, dependency-free regularized
incomplete beta - matching ``scipy.stats.t`` to ~1e-13, no statistics library.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class DieboldMarianoResult:
    """Result of a Diebold-Mariano test of equal predictive accuracy."""

    statistic: float  # HLN-corrected DM statistic; negative => model 1 more accurate
    p_value: float  # p-value against Student-t with n-1 df (two-sided by default)
    n: float  # number of paired forecast points compared
    horizon: float  # the forecast horizon h used for the autocorrelation correction


_NAN = DieboldMarianoResult(math.nan, math.nan, math.nan, math.nan)


def _beta_cf(a: float, b: float, x: float) -> float:
    """Continued-fraction expansion for the regularized incomplete beta (Numerical Recipes)."""
    fpmin = 1e-300
    qab, qap, qam = a + b, a + 1, a - 1
    c = 1.0
    d = 1.0 - qab * x / qap
    if abs(d) < fpmin:
        d = fpmin
    d = 1.0 / d
    h = d
    for m in range(1, 301):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        if abs(d) < fpmin:
            d = fpmin
        c = 1.0 + aa / c
        if abs(c) < fpmin:
            c = fpmin
        d = 1.0 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        if abs(d) < fpmin:
            d = fpmin
        c = 1.0 + aa / c
        if abs(c) < fpmin:
            c = fpmin
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < 3e-16:
            break
    return h


def _incomplete_beta(a: float, b: float, x: float) -> float:
    """Regularized incomplete beta I_x(a, b), exact and dependency-free."""
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    bt = math.exp(
        math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
        + a * math.log(x) + b * math.log(1 - x)
    )
    if x < (a + 1) / (a + b + 2):
        return bt * _beta_cf(a, b, x) / a
    return 1.0 - bt * _beta_cf(b, a, 1 - x) / b


def student_t_survival(t: float, df: float) -> float:
    """Upper tail of the Student-t distribution, P(T_df > t), for any positive degrees of
    freedom. Exact and dependency-free via the regularized incomplete beta. A reusable
    companion to the chi-square and normal tails used across the library.
    """
    if not (df > 0):
        return math.nan
    half = 0.5 * _incomplete_beta(df / 2.0, 0.5, df / (df + t * t))  # = P(T > |t|)
    return half if t >= 0 else 1.0 - half


def diebold_mariano(
    errors1: Sequence[float],
    errors2: Sequence[float],
    horizon: int = 1,
    power: float = 2,
    alternative: str = "two-sided",
) -> DieboldMarianoResult:
    """Diebold-Mariano test (1995) of equal predictive accuracy between two forecasts, with
    the Harvey-Leybourne-Newbold (1997) small-sample correction. ``errors1`` and ``errors2``
    are the two models' forecast errors over the same points (actual - forecast). ``horizon``
    is the forecast horizon h - the loss differential's autocorrelation is accounted for up
    to lag h-1 (default 1). ``power`` selects the loss: 2 for squared error (default), 1 for
    absolute. ``alternative`` is ``"two-sided"`` (default), or one-sided ``"less"`` (model 1
    more accurate) / ``"greater"``. Returns the corrected statistic (negative => model 1 has
    the lower loss), its p-value against Student-t with n-1 df, and the sample size. Returns
    ``nan`` for mismatched or too-short series (n <= horizon), ``horizon < 1``, or a
    degenerate loss differential with no variance.
    """
    h = int(math.floor(horizon))
    n = len(errors1)
    if n != len(errors2) or h < 1 or n <= h:
        return _NAN

    d = [abs(errors1[t]) ** power - abs(errors2[t]) ** power for t in range(n)]
    dbar = sum(d) / n
    dev = [v - dbar for v in d]

    lrv_over_n = 0.0
    for k in range(h):
        g = sum(dev[t] * dev[t - k] for t in range(k, n)) / n
        lrv_over_n += g if k == 0 else 2 * g
    lrv_over_n /= n
    if not (lrv_over_n > 0):
        return _NAN

    correction = math.sqrt((n + 1 - 2 * h + h * (h - 1) / n) / n)
    statistic = (dbar / math.sqrt(lrv_over_n)) * correction
    df = n - 1

    if alternative == "two-sided":
        p_value = 2 * student_t_survival(abs(statistic), df)
    elif alternative == "greater":
        p_value = student_t_survival(statistic, df)
    else:  # "less"
        p_value = 1.0 - student_t_survival(statistic, df)

    return DieboldMarianoResult(statistic, p_value, n, h)
