import math

from orderflow_metrics import (
    lee_mykland_statistics,
    lee_mykland_critical_value,
    lee_mykland_jumps,
)

# Clean deterministic series: alternating ~1% returns with one clear jump at i=15.
R = [
    0.01, -0.008, 0.011, -0.009, 0.01, -0.011, 0.009, -0.01, 0.012, -0.008,
    0.01, -0.009, 0.011, -0.01, 0.009, 0.09, -0.01, 0.011, -0.009, 0.01,
    -0.011, 0.009, -0.01, 0.012,
]


def test_statistics_reference():
    L = lee_mykland_statistics(R, window_size=5)
    for i in range(4):
        assert math.isnan(L[i])
    assert not math.isnan(L[4])
    assert math.isclose(L[4], 0.845755942941, abs_tol=1e-9)
    assert math.isclose(L[14], 0.719295931966, abs_tol=1e-9)
    assert math.isclose(L[15], 7.192959319665, abs_tol=1e-9)


def test_critical_value_reference():
    assert math.isclose(lee_mykland_critical_value(20, 0.01), 3.869131546641, abs_tol=1e-9)


def test_detects_planted_jump():
    jumps = lee_mykland_jumps(R, window_size=5, significance=0.01)
    assert len(jumps) == 1
    assert jumps[0].index == 15
    assert jumps[0].direction == 1
    assert math.isclose(jumps[0].statistic, 7.192959319665, abs_tol=1e-9)


def test_down_jump_direction():
    r = list(R)
    r[15] = -0.09
    jumps = lee_mykland_jumps(r, window_size=5, significance=0.01)
    assert len(jumps) == 1
    assert jumps[0].index == 15
    assert jumps[0].direction == -1


def test_diffusive_series_has_no_jumps():
    calm = [
        0.01, -0.008, 0.011, -0.009, 0.01, -0.011, 0.009, -0.01, 0.012, -0.008,
        0.01, -0.009, 0.011, -0.01, 0.009, -0.008, 0.01, -0.009, 0.011, -0.01,
    ]
    assert lee_mykland_jumps(calm, window_size=5) == []


def test_default_window():
    # n = 24 -> round(sqrt(24)) = 5, matching the explicit K=5 result
    assert lee_mykland_jumps(R) == lee_mykland_jumps(R, window_size=5)


def test_degenerate_window_is_nan():
    r = [0, 0, 0, 0, 0.05, -0.01, 0.02, -0.015, 0.01]
    L = lee_mykland_statistics(r, window_size=5)
    assert math.isnan(L[4])
    assert all(not math.isinf(v) for v in L)


def test_edge_cases():
    assert lee_mykland_statistics([], window_size=5) == []
    assert lee_mykland_jumps([0.01, -0.02, 0.03], window_size=5) == []
    assert math.isnan(lee_mykland_critical_value(1))
    assert math.isnan(lee_mykland_critical_value(20, 0.0))
    assert math.isnan(lee_mykland_critical_value(20, 1.0))
