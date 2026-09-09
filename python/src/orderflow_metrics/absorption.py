"""Absorption ratio - the fraction of total variance a market absorbs into its
leading principal components (Kritzman, Li, Page & Rigobon 2011).

A covariance matrix carries the whole cross-section of co-movement. Its eigenvalues
say how that variance is distributed across independent directions: a few large
eigenvalues mean the market is being driven by a handful of common factors; many
comparable eigenvalues mean risk is spread out. Kritzman, Li, Page & Rigobon (2011),
"Principal Components as a Measure of Systemic Risk" (Journal of Portfolio Management
37(4), 112-126), turn that into one number::

    absorption ratio = ( sum of the largest k eigenvalues ) / ( sum of all eigenvalues )

It is the share of total variance explained by the top k principal components. A
high ratio means the market is tightly coupled - most of its movement collapses onto
a few factors, so a shock in one place propagates everywhere; the fragile,
"correlations -> 1" regime that precedes and accompanies crises. A low ratio means
risk is diffuse and the system is more resilient. The authors show spikes in the
absorption ratio lead drawdowns.

Eigenvalues are computed with a dependency-free cyclic Jacobi rotation solver for
real symmetric matrices - no linear-algebra library required. The input is any
symmetric covariance (or correlation) matrix; build one from return series with the
tools in ``covariance``, or supply an exponentially-weighted estimate as the
original authors do.
"""
from __future__ import annotations

import math
from typing import List, Optional, Sequence

Matrix = Sequence[Sequence[float]]


def _off_diagonal_norm(a: List[List[float]], n: int) -> float:
    s = 0.0
    for p in range(n):
        for q in range(p + 1, n):
            s += a[p][q] * a[p][q]
    return s


def symmetric_eigenvalues(matrix: Matrix) -> List[float]:
    """Eigenvalues of a real symmetric matrix, in descending order, via cyclic
    Jacobi rotations. Dependency-free. The input must be square and symmetric (only
    the values matter; the matrix is copied, not mutated). Empty input returns
    ``[]``; a 1x1 returns its single entry.
    """
    n = len(matrix)
    if n == 0:
        return []
    a = [list(row) for row in matrix]
    if n == 1:
        return [a[0][0]]

    for _sweep in range(100):
        if _off_diagonal_norm(a, n) < 1e-300:
            break
        for p in range(n - 1):
            for q in range(p + 1, n):
                apq = a[p][q]
                if abs(apq) < 1e-300:
                    continue
                tau = (a[q][q] - a[p][p]) / (2 * apq)
                if tau == 0:
                    t = 1.0
                else:
                    t = (1.0 if tau > 0 else -1.0) / (abs(tau) + math.sqrt(1 + tau * tau))
                c = 1 / math.sqrt(1 + t * t)
                s = t * c
                # apply G on the right (columns p, q)
                for k in range(n):
                    akp = a[k][p]
                    akq = a[k][q]
                    a[k][p] = c * akp - s * akq
                    a[k][q] = s * akp + c * akq
                # apply G^T on the left (rows p, q)
                for k in range(n):
                    apk = a[p][k]
                    aqk = a[q][k]
                    a[p][k] = c * apk - s * aqk
                    a[q][k] = s * apk + c * aqk

    eigenvalues = [a[i][i] for i in range(n)]
    eigenvalues.sort(reverse=True)
    return eigenvalues


def _default_components(n: int) -> int:
    return max(1, round(n / 5))


def absorption_ratio(covariance: Matrix, num_components: Optional[int] = None) -> float:
    """Absorption ratio: the fraction of a covariance matrix's total variance captured
    by its largest ``num_components`` eigenvalues (Kritzman, Li, Page & Rigobon 2011).
    In ``[0, 1]`` for a positive-semidefinite covariance. A rising ratio signals a
    market collapsing onto fewer factors - tightly coupled and fragile.

    ``num_components`` defaults to a fifth of the assets (their convention), rounded
    and floored at 1; any value is clamped to ``[1, n]``. Returns ``nan`` for an empty
    matrix or one whose eigenvalues sum to zero (no variance to absorb).
    """
    n = len(covariance)
    if n == 0:
        return math.nan
    k = _default_components(n) if num_components is None else num_components
    k = min(n, max(1, round(k)))
    eigenvalues = symmetric_eigenvalues(covariance)  # descending
    total = sum(eigenvalues)
    if total == 0:
        return math.nan
    return sum(eigenvalues[:k]) / total
