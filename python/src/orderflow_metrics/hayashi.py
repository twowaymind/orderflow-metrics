"""Hayashi-Yoshida covariance - realized covariance for *non-synchronous* prices.

Realized covariance (``covariance``) pairs two return series index-by-index, so it
silently assumes both assets are observed on the *same* clock. Real ticks are not:
two instruments trade at their own, irregular times. Forcing them onto a common
grid (previous-tick interpolation, fixed sampling) throws away data and biases
covariance toward zero the finer you sample - the Epps effect.

Hayashi & Yoshida (2005), "On covariance estimation of non-synchronously observed
diffusion processes" (Bernoulli 11(2), 359-379), estimate the integrated covariance
directly from each series' own observation times, with no synchronization. Each
price series defines return intervals ``(t_{i-1}, t_i]``; the estimator sums the
product of two returns whenever their intervals *overlap in time*::

    HY = sum_i sum_j dX_i * dY_j * 1{ (t_{i-1}, t_i] cap (s_{j-1}, s_j] != empty }

It is consistent for the integrated covariance and free of the Epps bias. When both
series share the same timestamps it collapses exactly to the realized covariance
``sum dX_i * dY_i``. ``hayashi_yoshida_correlation`` normalizes it by each series'
own realized variance (each on its own grid), giving a synchronization-free
correlation.

Each series must be sorted by ascending time; intervals are half-open, so two that
merely touch at an endpoint ``(..., t]`` and ``(t, ...]`` do *not* overlap. Returns
are price differences (feed log-prices to estimate log-return covariance).
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Sequence, Tuple


@dataclass(frozen=True)
class TimedPrice:
    """A single timestamped price observation."""

    time: float
    price: float


# An interval is (start, end, return).
_Interval = Tuple[float, float, float]


def _to_intervals(series: Sequence[TimedPrice]) -> List[_Interval]:
    return [
        (series[i - 1].time, series[i].time, series[i].price - series[i - 1].price)
        for i in range(1, len(series))
    ]


def _realized_variance(intervals: Sequence[_Interval]) -> float:
    return sum(iv[2] * iv[2] for iv in intervals)


def _hy_sum(ix: Sequence[_Interval], iy: Sequence[_Interval]) -> float:
    hy = 0.0
    for a_start, a_end, a_ret in ix:
        for b_start, b_end, b_ret in iy:
            # Intervals sorted by start; once a Y interval starts at/after this X
            # interval ends, no later Y interval can overlap it either.
            if b_start >= a_end:
                break
            if b_end <= a_start:
                continue  # Y ended before X began
            hy += a_ret * b_ret
    return hy


def hayashi_yoshida_covariance(
    x: Sequence[TimedPrice], y: Sequence[TimedPrice]
) -> float:
    """Hayashi-Yoshida covariance of two non-synchronously observed price series:
    the sum of return cross-products over every pair of time-overlapping intervals
    (Hayashi & Yoshida 2005). Each series must be sorted by ascending ``time``.
    Reduces to the realized covariance when the two grids coincide. Returns 0 when
    either series has fewer than two observations.
    """
    return _hy_sum(_to_intervals(x), _to_intervals(y))


def hayashi_yoshida_correlation(
    x: Sequence[TimedPrice], y: Sequence[TimedPrice]
) -> float:
    """Hayashi-Yoshida correlation: ``HY(x, y) / sqrt(RVx * RVy)``, where each
    realized variance is computed on that series' own observation grid - a
    synchronization-free correlation robust to the Epps effect. Each series must be
    sorted by ascending ``time``. Returns ``nan`` when either series has zero
    realized variance (or fewer than two observations).
    """
    ix = _to_intervals(x)
    iy = _to_intervals(y)
    var_x = _realized_variance(ix)
    var_y = _realized_variance(iy)
    if var_x <= 0 or var_y <= 0:
        return math.nan
    return _hy_sum(ix, iy) / math.sqrt(var_x * var_y)
