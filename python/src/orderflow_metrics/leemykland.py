"""Lee-Mykland (2008) nonparametric jump test - detecting *individual* jumps and
their timing.

Bipower variation (see :mod:`jumps`) tells you how much of a whole sample's variance
came from jumps, but not *where* the jumps were. Lee & Mykland (2008), "Jumps in
Financial Markets: A New Nonparametric Test and Jump Dynamics" (Review of Financial
Studies 21(6), 2535-2563), give a test that flags each return that is too large to be
diffusion, and pins down the instant it happened.

For each return ``r_i`` they form a standardized statistic ::

    L(i) = r_i / sigma_hat(t_i)

where ``sigma_hat(t_i)`` is a *local* volatility estimate from a jump-robust bipower
average over the ``K`` returns just before ``i`` (the return being tested is excluded,
so a jump cannot inflate its own benchmark) ::

    sigma_hat(t_i)**2 = (pi/2) * (1/(K-2)) * sum_j |r_j| * |r_{j-1}|,  j = i-K+2 .. i-1

Under the continuous-path null ``L(i)`` is asymptotically standard normal, so the
*maximum* of ``|L|`` over ``n`` test points follows a Gumbel law. A return is a jump
when ::

    |L(i)| > S_n * beta_star + C_n,   beta_star = -log(-log(1 - alpha))
    C_n = sqrt(2 log n) - (log pi + log log n) / (2 sqrt(2 log n)),   S_n = 1/sqrt(2 log n)

with ``n`` the number of test statistics and ``alpha`` the significance level. This
EVT threshold controls the chance of even one false jump across the whole sample.

Feed log-return series. The window ``K`` trades off local-constancy of volatility
(small ``K``) against estimation noise (large ``K``); Lee & Mykland show ``K ~ sqrt(n)``
satisfies the asymptotics, which is the default here - override it to match your
sampling frequency. Everything is dependency-free.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Sequence

# (pi/2) = 1/mu1**2 where mu1 = E[|Z|] = sqrt(2/pi) for Z ~ N(0,1); standardizes bipower.
_MU1_INV_SQ = math.pi / 2.0


@dataclass(frozen=True)
class LeeMyklandJump:
    """A detected jump: its return index, the test statistic, and its sign."""

    index: int  # index (into the input series) of the return flagged as a jump
    statistic: float  # the standardized statistic L(i); |L(i)| exceeds the critical value
    direction: int  # jump direction: +1 for an up-move, -1 for a down-move


def _default_window(n: int) -> int:
    return max(3, round(math.sqrt(n)))


def lee_mykland_statistics(
    returns: Sequence[float],
    window_size: int | None = None,
) -> List[float]:
    """Lee-Mykland standardized statistics ``L(i) = r_i / sigma_hat(t_i)``, one per
    input return. The first ``K-1`` entries are ``nan`` (no full local window yet), as
    is any entry whose local-volatility window is degenerate (zero). Larger ``|L(i)|``
    means the return is more extreme relative to the local diffusive volatility just
    before it. Pass log returns.
    """
    n = len(returns)
    k = _default_window(n) if window_size is None else window_size
    out: List[float] = [math.nan] * n
    if k < 3 or n < k:
        return out
    for i in range(k - 1, n):
        s = 0.0
        for j in range(i - k + 2, i):
            s += abs(returns[j]) * abs(returns[j - 1])
        variance = (_MU1_INV_SQ * s) / (k - 2)
        if variance <= 0.0:
            continue  # degenerate local window -> leave nan
        out[i] = returns[i] / math.sqrt(variance)
    return out


def lee_mykland_critical_value(num_statistics: int, significance: float = 0.01) -> float:
    """Critical value ``S_n * beta_star + C_n`` for the Lee-Mykland test: a statistic
    whose absolute value exceeds it is a jump at level ``significance``.
    ``num_statistics`` is the number of test points the maximum is taken over
    (typically ``len(returns) - K + 1``). Returns ``nan`` for fewer than two statistics
    or a significance outside ``(0, 1)``.
    """
    n = num_statistics
    if not (n > 1) or not (0.0 < significance < 1.0):
        return math.nan
    root = math.sqrt(2.0 * math.log(n))
    cn = root - (math.log(math.pi) + math.log(math.log(n))) / (2.0 * root)
    sn = 1.0 / root
    beta_star = -math.log(-math.log(1.0 - significance))
    return sn * beta_star + cn


def lee_mykland_jumps(
    returns: Sequence[float],
    window_size: int | None = None,
    significance: float = 0.01,
) -> List[LeeMyklandJump]:
    """Detected jumps under the Lee-Mykland test: every return whose standardized
    statistic ``|L(i)|`` exceeds the Gumbel critical value at level ``significance``.
    The threshold is computed from the number of non-``nan`` statistics, so it controls
    the family-wide false-positive rate across the whole series. Returns an empty list
    when there are too few statistics to test. Pass log returns.
    """
    stats = lee_mykland_statistics(returns, window_size)
    num_stats = sum(1 for v in stats if not math.isnan(v))
    jumps: List[LeeMyklandJump] = []
    if num_stats < 2:
        return jumps
    crit = lee_mykland_critical_value(num_stats, significance)
    if math.isnan(crit):
        return jumps
    for i, v in enumerate(stats):
        if not math.isnan(v) and abs(v) > crit:
            jumps.append(LeeMyklandJump(index=i, statistic=v, direction=1 if v > 0 else -1))
    return jumps
