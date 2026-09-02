import math

from orderflow_metrics import (
    mean_reversion_speed,
    half_life,
    z_score,
)

# Mean-reverting spread oscillating around ~10.
S = [10.0, 10.6, 10.1, 9.7, 10.2, 9.8, 10.3, 9.9]


def test_speed_and_half_life():
    kappa = mean_reversion_speed(S)
    assert math.isclose(kappa, 1.3928571428571417, abs_tol=1e-9)  # 39/28
    assert kappa > 0
    assert math.isclose(half_life(S), math.log(2.0) / kappa, abs_tol=1e-12)
    assert math.isclose(half_life(S), 0.49764412963278165, abs_tol=1e-9)


def test_half_life_is_ln2_over_speed():
    assert math.isclose(half_life(S) * mean_reversion_speed(S), math.log(2.0), abs_tol=1e-12)


def test_z_score():
    assert math.isclose(z_score(S), -0.6416889479197506, abs_tol=1e-9)
    assert math.isclose(z_score([2, 4, 6]), 1.224744871391589, abs_tol=1e-9)


def test_perfect_alternation():
    a = [1.0, -1.0, 1.0, -1.0, 1.0, -1.0]
    assert math.isclose(mean_reversion_speed(a), 2.0, abs_tol=1e-9)
    assert math.isclose(half_life(a), math.log(2.0) / 2.0, abs_tol=1e-9)
    assert math.isclose(z_score(a), -1.0, abs_tol=1e-12)


def test_trend_does_not_revert():
    t = [1.0, 2.0, 3.0, 4.0, 5.0]
    assert math.isclose(mean_reversion_speed(t), 0.0, abs_tol=1e-12)
    assert half_life(t) == math.inf


def test_explosive_series():
    e = [1.0, 2.0, 4.0, 8.0, 16.0]
    assert math.isclose(mean_reversion_speed(e), -1.0, abs_tol=1e-9)
    assert half_life(e) == math.inf


def test_edges():
    assert mean_reversion_speed([1.0, 2.0]) == 0.0
    assert half_life([1.0, 2.0]) == math.inf
    c = [5.0, 5.0, 5.0, 5.0]
    assert mean_reversion_speed(c) == 0.0
    assert half_life(c) == math.inf
    assert z_score(c) == 0.0
    assert z_score([]) == 0.0
