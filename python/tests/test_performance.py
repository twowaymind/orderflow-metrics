import math

from orderflow_metrics import (
    sharpe_ratio,
    annualized_sharpe_ratio,
    sortino_ratio,
    max_drawdown,
    calmar_ratio,
)

R = [
    0.012, -0.008, 0.005, -0.021, 0.015, 0.004, -0.011, 0.02, -0.006, 0.009, 0.001,
    -0.014, 0.017, -0.003, 0.006, 0.011, -0.032, 0.007, 0.002, -0.01, 0.013, -0.004,
    0.008, -0.006, 0.019, -0.025, 0.003, 0.014, -0.009, 0.006,
]


def test_sharpe_reference():
    assert math.isclose(sharpe_ratio(R), 0.058638122863142, abs_tol=1e-9)


def test_annualized_sharpe_reference():
    assert math.isclose(annualized_sharpe_ratio(R, 252), 0.930851342661149, abs_tol=1e-9)


def test_sortino_reference():
    assert math.isclose(sortino_ratio(R), 0.080090284933656, abs_tol=1e-9)
    assert sortino_ratio(R) > sharpe_ratio(R)


def test_max_drawdown_reference():
    assert math.isclose(max_drawdown(R), 0.033041703520000, abs_tol=1e-9)


def test_calmar_reference():
    assert math.isclose(calmar_ratio(R, 252), 5.687689815539386, abs_tol=1e-9)


def test_risk_free_lowers_sharpe():
    assert sharpe_ratio(R, 0.002) < sharpe_ratio(R, 0)


def test_max_drawdown_known_curve():
    assert math.isclose(max_drawdown([0.1, -0.5, 0.2]), 0.5, abs_tol=1e-12)
    assert math.isclose(max_drawdown([0.01, 0.02, 0.03]), 0.0, abs_tol=1e-12)


def test_edge_cases():
    assert math.isnan(sharpe_ratio([]))
    assert math.isnan(sharpe_ratio([0.01]))
    assert math.isnan(sharpe_ratio([0.01, 0.01, 0.01]))
    assert math.isnan(sortino_ratio([]))
    assert math.isnan(sortino_ratio([0.01, 0.02, 0.03]))
    assert math.isnan(max_drawdown([]))
    assert math.isnan(calmar_ratio([], 252))
    assert math.isnan(calmar_ratio(R, 0))
    assert math.isnan(calmar_ratio([0.01, 0.02, 0.03], 252))
