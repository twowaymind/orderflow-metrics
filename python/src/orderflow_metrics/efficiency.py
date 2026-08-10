"""Market-efficiency diagnostics on a return series.

Autocorrelation and the Lo-MacKinlay variance ratio tell you whether a series
behaves like a random walk, mean-reverts, or trends — the kind of structure
execution and market-making models care about.
"""
from __future__ import annotations

from typing import List, Sequence


def autocorrelation(returns: Sequence[float], lag: int) -> float:
    """Lag-``lag`` autocorrelation of a return series (biased estimator).

    Denominator is the full-sample variance. Range roughly [-1, 1]. 0 for
    degenerate input.
    """
    n = len(returns)
    if lag < 1 or n <= lag:
        return 0.0

    mean = sum(returns) / n
    den = sum((r - mean) ** 2 for r in returns)
    if den == 0:
        return 0.0

    num = 0.0
    for t in range(lag, n):
        num += (returns[t] - mean) * (returns[t - lag] - mean)
    return num / den


def variance_ratio(returns: Sequence[float], q: int) -> float:
    """Variance ratio VR(q) = Var(q-period return) / (q * Var(1-period return)).

    Over overlapping q-period returns (Lo & MacKinlay, 1988)::

        VR ~ 1  random walk
        VR < 1  mean-reverting
        VR > 1  trending / positively autocorrelated

    Returns 1 for degenerate input (q >= length, or zero one-period variance).
    """
    n = len(returns)
    # Need at least two overlapping q-period returns for a meaningful variance,
    # i.e. n > q. At n <= q the estimate is degenerate — return 1 (random walk).
    if q < 1 or n <= q:
        return 1.0

    mean = sum(returns) / n
    var1 = sum((r - mean) ** 2 for r in returns) / n
    if var1 == 0:
        return 1.0

    q_sums: List[float] = []
    j = 0
    while j + q <= n:
        q_sums.append(sum(returns[j : j + q]))
        j += 1

    mean_q = sum(q_sums) / len(q_sums)
    var_q = sum((s - mean_q) ** 2 for s in q_sums) / len(q_sums)

    return var_q / (q * var1)
