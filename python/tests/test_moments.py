import math

from orderflow_metrics import realized_kurtosis, realized_skewness

R = [0.01, -0.02, 0.015, -0.005, 0.03, -0.01, 0.008, -0.025]


def test_realized_skewness():
    assert math.isclose(realized_skewness(R), 0.167588027657, abs_tol=1e-9)


def test_realized_kurtosis():
    assert math.isclose(realized_kurtosis(R), 1.931132423255, abs_tol=1e-9)


def test_symmetric_zero_skew():
    assert math.isclose(realized_skewness([0.02, -0.02, 0.02, -0.02]), 0.0, abs_tol=1e-12)


def test_empty_or_zero_variance():
    assert realized_skewness([]) == 0.0
    assert realized_kurtosis([]) == 0.0
    assert realized_skewness([0, 0, 0]) == 0.0
    assert realized_kurtosis([0, 0, 0]) == 0.0
