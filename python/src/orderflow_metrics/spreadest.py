"""Bid-ask spread estimators from daily OHLC data.

When all you have is low-frequency bars — daily high, low, and close — you can
still back out an estimate of the effective bid-ask spread. Two well-known,
dependency-free estimators:

- Corwin & Schultz (2012): the high-low range over two consecutive periods
  reflects both fundamental volatility and the bid-ask bounce. The bounce can be
  isolated because volatility scales with the time interval while the spread does
  not.
- Abdi & Ranaldo (2017): compares each close to the mid-point of the current and
  the next period's high-low range; their covariance recovers the spread.

Both return a *proportional* spread (a fraction of price, e.g. 0.01 = 100 bps).
Negative estimates — noise when the true spread is close to zero — are floored at
0. Prices must be strictly positive.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

# 3 - 2*sqrt(2) ~= 0.1716, the Corwin-Schultz normalizing constant.
_K = 3 - 2 * math.sqrt(2)


@dataclass(frozen=True)
class Ohlc:
    """A single high-low-close bar (open is not required)."""

    high: float
    low: float
    close: float


def corwin_schultz(bars: Sequence[Ohlc]) -> float:
    """Corwin-Schultz (2012) high-low proportional spread, averaged over pairs.

    Per-pair negative estimates are set to 0 before averaging (as recommended in
    the paper). Requires strictly positive prices. Returns 0 for fewer than two
    bars.
    """
    if len(bars) < 2:
        return 0.0
    total = 0.0
    n = 0
    for a, b in zip(bars, bars[1:]):
        hl_a = math.log(a.high / a.low)
        hl_b = math.log(b.high / b.low)
        beta = hl_a * hl_a + hl_b * hl_b
        gamma = math.log(max(a.high, b.high) / min(a.low, b.low)) ** 2
        alpha = (math.sqrt(2 * beta) - math.sqrt(beta)) / _K - math.sqrt(gamma / _K)
        s = 2 * (math.exp(alpha) - 1) / (1 + math.exp(alpha))
        total += s if s > 0 else 0.0
        n += 1
    return total / n if n else 0.0


def abdi_ranaldo(bars: Sequence[Ohlc]) -> float:
    """Abdi-Ranaldo (2017) proportional spread from close, high, and low.

    ``S = sqrt(max(4 * E[(c_t - eta_t)(c_t - eta_{t+1})], 0))`` where
    ``eta = (log high + log low) / 2``. Returns 0 for fewer than two bars or when
    the estimate is negative.
    """
    if len(bars) < 2:
        return 0.0
    total = 0.0
    n = 0
    for a, b in zip(bars, bars[1:]):
        c = math.log(a.close)
        eta_t = (math.log(a.high) + math.log(a.low)) / 2
        eta_n = (math.log(b.high) + math.log(b.low)) / 2
        total += (c - eta_t) * (c - eta_n)
        n += 1
    s2 = 4 * (total / n if n else 0.0)
    return math.sqrt(s2) if s2 > 0 else 0.0
