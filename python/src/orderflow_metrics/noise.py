"""Microstructure-noise-aware realized variance.

At the finest sampling frequency, realized variance is badly biased upward:
observed prices are the "true" price plus microstructure noise (bid-ask bounce,
discreteness, latency), and squaring tiny bounce returns pumps up the sum.
Sample more coarsely and the noise averages out — but you throw away data. These
tools let you see, quantify, and reduce that bias.

    noise_variance           - the variance of the noise itself, ~ RV_finest / 2n
                               (Zhang, Mykland & Ait-Sahalia, 2005)
    sparse_realized_variance - RV on a coarser grid, averaged over every offset
                               (subsampling), so no data is wasted
    volatility_signature     - RV as a function of sampling step: the classic
                               "signature plot" whose blow-up at fine steps is
                               the visual fingerprint of microstructure noise

Every function takes a series of (fine-grid) returns.
"""
from __future__ import annotations

from typing import List, Sequence, Tuple


def _realized_var_all(returns: Sequence[float]) -> float:
    return sum(r * r for r in returns)


def noise_variance(returns: Sequence[float]) -> float:
    """Estimate the variance of the microstructure noise as RV / (2n).

    Returns 0 for an empty series.
    """
    n = len(returns)
    if n < 1:
        return 0.0
    return _realized_var_all(returns) / (2 * n)


def sparse_realized_variance(returns: Sequence[float], step: int) -> float:
    """Realized variance on a grid ``step`` times coarser than the raw returns,
    averaged over all ``step`` possible starting offsets (subsampling).

    ``step == 1`` reproduces plain realized variance; larger steps suppress
    microstructure-noise bias. Returns 0 for ``step < 1``, an empty series, or a
    step too large to form any block.
    """
    n = len(returns)
    k = int(step)
    if k < 1 or n < 1:
        return 0.0
    if k == 1:
        return _realized_var_all(returns)

    # cumulative log-prices P[0..n], P[i] = sum(returns[0:i])
    p = [0.0] * (n + 1)
    for i in range(n):
        p[i + 1] = p[i] + returns[i]

    total = 0.0
    grids = 0
    for g in range(k):
        s = 0.0
        blocks = 0
        idx = g
        while idx + k <= n:
            d = p[idx + k] - p[idx]
            s += d * d
            blocks += 1
            idx += k
        if blocks > 0:
            total += s
            grids += 1
    return total / grids if grids > 0 else 0.0


def volatility_signature(
    returns: Sequence[float], steps: Sequence[int]
) -> List[Tuple[int, float]]:
    """The volatility signature: subsampled realized variance at each sampling
    step in ``steps``. Returns a list of ``(step, realized_variance)`` tuples.

    Plotted against the step, the curve typically starts high (noise inflated)
    at step 1 and settles toward the true integrated variance as the step grows.
    """
    return [(s, sparse_realized_variance(returns, s)) for s in steps]
