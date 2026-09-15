"""Benchmark-relative performance - Jensen's alpha, Treynor ratio, tracking error, and
the information ratio. Where :mod:`performance` judges a return stream on its own, these
judge it against a benchmark (an index, a factor, a strategy you're trying to beat).

    - ``jensens_alpha`` (Jensen 1968) - the CAPM intercept: the average return left over
      after paying for the market risk taken. Regress excess return on excess benchmark
      return, ``r_t - rf = alpha + beta*(m_t - rf) + e_t``; ``alpha`` is the skill the
      benchmark can't explain.
    - ``treynor_ratio`` (Treynor 1965) - mean excess return per unit of *systematic*
      risk (beta), not total volatility. The reward-to-beta counterpart of Sharpe.
    - ``tracking_error`` - the sample standard deviation of the active return
      ``r_t - m_t``: how tightly the stream hugs its benchmark.
    - ``information_ratio`` (Grinold & Kahn) - mean active return divided by tracking
      error: active reward per unit of active risk. The headline number for judging a
      manager against a benchmark.

Beta is the OLS slope ``sum((r-rbar)(m-mbar)) / sum((m-mbar)**2)``; tracking error uses
the sample standard deviation (ddof = 1). The two series are paired by index and
truncated to their common length. Pass simple per-period returns. Dependency-free.
"""
from __future__ import annotations

import math
from typing import List, Sequence, Tuple


def _mean(xs: Sequence[float]) -> float:
    return sum(xs) / len(xs)


def _slope(x: Sequence[float], y: Sequence[float]) -> float:
    mx, my = _mean(x), _mean(y)
    cov = sum((x[i] - mx) * (y[i] - my) for i in range(len(x)))
    var_y = sum((v - my) ** 2 for v in y)
    if not (var_y > 0):
        return math.nan
    return cov / var_y


def _sample_std(xs: Sequence[float]) -> float:
    n = len(xs)
    if n < 2:
        return math.nan
    m = _mean(xs)
    return math.sqrt(sum((v - m) ** 2 for v in xs) / (n - 1))


def _align(a: Sequence[float], b: Sequence[float]) -> Tuple[List[float], List[float]]:
    n = min(len(a), len(b))
    return list(a[:n]), list(b[:n])


def jensens_alpha(
    returns: Sequence[float], benchmark: Sequence[float], risk_free: float = 0.0
) -> float:
    """Jensen's alpha (per period): the CAPM regression intercept
    ``mean(r - rf) - beta*mean(m - rf)``, with beta the beta of the returns to the
    benchmark and ``risk_free`` the per-period risk-free rate. A positive alpha is
    benchmark-beating return not explained by market exposure. Returns ``nan`` for
    fewer than two paired points or a zero-variance benchmark.
    """
    x, y = _align(returns, benchmark)
    if len(x) < 2:
        return math.nan
    beta = _slope(x, y)
    if math.isnan(beta):
        return math.nan
    excess_r = [r - risk_free for r in x]
    excess_m = [m - risk_free for m in y]
    return _mean(excess_r) - beta * _mean(excess_m)


def treynor_ratio(
    returns: Sequence[float], benchmark: Sequence[float], risk_free: float = 0.0
) -> float:
    """Treynor ratio (per period): mean excess return divided by beta - reward per unit
    of systematic (market) risk rather than total volatility. Returns ``nan`` for fewer
    than two paired points, a zero-variance benchmark, or a zero beta.
    """
    x, y = _align(returns, benchmark)
    if len(x) < 2:
        return math.nan
    beta = _slope(x, y)
    if not math.isfinite(beta) or beta == 0:
        return math.nan
    return _mean([r - risk_free for r in x]) / beta


def tracking_error(returns: Sequence[float], benchmark: Sequence[float]) -> float:
    """Tracking error: the sample standard deviation (ddof = 1) of the active return
    ``r_t - m_t`` - how far the stream typically drifts from its benchmark per period.
    Returns ``nan`` for fewer than two paired points.
    """
    x, y = _align(returns, benchmark)
    if len(x) < 2:
        return math.nan
    return _sample_std([x[i] - y[i] for i in range(len(x))])


def information_ratio(returns: Sequence[float], benchmark: Sequence[float]) -> float:
    """Information ratio: mean active return ``mean(r_t - m_t)`` divided by the tracking
    error - active reward per unit of active risk, the standard measure of skill
    relative to a benchmark. Returns ``nan`` for fewer than two paired points or a zero
    tracking error.
    """
    x, y = _align(returns, benchmark)
    if len(x) < 2:
        return math.nan
    active = [x[i] - y[i] for i in range(len(x))]
    te = _sample_std(active)
    if not (te > 0):
        return math.nan
    return _mean(active) / te
