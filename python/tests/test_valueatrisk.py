import math

from orderflow_metrics import (
    inverse_normal_cdf,
    value_at_risk,
    expected_shortfall,
    gaussian_value_at_risk,
    cornish_fisher_value_at_risk,
)

R = [
    0.012, -0.008, 0.005, -0.021, 0.015, 0.004, -0.011, 0.02, -0.006, 0.009, 0.001,
    -0.014, 0.017, -0.003, 0.006, 0.011, -0.032, 0.007, 0.002, -0.01, 0.013, -0.004,
    0.008, -0.006, 0.019, -0.025, 0.003, 0.014, -0.009, 0.006,
]


def test_inverse_normal_cdf():
    assert math.isclose(inverse_normal_cdf(0.5), 0.0, abs_tol=1e-9)
    assert math.isclose(inverse_normal_cdf(0.05), -1.6448536251325335, abs_tol=1e-7)
    assert math.isclose(inverse_normal_cdf(0.975), 1.959963984540054, abs_tol=1e-7)
    assert math.isnan(inverse_normal_cdf(0.0))
    assert math.isnan(inverse_normal_cdf(1.0))


def test_historical_var():
    assert math.isclose(value_at_risk(R, 0.95), 0.0232, abs_tol=1e-9)


def test_expected_shortfall():
    assert math.isclose(expected_shortfall(R, 0.95), 0.0285, abs_tol=1e-9)
    assert expected_shortfall(R, 0.95) >= value_at_risk(R, 0.95)


def test_gaussian_var():
    assert math.isclose(gaussian_value_at_risk(R, 0.95), 0.020377576762, abs_tol=1e-7)


def test_cornish_fisher_var():
    assert math.isclose(cornish_fisher_value_at_risk(R, 0.95), 0.022736998015, abs_tol=1e-7)
    assert cornish_fisher_value_at_risk(R, 0.95) > gaussian_value_at_risk(R, 0.95)


def test_monotone_in_confidence():
    assert value_at_risk(R, 0.99) >= value_at_risk(R, 0.95)
    assert gaussian_value_at_risk(R, 0.99) > gaussian_value_at_risk(R, 0.95)


def test_edge_cases():
    assert math.isnan(value_at_risk([], 0.95))
    assert math.isnan(expected_shortfall([], 0.95))
    assert math.isnan(gaussian_value_at_risk(R, 0.0))
    assert math.isnan(gaussian_value_at_risk(R, 1.0))
    assert math.isnan(cornish_fisher_value_at_risk([0.01], 0.95))
    assert math.isnan(cornish_fisher_value_at_risk([0.01, 0.01, 0.01], 0.95))
