"""Realized semibetas - the four-way sign decomposition of market beta.

Realized beta (``covariance``) is the uncentered ratio ``sum a*m / sum m**2``.
Every cross-product ``a*m`` carries a sign that depends on which way each series
moved: both up, both down, or opposite directions. Bollerslev, Patton &
Quaedvlieg (2022), "Realized semibetas: Disentangling 'good' and 'bad' downside
risks" (Journal of Financial Economics 144, 227-246), split the sum into those
four regions, each normalized by the market's realized variance ``RVm = sum m**2``::

    beta^P  =  sum a+ * m+  / RVm     both up     - "good" upside co-movement
    beta^N  =  sum a- * m-  / RVm     both down   - "bad" downside co-movement (priced)
    beta^M+ = -sum a- * m+  / RVm     market up, asset down    (mixed, hedging)
    beta^M- = -sum a+ * m-  / RVm     market down, asset up    (mixed, hedging)

where ``x+ = max(x, 0)`` and ``x- = min(x, 0)``. All four are non-negative and
reconstruct realized beta exactly::

    beta = beta^P + beta^N - beta^M+ - beta^M-

BPQ show it is ``beta^N`` - co-movement when both the asset and the market fall -
that commands a risk premium, while ``beta^P`` does not, and the two mixed
semibetas earn a *negative* premium (they behave like hedges). Unlike the
conditional down-market beta in ``downsidebeta`` (Ang-Chen-Xing, demeaned within
the down subset), these are uncentered, additive, and condition on the signs of
*both* series.

Series are paired by index over their common length (align to the same grid
first). When ``RVm == 0`` every semibeta is 0, preserving the reconstruction.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class Semibetas:
    """The four realized semibetas of an asset against a market. All >= 0."""

    concordant_positive: float  # beta^P - both asset and market up
    concordant_negative: float  # beta^N - both down; the priced "bad" beta
    mixed_market_up: float  # beta^M+ - market up, asset down
    mixed_market_down: float  # beta^M- - market down, asset up


def _pos(x: float) -> float:
    return x if x > 0 else 0.0


def _neg(x: float) -> float:
    return x if x < 0 else 0.0


def realized_semibetas(
    asset: Sequence[float], market: Sequence[float]
) -> Semibetas:
    """The four realized semibetas of ``asset`` against ``market`` (Bollerslev,
    Patton & Quaedvlieg 2022). Each is non-negative and normalized by the
    market's realized variance; together they satisfy ``beta =
    concordant_positive + concordant_negative - mixed_market_up -
    mixed_market_down``, where ``beta`` is ``realized_beta``. Returns all zeros
    when the market has zero realized variance (or the input is empty).
    """
    n = min(len(asset), len(market))
    c_p = 0.0
    c_n = 0.0
    m_up = 0.0
    m_down = 0.0
    rv_m = 0.0
    for i in range(n):
        a = asset[i]
        m = market[i]
        rv_m += m * m
        c_p += _pos(a) * _pos(m)
        c_n += _neg(a) * _neg(m)
        m_up += _neg(a) * _pos(m)  # market up, asset down -> <= 0
        m_down += _pos(a) * _neg(m)  # market down, asset up -> <= 0
    if rv_m == 0:
        return Semibetas(0.0, 0.0, 0.0, 0.0)
    return Semibetas(
        concordant_positive=c_p / rv_m,
        concordant_negative=c_n / rv_m,
        mixed_market_up=-m_up / rv_m + 0.0,  # + 0 normalizes -0.0 to 0.0
        mixed_market_down=-m_down / rv_m + 0.0,
    )


def downside_semibeta(asset: Sequence[float], market: Sequence[float]) -> float:
    """Downside semibeta ``beta^N``: the "bad" component where the asset and the
    market fall together (``sum a- * m- / RVm``). This is the semibeta BPQ (2022)
    find carries a positive risk premium. Returns 0 when the market has zero
    realized variance.
    """
    return realized_semibetas(asset, market).concordant_negative


def semibeta_asymmetry(asset: Sequence[float], market: Sequence[float]) -> float:
    """Semibeta asymmetry ``beta^N - beta^P``: how much more the asset co-moves
    with the market when both fall than when both rise. Positive = the priced
    downside skew in an asset's market exposure. Zero when the market has zero
    realized variance.
    """
    s = realized_semibetas(asset, market)
    return s.concordant_negative - s.concordant_positive
