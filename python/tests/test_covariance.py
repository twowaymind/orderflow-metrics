import math

from orderflow_metrics import (
    realized_beta,
    realized_correlation,
    realized_covariance,
)

X = [0.01, -0.02, 0.015, -0.005, 0.02, -0.01]
Y = [0.008, -0.018, 0.02, -0.002, 0.017, -0.012]


def test_realized_covariance():
    assert math.isclose(realized_covariance(X, Y), 0.0012100000000000001, abs_tol=1e-15)
    assert math.isclose(realized_covariance(X, Y), realized_covariance(Y, X), abs_tol=1e-18)


def test_realized_correlation():
    c = realized_correlation(X, Y)
    assert math.isclose(c, 0.9778276631265401, abs_tol=1e-12)
    assert -1.0 <= c <= 1.0


def test_realized_beta():
    assert math.isclose(realized_beta(Y, X), 0.9680000000000001, abs_tol=1e-15)


def test_self_correlation_and_beta():
    assert math.isclose(realized_correlation(X, X), 1.0, abs_tol=1e-12)
    assert math.isclose(realized_beta(X, X), 1.0, abs_tol=1e-12)


def test_anti_correlation():
    neg = [-v for v in X]
    assert math.isclose(realized_correlation(X, neg), -1.0, abs_tol=1e-12)
    assert math.isclose(realized_beta(neg, X), -1.0, abs_tol=1e-12)


def test_beta_scales_with_amplitude():
    doubled = [2 * v for v in X]
    assert math.isclose(realized_beta(doubled, X), 2.0, abs_tol=1e-12)


def test_mismatched_lengths_use_common_prefix():
    assert math.isclose(realized_covariance([1, 2, 3], [1, 2]), 1 * 1 + 2 * 2, abs_tol=1e-12)


def test_edge_cases():
    assert realized_covariance([], []) == 0.0
    assert realized_correlation([], []) == 0.0
    assert realized_correlation([0, 0], [1, 2]) == 0.0
    assert realized_beta([1, 2], [0, 0]) == 0.0
