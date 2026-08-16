"""Hurst exponent via rescaled-range (R/S) analysis.

The Hurst exponent H characterises the long-memory of a series:

- H ~ 0.5 — no memory (white noise; the increments of a random walk)
- H > 0.5 — persistent / trending (moves tend to continue)
- H < 0.5 — anti-persistent / mean-reverting (moves tend to reverse)

It is estimated from the classic rescaled range: over windows of growing size
n, the average R/S statistic scales like n**H, so H is the slope of log(R/S)
against log(n). A companion to the market-efficiency metrics (autocorrelation,
variance ratio).

Feed it a roughly stationary series — typically returns, not raw prices. Returns
NaN when the series is too short to form at least two window scales (with the
default minimum window, that means fewer than ~32 points).
"""
from __future__ import annotations

import math
from typing import Sequence


def hurst_exponent(series: Sequence[float], min_window: int = 8) -> float:
    """Hurst exponent from rescaled-range analysis (slope of log R/S vs log n)."""
    n_total = len(series)
    scales: list[int] = []
    rs_means: list[float] = []

    n = min_window
    while n <= n_total // 2:
        k = n_total // n
        rs_vals = []
        for j in range(k):
            start = j * n
            chunk = series[start : start + n]
            mean = sum(chunk) / n
            cum = 0.0
            lo = math.inf
            hi = -math.inf
            sum_sq = 0.0
            for v in chunk:
                d = v - mean
                cum += d
                if cum < lo:
                    lo = cum
                if cum > hi:
                    hi = cum
                sum_sq += d * d
            rng = hi - lo
            stdev = math.sqrt(sum_sq / n)
            if stdev > 0:
                rs_vals.append(rng / stdev)
        if rs_vals:
            scales.append(n)
            rs_means.append(sum(rs_vals) / len(rs_vals))
        n *= 2

    if len(scales) < 2:
        return float("nan")

    xs = [math.log(s) for s in scales]
    ys = [math.log(r) for r in rs_means]
    m = len(xs)
    mx = sum(xs) / m
    my = sum(ys) / m
    num = sum((xs[i] - mx) * (ys[i] - my) for i in range(m))
    den = sum((xs[i] - mx) ** 2 for i in range(m))
    return num / den
