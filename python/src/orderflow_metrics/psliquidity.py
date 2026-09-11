"""Pastor-Stambaugh liquidity - the return-reversal measure of liquidity
(Pastor & Stambaugh 2003).

Illiquidity leaves a fingerprint in returns: when a trade pushes the price, part of
that move is temporary and reverses the next period. The more illiquid the asset, the
larger the order-flow-induced move and the stronger the reversal. Pastor & Stambaugh
(2003), "Liquidity Risk and Expected Stock Returns" (Journal of Political Economy
111(3), 642-685), turn that into a regression: tomorrow's excess return on today's
return and today's *signed volume* ::

    re_{t+1} = theta + phi * r_t + gamma * sign(re_t) * v_t + e_{t+1}

where ``re`` is the excess return, ``r`` the raw return, and ``v`` the dollar volume.
The coefficient ``gamma`` is the liquidity measure. A more negative ``gamma`` means a
given signed volume is followed by a stronger reversal - i.e. less liquidity;
``gamma`` near zero means order flow moves the price and it *stays*, the mark of a
deep, liquid market. It is the daily-frequency building block from which Pastor &
Stambaugh construct their traded liquidity factor.

The ordinary-least-squares fit uses a dependency-free Gaussian-elimination solver -
no linear-algebra library. Pass aligned daily series (returns, excess returns, and
volume), typically one month's worth per estimate.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional, Sequence


@dataclass(frozen=True)
class PSLiquidity:
    """Fitted Pastor-Stambaugh regression: the liquidity gamma plus the other coefficients."""

    gamma: float  # the liquidity measure; more negative = less liquid (stronger reversal)
    phi: float  # the autoregressive coefficient on the raw return
    intercept: float  # the regression intercept (theta)


def _sign(x: float) -> float:
    return 1.0 if x > 0 else (-1.0 if x < 0 else 0.0)


def _solve(a: List[List[float]], b: List[float]) -> Optional[List[float]]:
    """Solve a*x = b by Gaussian elimination with partial pivoting; None if singular."""
    n = len(b)
    m = [list(row) + [b[i]] for i, row in enumerate(a)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(m[r][c]))
        if abs(m[piv][c]) < 1e-15:
            return None
        m[c], m[piv] = m[piv], m[c]
        for r in range(n):
            if r == c:
                continue
            f = m[r][c] / m[c][c]
            for k in range(c, n + 1):
                m[r][k] -= f * m[c][k]
    return [m[i][n] / m[i][i] for i in range(n)]


def pastor_stambaugh_gamma(
    returns: Sequence[float],
    excess_returns: Sequence[float],
    volumes: Sequence[float],
) -> PSLiquidity:
    """Pastor-Stambaugh liquidity measure ``gamma`` (2003). Regresses next-period
    excess return on the current raw return and the current signed volume
    ``sign(re_t) * v_t`` by ordinary least squares, and returns the fitted
    ``{gamma, phi, intercept}``. ``gamma`` is the liquidity measure - more negative
    means a stronger post-trade reversal, i.e. lower liquidity. The three series are
    paired by index (align to the same daily grid) and truncated to their common
    length; the regression uses observations ``t -> t+1``. Returns all ``nan`` with
    fewer than four usable pairs or a singular design.
    """
    n = min(len(returns), len(excess_returns), len(volumes))
    nan = PSLiquidity(math.nan, math.nan, math.nan)
    if n - 1 < 4:
        return nan

    X: List[List[float]] = []
    y: List[float] = []
    for t in range(n - 1):
        X.append([1.0, returns[t], _sign(excess_returns[t]) * volumes[t]])
        y.append(excess_returns[t + 1])

    p = 3
    xtx = [[0.0] * p for _ in range(p)]
    xty = [0.0] * p
    for r in range(len(X)):
        for i in range(p):
            xty[i] += X[r][i] * y[r]
            for j in range(p):
                xtx[i][j] += X[r][i] * X[r][j]

    beta = _solve(xtx, xty)
    if beta is None:
        return nan
    return PSLiquidity(gamma=beta[2], phi=beta[1], intercept=beta[0])
