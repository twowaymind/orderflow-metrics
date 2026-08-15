"""Range-based volatility estimators from OHLC candles.

Close-to-close realized volatility (see :mod:`volatility`) throws away most of
each bar — it reads only the close. But the open, high, and low carry information
too, and using them yields far more efficient volatility estimates from the same
data. Four classic estimators, in increasing order of what they use:

- Parkinson (1980): the high-low range only.
- Garman-Klass (1980): adds the open and close.
- Rogers-Satchell (1991): drift-independent (correct under a trending mean).
- Yang-Zhang (2000): drift-independent and robust to overnight jumps.

Each returns the estimated volatility (standard deviation) *per bar*. To
annualize, multiply the variance by the number of bars per year, or the
volatility by its square root. Prices must be strictly positive.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

_LN2 = math.log(2)


@dataclass(frozen=True)
class Candle:
    """A single OHLC candle."""

    open: float
    high: float
    low: float
    close: float


def parkinson_volatility(bars: Sequence[Candle]) -> float:
    """Parkinson (1980) high-low volatility. Returns 0 for an empty input."""
    n = len(bars)
    if n == 0:
        return 0.0
    s = sum(math.log(b.high / b.low) ** 2 for b in bars)
    return math.sqrt(s / (4 * _LN2) / n)


def garman_klass_volatility(bars: Sequence[Candle]) -> float:
    """Garman-Klass (1980) OHLC volatility. Returns 0 for an empty input."""
    n = len(bars)
    if n == 0:
        return 0.0
    s = 0.0
    for b in bars:
        hl = math.log(b.high / b.low)
        co = math.log(b.close / b.open)
        s += 0.5 * hl * hl - (2 * _LN2 - 1) * co * co
    v = s / n
    return math.sqrt(v) if v > 0 else 0.0


def rogers_satchell_volatility(bars: Sequence[Candle]) -> float:
    """Rogers-Satchell (1991) drift-independent OHLC volatility.

    Correct even when the price has a non-zero mean drift. Returns 0 for an empty
    input.
    """
    n = len(bars)
    if n == 0:
        return 0.0
    s = 0.0
    for b in bars:
        s += math.log(b.high / b.close) * math.log(b.high / b.open) + math.log(
            b.low / b.close
        ) * math.log(b.low / b.open)
    v = s / n
    return math.sqrt(v) if v > 0 else 0.0


def yang_zhang_volatility(bars: Sequence[Candle]) -> float:
    """Yang-Zhang (2000) volatility.

    A minimum-variance combination of overnight, open-to-close, and
    Rogers-Satchell variances that is both drift-independent and robust to
    opening jumps. Uses each bar's open relative to the previous close, so it
    needs at least three bars; returns 0 otherwise.
    """
    n = len(bars)
    if n < 3:
        return 0.0
    overnight = []
    open_close = []
    rs = 0.0
    for i in range(1, n):
        prev = bars[i - 1]
        b = bars[i]
        overnight.append(math.log(b.open / prev.close))
        open_close.append(math.log(b.close / b.open))
        rs += math.log(b.high / b.close) * math.log(b.high / b.open) + math.log(
            b.low / b.close
        ) * math.log(b.low / b.open)
    m = len(overnight)
    ob = sum(overnight) / m
    cb = sum(open_close) / m
    so = sum((x - ob) ** 2 for x in overnight) / (m - 1)
    sc = sum((x - cb) ** 2 for x in open_close) / (m - 1)
    rsv = rs / m
    k = 0.34 / (1.34 + (m + 1) / (m - 1))
    v = so + k * sc + (1 - k) * rsv
    return math.sqrt(v) if v > 0 else 0.0
