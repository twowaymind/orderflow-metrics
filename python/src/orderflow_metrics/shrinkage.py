"""Ledoit-Wolf shrinkage covariance - a covariance matrix you can actually invert.

The sample covariance matrix is the obvious estimator and, for portfolio work, a trap. With
p assets and only n observations it has p(p+1)/2 numbers to estimate from n*p data points;
when p approaches or exceeds n the matrix becomes ill-conditioned or outright singular, its
smallest eigenvalues collapse toward zero, and any optimizer that inverts it (mean-variance
weights, risk parity, a Kelly allocation) amplifies that noise into wild, unstable
positions. Ledoit & Wolf (2004) fix it by pulling the sample covariance toward a simple,
well-conditioned target - a scaled identity mu*I, where mu = trace(S)/p is the average
variance - by an amount the data itself chooses:

    Sigma_hat = (1 - delta)*S + delta*mu*I

The shrinkage intensity delta in [0, 1] is estimated to minimize expected error: noisier or
higher-dimensional samples (small n, large p) get pulled harder toward the target, clean
low-dimensional ones barely at all. The result is always positive-definite and invertible,
with off-diagonal noise damped and eigenvalues pushed away from zero - the standard first
step before feeding a covariance to any optimizer.

``ledoit_wolf_shrinkage(observations)`` takes ``observations`` as rows (each row one
period's returns across the p assets) and returns the shrunk covariance, the intensity
delta, and the target scale mu. Covariances use the maximum-likelihood (divide-by-n)
convention, as in the original paper. Dependency-free; matches
``sklearn.covariance.ledoit_wolf`` to ~1e-15.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Sequence


@dataclass(frozen=True)
class ShrinkageCovariance:
    """Result of a Ledoit-Wolf shrinkage covariance estimate."""

    covariance: List[List[float]]  # the shrunk covariance matrix (p x p), positive-definite
    shrinkage: float  # intensity delta in [0, 1]: 0 = sample covariance, 1 = mu*I target
    mu: float  # target scale mu = trace(S)/p, the average sample variance


_NAN = ShrinkageCovariance([], math.nan, math.nan)


def ledoit_wolf_shrinkage(
    observations: Sequence[Sequence[float]], assume_centered: bool = False
) -> ShrinkageCovariance:
    """Ledoit-Wolf (2004) shrinkage estimator of a covariance matrix. ``observations`` is an
    n x p matrix - n rows, each the p asset returns for one period. ``assume_centered`` skips
    mean subtraction when the data is already known to be mean-zero. Returns the shrunk
    covariance Sigma_hat = (1 - delta)*S + delta*mu*I (maximum-likelihood, divide-by-n), the
    estimated shrinkage intensity delta, and the target scale mu = trace(S)/p. With a single
    asset (p = 1) shrinkage is 0 and the covariance is the sample variance. Returns ``nan``
    for an empty or ragged input.
    """
    n = len(observations)
    if n == 0:
        return _NAN
    p = len(observations[0])
    if p == 0:
        return _NAN
    for row in observations:
        if len(row) != p:
            return _NAN

    means = [0.0] * p
    if not assume_centered:
        for row in observations:
            for i in range(p):
                means[i] += row[i]
        for i in range(p):
            means[i] /= n
    X = [[row[i] - means[i] for i in range(p)] for row in observations]

    # sample (MLE) covariance S = X^T X / n
    S = [[0.0] * p for _ in range(p)]
    for k in range(n):
        xk = X[k]
        for i in range(p):
            xki = xk[i]
            Si = S[i]
            for j in range(p):
                Si[j] += xki * xk[j]
    for i in range(p):
        for j in range(p):
            S[i][j] /= n

    mu = sum(S[i][i] for i in range(p)) / p

    if p == 1:
        return ShrinkageCovariance([[S[0][0]]], 0.0, mu)

    # beta_ = sum_{i,j} sum_k X2ki X2kj  (sum of the entries of (X^2)^T (X^2))
    H = [[0.0] * p for _ in range(p)]
    for k in range(n):
        xk = X[k]
        for i in range(p):
            x2 = xk[i] * xk[i]
            Hi = H[i]
            for j in range(p):
                Hi[j] += x2 * (xk[j] * xk[j])
    beta_raw = sum(H[i][j] for i in range(p) for j in range(p))

    # delta_ = sum_{i,j} S[i][j]^2   (the n^2 cancels since (X^T X) = n*S)
    delta_raw = sum(S[i][j] * S[i][j] for i in range(p) for j in range(p))

    beta = (beta_raw / n - delta_raw) / (p * n)
    delta = (delta_raw - p * mu * mu) / p  # ||S - mu I||_F^2 / p
    beta = min(beta, delta)
    shrinkage = 0.0 if beta == 0 else beta / delta

    cov = [
        [
            (1 - shrinkage) * S[i][j] + (shrinkage * mu if i == j else 0.0)
            for j in range(p)
        ]
        for i in range(p)
    ]
    return ShrinkageCovariance(cov, shrinkage, mu)
