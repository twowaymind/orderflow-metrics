"""Downside covariance and correlation matrices - the crash-correlation half of
the covariance matrix, for a whole book of assets.

``semicovariance`` splits the realized covariance of *two* series by the sign of
their returns. This lifts the joint-downside piece to a full N x N matrix: for
every pair it keeps only the days both assets fell::

    D_ij = sum min(x_i,t, 0) * min(x_j,t, 0)

- the concordant-negative (both-down) component of the Bollerslev, Li, Patton &
Quaedvlieg (2020) decomposition. The diagonal ``D_ii = sum min(x_i,0)**2`` is
asset i's downside semivariance (see ``semivar``), so normalizing gives a
downside *correlation* matrix. Its off-diagonal average is a single, monitorable
read on how tightly a book is bound together on the way down - the "correlations
go to one in a crisis" effect turned into a number.

All series are paired by index and truncated to their common length, so align
them to the same sampling grid first. An empty input returns an empty matrix.
"""
from __future__ import annotations

import math
from typing import List, Sequence


def _common_length(series: Sequence[Sequence[float]]) -> int:
    if not series:
        return 0
    return min(len(s) for s in series)


def downside_covariance_matrix(
    series: Sequence[Sequence[float]],
) -> List[List[float]]:
    """N x N downside covariance matrix: entry ``[i][j]`` is the joint-downside
    covariance ``sum min(x_i,0)*min(x_j,0)`` over the two series' common length -
    the both-down component of realized semicovariance. Symmetric and positive
    semidefinite; the diagonal is each asset's downside semivariance. Returns
    ``[]`` for empty input.
    """
    n = len(series)
    t = _common_length(series)
    neg = [[(s[k] if s[k] < 0 else 0.0) for k in range(t)] for s in series]
    m = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i, n):
            total = 0.0
            for k in range(t):
                total += neg[i][k] * neg[j][k]
            m[i][j] = total
            m[j][i] = total
    return m


def downside_correlation_matrix(
    series: Sequence[Sequence[float]],
) -> List[List[float]]:
    """N x N downside correlation matrix: the downside covariance matrix
    normalized by the square root of its diagonal, ``D_ij / sqrt(D_ii * D_jj)``.
    The diagonal is 1 (or ``nan`` for an asset with no downside variance). Any
    pair involving a zero-downside asset is ``nan``. Returns ``[]`` for empty
    input.
    """
    d = downside_covariance_matrix(series)
    n = len(d)
    r = [[math.nan] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            denom = d[i][i] * d[j][j]
            r[i][j] = d[i][j] / math.sqrt(denom) if denom > 0 else math.nan
    return r


def average_downside_correlation(series: Sequence[Sequence[float]]) -> float:
    """Average off-diagonal downside correlation: the mean of the upper-triangle
    entries of the downside correlation matrix - one number for how correlated a
    book is on the way down. ``nan`` pairs (zero-downside assets) are skipped;
    returns ``nan`` when no valid pair exists (fewer than two assets, or none
    share downside variance).
    """
    r = downside_correlation_matrix(series)
    n = len(r)
    total = 0.0
    count = 0
    for i in range(n):
        for j in range(i + 1, n):
            if not math.isnan(r[i][j]):
                total += r[i][j]
                count += 1
    return math.nan if count == 0 else total / count
