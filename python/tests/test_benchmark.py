import math

from orderflow_metrics import (
    jensens_alpha,
    treynor_ratio,
    tracking_error,
    information_ratio,
)

R = [
    0.012, -0.008, 0.005, -0.021, 0.015, 0.004, -0.011, 0.02, -0.006, 0.009, 0.001,
    -0.014, 0.017, -0.003, 0.006, 0.011, -0.032, 0.007, 0.002, -0.01, 0.013, -0.004,
    0.008, -0.006, 0.019, -0.025, 0.003, 0.014, -0.009, 0.006,
]
M = [
    0.008, -0.004, 0.006, -0.015, 0.011, 0.002, -0.007, 0.014, -0.003, 0.006, 0.0,
    -0.009, 0.012, -0.002, 0.004, 0.008, -0.02, 0.005, 0.001, -0.006, 0.009, -0.002,
    0.005, -0.003, 0.013, -0.016, 0.002, 0.01, -0.005, 0.004,
]


def test_jensens_alpha_reference():
    assert math.isclose(jensens_alpha(R, M), -0.000632793472966, abs_tol=1e-9)


def test_treynor_reference():
    assert math.isclose(treynor_ratio(R, M), 0.000511308279022, abs_tol=1e-9)


def test_tracking_error_reference():
    assert math.isclose(tracking_error(R, M), 0.004472778457116, abs_tol=1e-9)


def test_information_ratio_reference():
    assert math.isclose(information_ratio(R, M), -0.037262446209811, abs_tol=1e-9)


def test_constant_active_return():
    bench = [0.01, -0.01, 0.02, -0.005, 0.008]
    out = [m + 0.003 for m in bench]
    assert information_ratio(out, bench) > 0
    assert math.isclose(jensens_alpha(out, bench), 0.003, abs_tol=1e-9)


def test_identical_series():
    assert math.isnan(information_ratio(R, R))
    assert math.isclose(tracking_error(R, R), 0.0, abs_tol=1e-12)
    assert math.isclose(jensens_alpha(R, R), 0.0, abs_tol=1e-12)


def test_risk_free_feeds_through():
    assert jensens_alpha(R, M, 0.001) != jensens_alpha(R, M, 0.0)
    assert math.isfinite(treynor_ratio(R, M, 0.001))


def test_edge_cases():
    assert math.isnan(jensens_alpha([0.01], [0.01]))
    assert math.isnan(tracking_error([], []))
    flat = [0.01, 0.01, 0.01, 0.01, 0.01]
    assert math.isnan(jensens_alpha(R[:5], flat))
    assert math.isnan(treynor_ratio(R[:5], flat))
