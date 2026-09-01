import math

from orderflow_metrics import (
    realized_semicovariance,
    realized_covariance,
    Semicovariance,
)

X = [0.01, -0.02, 0.015, -0.01, 0.02]
Y = [0.012, -0.018, -0.005, 0.008, 0.017]


def test_components():
    s = realized_semicovariance(X, Y)
    assert isinstance(s, Semicovariance)
    assert math.isclose(s.positive, 0.00046, abs_tol=1e-12)
    assert math.isclose(s.negative, 0.00036, abs_tol=1e-12)
    assert math.isclose(s.mixed, -0.000155, abs_tol=1e-12)


def test_components_sum_to_covariance():
    s = realized_semicovariance(X, Y)
    assert math.isclose(
        s.positive + s.negative + s.mixed, realized_covariance(X, Y), abs_tol=1e-15
    )


def test_sign_invariants():
    s = realized_semicovariance(X, Y)
    assert s.positive >= 0 and s.negative >= 0 and s.mixed <= 0


def test_crash_heavy_pair():
    a = [-0.03, -0.02, -0.01, 0.005]
    b = [-0.025, -0.015, -0.02, 0.004]
    s = realized_semicovariance(a, b)
    assert math.isclose(s.negative, 0.00125, abs_tol=1e-12)
    assert math.isclose(s.positive, 2e-5, abs_tol=1e-12)
    assert math.isclose(s.mixed, 0.0, abs_tol=1e-15)
    assert math.isclose(
        s.positive + s.negative + s.mixed, realized_covariance(a, b), abs_tol=1e-15
    )


def test_edges():
    z = realized_semicovariance([], [])
    assert z.positive == 0 and z.negative == 0 and z.mixed == 0
    s = realized_semicovariance([0.01, -0.02, 0.03], [0.02, -0.01])
    assert math.isclose(s.positive, 0.0002, abs_tol=1e-12)
    assert math.isclose(s.negative, 0.0002, abs_tol=1e-12)
    assert math.isclose(s.mixed, 0.0, abs_tol=1e-15)
