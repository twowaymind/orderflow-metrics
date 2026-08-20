import math

from orderflow_metrics import (
    downside_variance_ratio,
    realized_semivariance,
    realized_variance,
    signed_jump_variation,
)

# Mostly-up series with one large upside jump (the 0.05) and three down moves.
SERIES = [0.001, -0.0015, 0.002, -0.001, 0.0012, 0.05, -0.0008, 0.0011]


def test_realized_semivariance():
    sv = realized_semivariance(SERIES)
    assert math.isclose(sv.upside, 0.00250765, abs_tol=1e-12)
    assert math.isclose(sv.downside, 0.00000389, abs_tol=1e-12)


def test_upside_plus_downside_equals_rv():
    sv = realized_semivariance(SERIES)
    assert math.isclose(sv.upside + sv.downside, realized_variance(SERIES), abs_tol=1e-15)


def test_downside_variance_ratio():
    dr = downside_variance_ratio(SERIES)
    assert math.isclose(dr, 0.00154885050606400824, abs_tol=1e-15)
    assert 0.0 <= dr <= 1.0


def test_signed_jump_variation_positive():
    assert math.isclose(signed_jump_variation(SERIES), 0.00250376, abs_tol=1e-12)
    assert signed_jump_variation(SERIES) > 0


def test_downside_heavy_series_flips_sign():
    down = [-0.05, 0.001, -0.002, 0.0008]
    assert signed_jump_variation(down) < 0
    assert downside_variance_ratio(down) > 0.5


def test_zero_returns_ignored():
    sv = realized_semivariance([0, 0, 0.01, 0, -0.01])
    assert math.isclose(sv.upside, 0.0001, abs_tol=1e-15)
    assert math.isclose(sv.downside, 0.0001, abs_tol=1e-15)
    assert signed_jump_variation([0, 0, 0.01, 0, -0.01]) == 0.0


def test_edge_cases():
    empty = realized_semivariance([])
    assert empty.upside == 0.0
    assert empty.downside == 0.0
    assert downside_variance_ratio([]) == 0.0
    assert downside_variance_ratio([0, 0]) == 0.0
    assert signed_jump_variation([]) == 0.0
