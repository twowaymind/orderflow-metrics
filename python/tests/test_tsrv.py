import math

from orderflow_metrics import two_scale_realized_variance, two_scale_realized_volatility

# deterministic: positive drift (~0.0008) + alternating bid-ask bounce (±0.002)
R = [
    0.0028, -0.0013, 0.0029, -0.0012, 0.0027, -0.0011, 0.0028, -0.0014, 0.003,
    -0.0013, 0.0029, -0.0012, 0.0027, -0.0011, 0.0028, -0.0014, 0.003, -0.0013,
    0.0029, -0.0012,
]
RV_ALL = 9.706e-05


def test_tsrv_regression():
    assert math.isclose(two_scale_realized_variance(R, 4), 2.9148888888888926e-05, abs_tol=1e-18)
    assert math.isclose(two_scale_realized_variance(R, 5), 5.7921904761904804e-05, abs_tol=1e-18)


def test_tsrv_removes_noise_bias():
    t = two_scale_realized_variance(R, 4)
    assert t > 0
    assert t < RV_ALL / 2


def test_two_scale_volatility():
    assert math.isclose(
        two_scale_realized_volatility(R, 4), math.sqrt(2.9148888888888926e-05), rel_tol=1e-12
    )


def test_fallback_and_edges():
    assert math.isclose(two_scale_realized_variance(R, 1), RV_ALL, abs_tol=1e-18)
    assert two_scale_realized_variance([], 4) == 0.0
    assert two_scale_realized_variance([0.01], 4) == 0.0
    assert two_scale_realized_volatility(R, 4) >= 0.0
