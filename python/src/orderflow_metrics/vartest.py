"""VaR backtesting - does your Value-at-Risk model actually hold up out of sample?

``valueatrisk`` produces a VaR forecast; this checks it against what happened. A p% VaR
should be breached (the realized loss exceeds the forecast) about p% of the time, and
those breaches should be *independent* - scattered, not clustered. Two failures matter:
too many (or too few) breaches, and breaches that arrive in bunches (the model is blind
to volatility regimes). The Basel backtesting framework is built on exactly these checks.

    - ``kupiec_pof`` (Kupiec 1995) - the proportion-of-failures test of *unconditional
      coverage*: are there the right *number* of breaches? Likelihood ratio, chi2(1).
    - ``christoffersen_independence`` (Christoffersen 1998) - do breaches *cluster*? Tests
      the transition counts of the 0/1 breach sequence for serial dependence, chi2(1).
    - ``christoffersen_conditional_coverage`` - the joint test (coverage *and*
      independence), chi2(2). A model can pass the count and still fail here by breaching
      in bursts.

Feed a breach indicator series: 1 (or ``True``) when the period's loss exceeded the VaR
forecast, 0 otherwise. ``expected_rate`` is the model's target breach probability, i.e.
``1 - confidence`` (0.05 for a 95% VaR). Each test returns its likelihood-ratio statistic
and a p-value - a small p-value rejects the model. The chi2 p-values use exact closed
forms (chi2_1 via the dependency-free ``standard_normal_cdf``, chi2_2 = exp(-x/2)); no
statistics library.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence, Union

from .vpin import standard_normal_cdf


@dataclass(frozen=True)
class VarBacktestResult:
    """Result of a VaR backtest: the likelihood-ratio statistic and its p-value."""

    exceptions: float  # number of breaches (VaR exceedances) observed
    observations: float  # number of observations tested
    statistic: float  # likelihood-ratio test statistic
    p_value: float  # p-value; a small value rejects the model


_NAN = VarBacktestResult(math.nan, math.nan, math.nan, math.nan)


def _chi2_sf(x: float, df: int) -> float:
    """chi2 survival function for 1 or 2 degrees of freedom (exact, dependency-free)."""
    if not (x > 0):
        return 1.0
    if df == 2:
        return math.exp(-x / 2)
    return 2 * (1 - standard_normal_cdf(math.sqrt(x)))  # df == 1


def _xln(c: float, prob: float) -> float:
    """c*ln(prob) with the convention 0*ln0 = 0 (and 0 when prob <= 0)."""
    if c == 0 or prob <= 0:
        return 0.0
    return c * math.log(prob)


def _to_breaches(series: Sequence[Union[int, float, bool]]) -> list[int]:
    return [1 if v else 0 for v in series]


def kupiec_pof(
    breaches: Sequence[Union[int, float, bool]], expected_rate: float
) -> VarBacktestResult:
    """Kupiec proportion-of-failures test (1995) of unconditional coverage: are there the
    right number of VaR breaches for the target rate? ``breaches`` is the 0/1 (or bool)
    exceedance series, ``expected_rate`` the target breach probability (``1 -
    confidence``). Returns the likelihood-ratio statistic (chi2, 1 df) and its p-value; a
    small p-value says the breach *count* is wrong. Returns ``nan`` for an empty series or
    a rate outside ``(0, 1)``.
    """
    n = len(breaches)
    if n == 0 or not (0 < expected_rate < 1):
        return _NAN
    b = _to_breaches(breaches)
    x = sum(b)
    pi = x / n
    term1 = 0.0 if n - x == 0 else (n - x) * math.log((1 - pi) / (1 - expected_rate))
    term2 = 0.0 if x == 0 else x * math.log(pi / expected_rate)
    statistic = max(0.0, 2 * (term1 + term2))
    return VarBacktestResult(x, n, statistic, _chi2_sf(statistic, 1))


def christoffersen_independence(
    breaches: Sequence[Union[int, float, bool]]
) -> VarBacktestResult:
    """Christoffersen independence test (1998): do VaR breaches cluster in time? Reads the
    transition counts of the 0/1 ``breaches`` sequence and tests whether a breach makes
    the next-period breach more likely (serial dependence). Returns the likelihood-ratio
    statistic (chi2, 1 df) and its p-value; a small p-value says breaches are *clustered*,
    a sign the model misses volatility regimes. Returns ``nan`` for fewer than two
    observations.
    """
    n = len(breaches)
    if n < 2:
        return _NAN
    b = _to_breaches(breaches)
    x = sum(b)
    n00 = n01 = n10 = n11 = 0
    for t in range(1, n):
        prev, cur = b[t - 1], b[t]
        if prev == 0 and cur == 0:
            n00 += 1
        elif prev == 0 and cur == 1:
            n01 += 1
        elif prev == 1 and cur == 0:
            n10 += 1
        else:
            n11 += 1
    pi01 = n01 / (n00 + n01) if (n00 + n01) > 0 else 0.0
    pi11 = n11 / (n10 + n11) if (n10 + n11) > 0 else 0.0
    total = n00 + n01 + n10 + n11
    pi = (n01 + n11) / total if total > 0 else 0.0
    ln_null = _xln(n00 + n10, 1 - pi) + _xln(n01 + n11, pi)
    ln_alt = _xln(n00, 1 - pi01) + _xln(n01, pi01) + _xln(n10, 1 - pi11) + _xln(n11, pi11)
    statistic = max(0.0, -2 * (ln_null - ln_alt))
    return VarBacktestResult(x, n, statistic, _chi2_sf(statistic, 1))


def christoffersen_conditional_coverage(
    breaches: Sequence[Union[int, float, bool]], expected_rate: float
) -> VarBacktestResult:
    """Christoffersen conditional-coverage test (1998): the joint test of *both* the right
    breach count and independence, ``LR_cc = LR_uc + LR_ind``, chi2 with 2 df. A VaR model
    can pass the Kupiec count and still fail here by breaching in bursts. ``breaches`` is
    the 0/1 exceedance series, ``expected_rate`` the target breach probability. Returns the
    statistic and p-value; a small p-value rejects the model overall. Returns ``nan`` for
    fewer than two observations or a rate outside ``(0, 1)``.
    """
    n = len(breaches)
    if n < 2 or not (0 < expected_rate < 1):
        return _NAN
    uc = kupiec_pof(breaches, expected_rate)
    ind = christoffersen_independence(breaches)
    statistic = uc.statistic + ind.statistic
    return VarBacktestResult(uc.exceptions, n, statistic, _chi2_sf(statistic, 2))
