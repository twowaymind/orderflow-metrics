import math

from orderflow_metrics import (
    downside_covariance_matrix,
    downside_correlation_matrix,
    average_downside_correlation,
    realized_semicovariance,
)

X1 = [0.01, -0.02, 0.015, -0.01, -0.005]
X2 = [0.008, -0.03, -0.01, -0.02, 0.004]
X3 = [-0.012, -0.018, 0.02, -0.006, -0.01]
S = [X1, X2, X3]


def test_covariance_matrix():
    m = downside_covariance_matrix(S)
    assert math.isclose(m[0][0], 0.000525, abs_tol=1e-12)
    assert math.isclose(m[1][1], 0.0014, abs_tol=1e-12)
    assert math.isclose(m[2][2], 0.000604, abs_tol=1e-12)
    assert math.isclose(m[0][1], 0.0008, abs_tol=1e-12)
    assert math.isclose(m[0][2], 0.00047, abs_tol=1e-12)
    assert math.isclose(m[1][2], 0.00066, abs_tol=1e-12)
    assert m[1][0] == m[0][1] and m[2][1] == m[1][2]


def test_diagonal_and_offdiag_match_semicovariance():
    m = downside_covariance_matrix(S)
    assert math.isclose(m[0][0], realized_semicovariance(X1, X1).negative, abs_tol=1e-15)
    assert math.isclose(m[0][1], realized_semicovariance(X1, X2).negative, abs_tol=1e-15)
    assert math.isclose(m[1][2], realized_semicovariance(X2, X3).negative, abs_tol=1e-15)


def test_correlation_matrix():
    r = downside_correlation_matrix(S)
    assert math.isclose(r[0][0], 1.0, abs_tol=1e-12)
    assert math.isclose(r[0][1], 0.93313895, abs_tol=1e-7)
    assert math.isclose(r[0][2], 0.83464104, abs_tol=1e-7)
    assert math.isclose(r[1][2], 0.71773058, abs_tol=1e-7)


def test_average_downside_correlation():
    assert math.isclose(average_downside_correlation(S), 0.8285035229988508, abs_tol=1e-9)


def test_truncation():
    a = [-0.02, -0.03, -0.01]
    b = [-0.01, -0.02, -0.05, -0.09]
    m = downside_covariance_matrix([a, b])
    assert math.isclose(m[0][1], 0.02 * 0.01 + 0.03 * 0.02 + 0.01 * 0.05, abs_tol=1e-12)


def test_edges():
    assert downside_covariance_matrix([]) == []
    assert math.isnan(average_downside_correlation([]))
    assert math.isnan(average_downside_correlation([X1]))
    up = [0.01, 0.02, 0.03]
    r = downside_correlation_matrix([up, up])
    assert math.isnan(r[0][0])
