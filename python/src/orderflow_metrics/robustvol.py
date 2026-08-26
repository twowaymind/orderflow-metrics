"""Jump-robust realized variance and realized quarticity.

Plain realized variance (RV = sum(r**2)) is inflated by discrete jumps. Like
bipower variation, MinRV and MedRV estimate only the *continuous* part of
variance, but using the minimum / median of neighbouring absolute returns —
which is even more robust to jumps (and, for MedRV, to occasional zero returns
and isolated outliers) than the product form of bipower variation. Andersen,
Dobrev & Schaumburg (2012).

    MinRV = (pi/(pi-2)) * (n/(n-1)) * sum(min(|r[i-1]|, |r[i]|)**2)
    MedRV = (pi/(6-4*sqrt(3)+pi)) * (n/(n-2)) * sum(med(|r[i-1]|,|r[i]|,|r[i+1]|)**2)

Realized quarticity (RQ = (n/3) * sum(r**4)) estimates the integrated
quarticity int(sigma**4) — the quantity that sets the standard error of
realized variance and appears in the denominator of jump tests.
Barndorff-Nielsen & Shephard (2002).

Each function takes a return series and returns a non-negative number.
"""
from __future__ import annotations

import math
from typing import Sequence

# pi / (pi - 2): the MinRV scaling constant.
_MIN_RV_SCALE = math.pi / (math.pi - 2)
# pi / (6 - 4*sqrt(3) + pi): the MedRV scaling constant.
_MED_RV_SCALE = math.pi / (6 - 4 * math.sqrt(3) + math.pi)


def min_rv(returns: Sequence[float]) -> float:
    """MinRV: jump-robust integrated variance from the squared minimum of
    adjacent absolute returns. Returns 0 for fewer than two returns.
    """
    n = len(returns)
    if n < 2:
        return 0.0
    s = 0.0
    for i in range(1, n):
        m = min(abs(returns[i - 1]), abs(returns[i]))
        s += m * m
    return _MIN_RV_SCALE * (n / (n - 1)) * s


def med_rv(returns: Sequence[float]) -> float:
    """MedRV: jump-robust integrated variance from the squared median of three
    consecutive absolute returns. Returns 0 for fewer than three returns.
    """
    n = len(returns)
    if n < 3:
        return 0.0
    s = 0.0
    for i in range(1, n - 1):
        med = sorted((abs(returns[i - 1]), abs(returns[i]), abs(returns[i + 1])))[1]
        s += med * med
    return _MED_RV_SCALE * (n / (n - 2)) * s


def realized_quarticity(returns: Sequence[float]) -> float:
    """Realized quarticity: (n/3) * sum(r**4), an estimate of integrated
    quarticity int(sigma**4). Returns 0 for an empty series.
    """
    n = len(returns)
    if n < 1:
        return 0.0
    return (n / 3.0) * sum((r * r) ** 2 for r in returns)
