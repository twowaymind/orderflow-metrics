"""The Kelly criterion - position sizing for maximum long-run growth.

Risk and performance metrics tell you how good a bet is; the Kelly criterion (Kelly
1956, made famous in markets by Ed Thorp) tells you *how much to bet*. Betting too
little leaves growth on the table; betting too much courts ruin even with an edge.
Kelly is the fraction that maximizes the expected *logarithm* of wealth - the unique
size that maximizes long-run compound growth, and the one past which more leverage
makes you poorer, not richer.

    - ``kelly_fraction`` - the classic discrete bet: for a wager that wins with
      probability p at odds b (win b per 1 risked), the optimal stake is
      ``f* = p - (1 - p)/b``. A negative result means no edge - don't take it.
    - ``kelly_leverage`` - the continuous, mean-variance form: for a return stream the
      growth-optimal leverage is ``mu / sigma**2``, excess mean over variance.
    - ``growth_optimal_leverage`` - the *exact* empirical optimum: the leverage that
      maximizes the realized mean log-growth ``(1/N)*sum(log(1 + lam*r_t))`` over the
      return series, found with a dependency-free golden-section search. No Gaussian
      assumption - it reads the growth-optimal size straight off the data.

Kelly is aggressive by construction; practitioners commonly size at a fraction of it
(half-Kelly) to trade a little growth for much lower drawdown. Dependency-free.
"""
from __future__ import annotations

import math
from typing import Sequence


def kelly_fraction(win_probability: float, win_loss_ratio: float) -> float:
    """Discrete Kelly bet fraction ``f* = p - (1 - p)/b``, the stake (as a fraction of
    bankroll) that maximizes long-run growth for a bet that wins with probability
    ``win_probability`` at payoff odds ``win_loss_ratio`` (units won per unit risked). A
    negative value means there is no edge and the bet should be skipped. Returns ``nan``
    for a probability outside [0, 1] or a non-positive ``win_loss_ratio``.
    """
    if not (0.0 <= win_probability <= 1.0) or not (win_loss_ratio > 0):
        return math.nan
    return win_probability - (1 - win_probability) / win_loss_ratio


def kelly_leverage(mean_return: float, variance: float) -> float:
    """Mean-variance (continuous) Kelly leverage ``mean_return / variance`` - the
    growth-optimal leverage for a return stream under the Gaussian approximation. Pass
    the mean *excess* return and the variance of returns per period. Returns ``nan`` for
    a non-positive variance.
    """
    if not (variance > 0):
        return math.nan
    return mean_return / variance


def growth_optimal_leverage(returns: Sequence[float]) -> float:
    """Exact empirical growth-optimal leverage: the ``lam`` that maximizes the realized
    mean log-growth ``(1/N)*sum(log(1 + lam*r_t))`` over the return series, via a
    dependency-free golden-section search over the range where every ``1 + lam*r_t``
    stays positive. Makes no distributional assumption - the empirical counterpart of
    ``kelly_leverage``. Positive is long leverage, negative is short. Returns ``nan`` for
    fewer than two returns, an all-zero series, or a series whose returns all share one
    sign (the optimum is then unbounded).
    """
    n = len(returns)
    if n < 2:
        return math.nan
    max_pos = max(returns)
    min_neg = min(returns)
    if not (max_pos > 0) or not (min_neg < 0):
        return math.nan
    lo = -1.0 / max_pos
    hi = -1.0 / min_neg

    def g(lam: float) -> float:
        s = 0.0
        for r in returns:
            x = 1 + lam * r
            if x <= 0:
                return -math.inf
            s += math.log(x)
        return s / n

    eps = (hi - lo) * 1e-9
    a = lo + eps
    b = hi - eps
    gr = (math.sqrt(5) - 1) / 2
    c = b - gr * (b - a)
    d = a + gr * (b - a)
    fc = g(c)
    fd = g(d)
    it = 0
    while it < 500 and b - a > 1e-11:
        if fc > fd:
            b, d, fd = d, c, fc
            c = b - gr * (b - a)
            fc = g(c)
        else:
            a, c, fc = c, d, fd
            d = a + gr * (b - a)
            fd = g(d)
        it += 1
    return (a + b) / 2
