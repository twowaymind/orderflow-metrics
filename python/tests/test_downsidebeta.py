import math

from orderflow_metrics import downside_beta, upside_beta, beta_asymmetry

MARKET = [0.01, -0.02, 0.015, -0.01, -0.03, 0.02, -0.015, 0.005]
ASSET = [0.008, -0.03, 0.012, -0.02, -0.05, 0.018, -0.02, 0.004]


def test_downside_upside():
    assert math.isclose(downside_beta(ASSET, MARKET), 1.6, abs_tol=1e-9)
    assert math.isclose(upside_beta(ASSET, MARKET), 0.92, abs_tol=1e-9)


def test_asymmetry():
    assert math.isclose(beta_asymmetry(ASSET, MARKET), 1.6 - 0.92, abs_tol=1e-9)


def test_symmetric_asset():
    m = [0.02, -0.02, 0.01, -0.03, 0.015, -0.01]
    a = [1.5 * x for x in m]
    assert math.isclose(downside_beta(a, m), 1.5, abs_tol=1e-9)
    assert math.isclose(upside_beta(a, m), 1.5, abs_tol=1e-9)
    assert math.isclose(beta_asymmetry(a, m), 0.0, abs_tol=1e-9)


def test_undefined_when_too_few_periods():
    assert math.isnan(downside_beta([0.1, 0.2, 0.3], [0.1, 0.2, 0.3]))
    assert math.isnan(upside_beta([-0.1, -0.2], [-0.1, -0.2]))
    assert math.isnan(downside_beta([0.1, -0.2, 0.3], [0.1, -0.2, 0.3]))


def test_zero_conditional_variance():
    m = [-0.01, -0.01, 0.02]
    a = [-0.02, -0.03, 0.01]
    assert math.isnan(downside_beta(a, m))


def test_paired_over_common_length():
    assert math.isclose(downside_beta(ASSET, MARKET + [-0.05, -0.06]), 1.6, abs_tol=1e-9)
