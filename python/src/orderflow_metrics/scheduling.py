"""Execution scheduling: split a parent order into child slices.

``twap`` spreads size evenly across a fixed number of slices (time-weighted).
``pov`` participates at a fixed fraction of each interval's volume
(percentage-of-volume). Both return the child sizes; sizes may be fractional.
"""
from __future__ import annotations

from typing import List, Sequence


def twap(total_size: float, slices: int) -> List[float]:
    """TWAP: split ``total_size`` into ``slices`` equal child orders.

    The sizes sum exactly to ``total_size`` (any floating residual lands in the
    last slice).
    """
    if not isinstance(slices, int) or isinstance(slices, bool) or slices < 1:
        raise ValueError("slices must be a positive integer")
    out: List[float] = []
    allocated = 0.0
    for i in range(1, slices + 1):
        target = (total_size * i) / slices
        out.append(target - allocated)
        allocated = target
    return out


def pov(total_size: float, interval_volumes: Sequence[float], rate: float) -> List[float]:
    """POV: trade ``rate`` * each interval's volume, capped by size remaining.

    Returns per-interval child sizes; their sum is the filled amount (less than
    ``total_size`` if the volume was insufficient).
    """
    r = max(0.0, rate)
    out: List[float] = []
    remaining = total_size
    for vol in interval_volumes:
        if remaining <= 0:
            out.append(0.0)
            continue
        child = min(remaining, r * max(0.0, vol))
        out.append(child)
        remaining -= child
    return out
