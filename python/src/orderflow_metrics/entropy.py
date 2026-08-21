"""Order-flow entropy: how predictable is a stream of trades or returns?

Shannon entropy measures the average surprise in a discrete distribution.
Applied to microstructure, it quantifies the *balance* and *predictability* of
order flow: a stream that is almost all buys (or a return series that only ticks
one way) carries little surprise — low entropy — and is easier to anticipate,
while a perfectly balanced, unpredictable stream is at maximum entropy.
Persistently low flow entropy is a hallmark of directional, potentially informed
activity.

    H = -sum(p_i * log2(p_i))        (in bits; p_i = count_i / sum(counts))

Entropy is reported in bits (base-2), so two equally likely outcomes give
exactly 1 bit and k equally likely outcomes give log2(k) bits.
"""
from __future__ import annotations

import math
from typing import Sequence


def shannon_entropy(counts: Sequence[float]) -> float:
    """Shannon entropy (in bits) of a discrete distribution given category
    counts (or probabilities — any non-negative weights).

    Zero and negative entries are ignored; the remaining weights are normalized
    to sum to 1. Returns 0 when fewer than two categories carry positive weight.
    """
    total = sum(c for c in counts if c > 0)
    if total <= 0:
        return 0.0
    h = 0.0
    for c in counts:
        if c > 0:
            p = c / total
            h -= p * math.log2(p)
    return h


def normalized_entropy(counts: Sequence[float]) -> float:
    """Shannon entropy divided by log2(k), where k is the number of categories
    carrying positive weight.

    Maps entropy onto [0, 1] — 0 is fully concentrated (one-sided), 1 is
    perfectly uniform — so distributions with different numbers of categories
    are comparable. Returns 0 when fewer than two categories carry positive
    weight.
    """
    k = sum(1 for c in counts if c > 0)
    if k < 2:
        return 0.0
    return shannon_entropy(counts) / math.log2(k)


def sign_entropy(values: Sequence[float]) -> float:
    """Shannon entropy (in bits, in [0, 1]) of the up/down split of a return or
    signed-flow series.

    Zero entries are ignored. 1 bit means perfectly balanced two-sided flow;
    values near 0 mean the flow is heavily one-sided (and thus more
    predictable). Returns 0 for an empty or single-sided series.
    """
    up = sum(1 for v in values if v > 0)
    down = sum(1 for v in values if v < 0)
    return shannon_entropy([up, down])
