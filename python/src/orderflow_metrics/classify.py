"""Trade-sign classification.

Public trade prints usually don't tell you which side was the aggressor. These
rules infer it, so downstream OFI / imbalance / VPIN inputs can be signed.
Output is +1 (buyer-initiated), -1 (seller-initiated), 0 (unknown).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence


def tick_rule(prices: Sequence[float]) -> List[int]:
    """Tick rule: classify by the change vs the previous trade price.

    An unchanged ("zero tick") price carries the last non-zero sign; the first
    trade is unclassifiable (0).
    """
    out: List[int] = []
    last = 0
    for i in range(len(prices)):
        if i > 0:
            d = prices[i] - prices[i - 1]
            if d > 0:
                last = 1
            elif d < 0:
                last = -1
            # d == 0 -> keep last (zero-tick)
        out.append(last)
    return out


@dataclass(frozen=True)
class PriceVsMid:
    """A trade price paired with the prevailing mid at that time."""

    price: float
    mid: float


def lee_ready(obs: Sequence[PriceVsMid]) -> List[int]:
    """Lee-Ready (1991): quote rule first, tick rule breaking at-the-mid ties.

    A print above the prevailing mid is buyer-initiated, below is
    seller-initiated; ties at the mid fall back to the tick rule.
    """
    out: List[int] = []
    last = 0
    for i in range(len(obs)):
        price = obs[i].price
        m = obs[i].mid
        if price > m:
            sign = 1
        elif price < m:
            sign = -1
        elif i > 0:
            d = price - obs[i - 1].price
            sign = 1 if d > 0 else (-1 if d < 0 else last)
        else:
            sign = 0
        if sign != 0:
            last = sign
        out.append(sign)
    return out
