"""Liquidity measures."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class ReturnVolume:
    """A period return paired with the traded (or dollar) volume over it."""

    ret: float
    volume: float


def amihud_illiquidity(obs: Sequence[ReturnVolume]) -> float:
    """Amihud (2002) illiquidity: the average of |return| / volume across periods.

    Captures how much price moves per unit of volume — a high value means even
    small trades push the price a lot (thin, illiquid). Periods with zero volume
    are skipped. Returns 0 when there is no usable data.
    """
    total = 0.0
    n = 0
    for o in obs:
        if o.volume > 0:
            total += abs(o.ret) / o.volume
            n += 1
    return 0.0 if n == 0 else total / n
