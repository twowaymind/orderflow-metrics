"""Jump detection via bipower variation (Barndorff-Nielsen & Shephard, 2004/2006).

Realized variance (RV = sum(r**2)) mixes two very different kinds of risk: the
continuous diffusion of price, and discrete jumps. Bipower variation (BV)
estimates only the *continuous* part — multiplying adjacent absolute returns is
robust to a lone large jump (a jump inflates one return but is paired with a
small neighbour). The difference RV - BV isolates the jump contribution.

    BV = (pi/2) * sum(|r[i-1]| * |r[i]|)
    jump variation = max(RV - BV, 0)

Each function takes a return series and returns a non-negative number; the
relative jump is the share of realized variance attributable to jumps, in
[0, 1].
"""
from __future__ import annotations

import math
from typing import Sequence

# 1 / mu1**2 where mu1 = E[|Z|] = sqrt(2/pi) for Z ~ N(0,1); 1/mu1**2 = pi/2.
_MU1_INV_SQ = math.pi / 2


def _realized_var(returns: Sequence[float]) -> float:
    return sum(r * r for r in returns)


def bipower_variation(returns: Sequence[float]) -> float:
    """(pi/2) * sum(|r[i-1]||r[i]|): jump-robust continuous variance.

    Returns 0 for fewer than two returns.
    """
    n = len(returns)
    if n < 2:
        return 0.0
    s = sum(abs(returns[i - 1]) * abs(returns[i]) for i in range(1, n))
    return _MU1_INV_SQ * s


def jump_variation(returns: Sequence[float]) -> float:
    """max(RV - BV, 0): the jump contribution to realized variance."""
    if len(returns) < 2:
        return 0.0
    j = _realized_var(returns) - bipower_variation(returns)
    return j if j > 0 else 0.0


def relative_jump_variation(returns: Sequence[float]) -> float:
    """Jump variation as a share of realized variance, in [0, 1].

    Returns 0 when realized variance is 0 or there are fewer than two returns.
    """
    if len(returns) < 2:
        return 0.0
    total = _realized_var(returns)
    if total == 0:
        return 0.0
    j = total - bipower_variation(returns)
    return j / total if j > 0 else 0.0
