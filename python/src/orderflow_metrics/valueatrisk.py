"""Value-at-Risk (VaR) and Expected Shortfall (ES) - the standard measures of tail
risk, including the Cornish-Fisher modified VaR that corrects the Gaussian number for
skewness and fat tails.

VaR at confidence level ``c`` is the loss a portfolio will not exceed with probability
``c`` over the horizon (the 95% VaR is the 5%-tail loss). Expected Shortfall - a.k.a.
Conditional VaR - is the *average* loss in that tail, the coherent risk measure the
Basel framework moved to precisely because it sees the shape of the tail beyond the
cutoff. Both are returned as **positive loss magnitudes** (a 95% VaR of 0.02 means a
2% loss).

Three lenses on the same tail:
    - ``value_at_risk`` / ``expected_shortfall`` - historical (empirical): read the
      tail straight off the realized return distribution, no distributional assumption.
    - ``gaussian_value_at_risk`` - parametric normal: ``VaR = -(mu + z*sigma)``, with
      ``z`` the standard-normal quantile at ``1 - c``.
    - ``cornish_fisher_value_at_risk`` - the normal quantile ``z`` expanded with the
      sample skewness ``S`` and excess kurtosis ``K`` (Cornish-Fisher; Favre & Galeano
      2002)::

          z_cf = z + (z**2-1)/6*S + (z**3-3z)/24*K - (2z**3-5z)/36*S**2

      A left-skewed, fat-tailed series pushes VaR *above* the Gaussian figure - the
      correction that stops normal VaR from understating crash risk.

The Gaussian quantile uses a dependency-free rational-approximation inverse normal CDF
(``inverse_normal_cdf``, Acklam) accurate to ~1e-9 - no statistics library.
``level`` is the confidence ``c`` in ``(0, 1)``, default 0.95.
"""
from __future__ import annotations

import math
from typing import List, Sequence


def inverse_normal_cdf(p: float) -> float:
    """Inverse standard-normal CDF (quantile function) via Acklam's rational
    approximation; accurate to roughly 1e-9 over ``p in (0, 1)``. Returns ``nan``
    outside the open interval. A dependency-free companion to ``standard_normal_cdf``.
    """
    if not (0.0 < p < 1.0):
        return math.nan
    a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
         1.38357751867269e2, -3.066479806614716e1, 2.506628277459239e0]
    b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
         6.680131188771972e1, -1.328068155288572e1]
    c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
         -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0]
    d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
         3.754408661907416e0]
    plow, phigh = 0.02425, 1 - 0.02425
    if p < plow:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / \
               ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    if p <= phigh:
        q = p - 0.5
        r = q * q
        return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / \
               (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)
    q = math.sqrt(-2 * math.log(1 - p))
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / \
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)


def _quantile(sorted_x: Sequence[float], p: float) -> float:
    """Linearly-interpolated empirical quantile at probability ``p`` (numpy "linear")."""
    n = len(sorted_x)
    if n == 1:
        return sorted_x[0]
    pos = (n - 1) * p
    lo = math.floor(pos)
    frac = pos - lo
    if lo + 1 >= n:
        return sorted_x[n - 1]
    return sorted_x[lo] + frac * (sorted_x[lo + 1] - sorted_x[lo])


def _mean(xs: Sequence[float]) -> float:
    return sum(xs) / len(xs)


def _mean_std(returns: Sequence[float]) -> tuple[float, float]:
    mu = _mean(returns)
    v = sum((r - mu) ** 2 for r in returns) / len(returns)
    return mu, math.sqrt(v)


def _valid_level(level: float) -> bool:
    return 0.0 < level < 1.0


def value_at_risk(returns: Sequence[float], level: float = 0.95) -> float:
    """Historical (empirical) Value-at-Risk at confidence ``level``, as a positive
    loss. Reads the ``1 - level`` quantile straight off the return distribution
    (linearly interpolated) - no distributional assumption. Returns ``nan`` for an
    empty series or a ``level`` outside ``(0, 1)``.
    """
    if len(returns) == 0 or not _valid_level(level):
        return math.nan
    return -_quantile(sorted(returns), 1 - level)


def expected_shortfall(returns: Sequence[float], level: float = 0.95) -> float:
    """Historical Expected Shortfall (Conditional VaR) at confidence ``level``, as a
    positive loss: the average of the returns at or below the historical VaR threshold
    - the mean loss *given* the tail is breached. Returns ``nan`` for an empty series
    or a ``level`` outside ``(0, 1)``.
    """
    if len(returns) == 0 or not _valid_level(level):
        return math.nan
    s = sorted(returns)
    threshold = _quantile(s, 1 - level)
    tail = [r for r in s if r <= threshold]
    if not tail:
        return -threshold
    return -_mean(tail)


def gaussian_value_at_risk(returns: Sequence[float], level: float = 0.95) -> float:
    """Parametric Gaussian Value-at-Risk at confidence ``level``, as a positive loss:
    ``-(mu + z*sigma)`` with ``z = inverse_normal_cdf(1 - level)`` and mu, sigma the
    sample mean and (population) standard deviation. Assumes normal returns. Returns
    ``nan`` for an empty series or a ``level`` outside ``(0, 1)``.
    """
    if len(returns) == 0 or not _valid_level(level):
        return math.nan
    mu, sd = _mean_std(returns)
    z = inverse_normal_cdf(1 - level)
    return -(mu + sd * z)


def cornish_fisher_value_at_risk(returns: Sequence[float], level: float = 0.95) -> float:
    """Cornish-Fisher modified Value-at-Risk at confidence ``level``, as a positive
    loss. Expands the normal quantile with the sample skewness ``S`` and excess
    kurtosis ``K`` (both population estimators)::

        z_cf = z + (z**2-1)/6*S + (z**3-3z)/24*K - (2z**3-5z)/36*S**2,  z = inv(1-level)

    then returns ``-(mu + z_cf*sigma)``. Captures the extra crash risk a left-skewed,
    fat-tailed return series carries beyond the Gaussian figure. Needs at least two
    returns (sigma > 0); returns ``nan`` for fewer, a degenerate (zero-variance)
    series, or a ``level`` outside ``(0, 1)``.
    """
    if len(returns) < 2 or not _valid_level(level):
        return math.nan
    mu, sd = _mean_std(returns)
    if sd <= 0:
        return math.nan
    n = len(returns)
    s3 = sum(((r - mu) / sd) ** 3 for r in returns)
    s4 = sum(((r - mu) / sd) ** 4 for r in returns)
    skew = s3 / n
    ex_kurt = s4 / n - 3
    z = inverse_normal_cdf(1 - level)
    zcf = (
        z
        + (z * z - 1) / 6 * skew
        + (z * z * z - 3 * z) / 24 * ex_kurt
        - (2 * z * z * z - 5 * z) / 36 * skew * skew
    )
    return -(mu + sd * zcf)
