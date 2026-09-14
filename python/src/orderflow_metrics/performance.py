"""Risk-adjusted performance ratios - Sharpe, Sortino, maximum drawdown, and Calmar.

A raw return says nothing about the risk taken to earn it. These are the headline
numbers every desk and fund reports to put return and risk on the same footing:

    - ``sharpe_ratio`` (Sharpe 1966/1994) - mean excess return per unit of *total*
      volatility. The classic reward-to-variability ratio.
    - ``sortino_ratio`` (Sortino & Price 1994) - mean excess return per unit of
      *downside* deviation only. Upside volatility isn't risk, so it doesn't punish a
      strategy for its good surprises.
    - ``max_drawdown`` - the largest peak-to-trough decline of the compounded equity
      curve, as a positive fraction. The number that actually decides whether you can
      stay in a strategy.
    - ``calmar_ratio`` - annualized return divided by maximum drawdown: return earned
      per unit of worst-case pain.

Conventions (documented, so the numbers are reproducible): Sharpe uses the *sample*
standard deviation (ddof = 1); Sortino's downside deviation is the target semideviation
``sqrt((1/N) * sum(min(r_t - target, 0)**2))`` (all N observations in the denominator);
drawdown compounds returns into an equity curve ``prod(1 + r_t)``; Calmar's annualized
return is geometric, ``(prod(1 + r_t))**(periods_per_year/N) - 1``. Pass simple (not
log) per-period returns. Everything is dependency-free.
"""
from __future__ import annotations

import math
from typing import Sequence


def _mean(xs: Sequence[float]) -> float:
    return sum(xs) / len(xs)


def _sample_std(xs: Sequence[float]) -> float:
    n = len(xs)
    if n < 2:
        return math.nan
    m = _mean(xs)
    v = sum((x - m) ** 2 for x in xs) / (n - 1)
    return math.sqrt(v)


def sharpe_ratio(returns: Sequence[float], risk_free: float = 0.0) -> float:
    """Sharpe ratio (per period): mean excess return divided by the sample standard
    deviation of excess returns, with ``risk_free`` the per-period risk-free rate.
    Multiply by ``sqrt(periods per year)`` to annualize, or use
    ``annualized_sharpe_ratio``. Returns ``nan`` for fewer than two returns or a
    zero-variance series.
    """
    if len(returns) < 2:
        return math.nan
    excess = [r - risk_free for r in returns]
    sd = _sample_std(excess)
    if not (sd > 0):
        return math.nan
    return _mean(excess) / sd


def annualized_sharpe_ratio(
    returns: Sequence[float], periods_per_year: float, risk_free: float = 0.0
) -> float:
    """Annualized Sharpe ratio: the per-period ``sharpe_ratio`` scaled by
    ``sqrt(periods_per_year)`` (e.g. 252 for daily, 12 for monthly). Returns ``nan``
    for fewer than two returns, a zero-variance series, or a non-positive
    ``periods_per_year``.
    """
    if not (periods_per_year > 0):
        return math.nan
    return sharpe_ratio(returns, risk_free) * math.sqrt(periods_per_year)


def sortino_ratio(returns: Sequence[float], target: float = 0.0) -> float:
    """Sortino ratio (per period): mean excess return divided by the downside deviation
    - the target semideviation ``sqrt((1/N) * sum(min(r_t - target, 0)**2))``, which
    counts only returns below ``target``. Rewards upside volatility instead of
    penalizing it. Returns ``nan`` for an empty series or when there is no downside
    (zero downside deviation).
    """
    n = len(returns)
    if n == 0:
        return math.nan
    dsq = 0.0
    for r in returns:
        d = r - target
        if d < 0:
            dsq += d * d
    downside_dev = math.sqrt(dsq / n)
    if not (downside_dev > 0):
        return math.nan
    return (_mean(returns) - target) / downside_dev


def max_drawdown(returns: Sequence[float]) -> float:
    """Maximum drawdown: the largest peak-to-trough decline of the compounded equity
    curve ``prod(1 + r_t)``, returned as a positive fraction in [0, 1] (0.2 = a 20%
    drawdown). A monotonically non-declining curve gives 0. Returns ``nan`` for an
    empty series.
    """
    if len(returns) == 0:
        return math.nan
    equity = 1.0
    peak = 1.0
    max_dd = 0.0
    for r in returns:
        equity *= 1 + r
        if equity > peak:
            peak = equity
        dd = (peak - equity) / peak
        if dd > max_dd:
            max_dd = dd
    return max_dd


def calmar_ratio(returns: Sequence[float], periods_per_year: float) -> float:
    """Calmar ratio: geometric annualized return divided by maximum drawdown -
    ``((prod(1 + r_t))**(periods_per_year/N) - 1) / max_drawdown``. Return per unit of
    worst-case decline. Returns ``nan`` for an empty series, a non-positive
    ``periods_per_year``, or a drawdown-free curve (zero maximum drawdown).
    """
    n = len(returns)
    if n == 0 or not (periods_per_year > 0):
        return math.nan
    dd = max_drawdown(returns)
    if not (dd > 0):
        return math.nan
    growth = 1.0
    for r in returns:
        growth *= 1 + r
    if growth <= 0:
        return math.nan
    annualized_return = growth ** (periods_per_year / n) - 1
    return annualized_return / dd
