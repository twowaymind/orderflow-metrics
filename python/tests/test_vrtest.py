import math

from orderflow_metrics import variance_ratio_test

R = [
    0.012, -0.008, 0.005, -0.021, 0.015, 0.004, -0.011, 0.02, -0.006, 0.009, 0.001,
    -0.014, 0.017, -0.003, 0.006, 0.011, -0.032, 0.007, 0.002, -0.01, 0.013, -0.004,
    0.008, -0.006, 0.019, -0.025, 0.003, 0.014, -0.009, 0.006, 0.004, -0.012, 0.02,
    -0.007, 0.011, 0.003, -0.015, 0.009, -0.004, 0.013,
]


def test_q2_vs_arch():
    r = variance_ratio_test(R, 2)
    assert math.isclose(r.ratio, 0.420576932327773, abs_tol=1e-12)
    assert math.isclose(r.z_statistic, -3.6645932453722287, abs_tol=1e-9)
    assert math.isclose(r.robust_z_statistic, -3.997061801230227, abs_tol=1e-9)
    assert math.isclose(r.p_value, 0.00024773, abs_tol=1e-4)
    assert math.isclose(r.robust_p_value, 0.00006413, abs_tol=1e-4)


def test_q4_vs_arch():
    r = variance_ratio_test(R, 4)
    assert math.isclose(r.ratio, 0.36248384059900257, abs_tol=1e-12)
    assert math.isclose(r.z_statistic, -2.155197978303745, abs_tol=1e-9)
    assert math.isclose(r.robust_z_statistic, -2.5233752333630073, abs_tol=1e-9)


def test_mean_reverting_rejects():
    r = variance_ratio_test(R, 2)
    assert r.ratio < 1
    assert r.robust_p_value < 0.05


def test_momentum_vs_reversion_sign():
    momentum = [
        0.01, 0.012, 0.011, 0.013, -0.011, -0.013, -0.01, -0.012, 0.011, 0.012, 0.01,
        0.013, -0.012, -0.011, -0.013, -0.01,
    ]
    reversion = [0.01, -0.01, 0.01, -0.01, 0.01, -0.01, 0.01, -0.01, 0.01, -0.01, 0.01, -0.01]
    assert variance_ratio_test(momentum, 2).ratio > 1
    assert variance_ratio_test(reversion, 2).ratio < 1


def test_edge_cases():
    assert math.isnan(variance_ratio_test(R, 1).ratio)
    assert math.isnan(variance_ratio_test([0.01, 0.02], 2).ratio)
    assert math.isnan(variance_ratio_test([0.01, 0.01, 0.01, 0.01], 2).ratio)
