import math

from orderflow_metrics import (
    realized_kernel,
    realized_kernel_volatility,
    realized_autocovariance,
    parzen_kernel,
)

# deterministic: positive drift (~0.0008) + alternating bid-ask bounce (±0.002)
R = [
    0.0028, -0.0013, 0.0029, -0.0012, 0.0027, -0.0011, 0.0028, -0.0014, 0.003,
    -0.0013, 0.0029, -0.0012, 0.0027, -0.0011, 0.0028, -0.0014, 0.003, -0.0013,
    0.0029, -0.0012,
]
RV = 9.706e-05  # gamma_0


def test_realized_autocovariance():
    assert math.isclose(realized_autocovariance(R, 0), RV, abs_tol=1e-18)
    assert math.isclose(realized_autocovariance(R, 1), -6.801000000000001e-05, abs_tol=1e-18)
    assert math.isclose(realized_autocovariance(R, 2), 8.714000000000001e-05, abs_tol=1e-18)
    assert realized_autocovariance(R, -1) == 0
    assert realized_autocovariance(R, len(R)) == 0


def test_parzen_kernel():
    assert parzen_kernel(0) == 1
    assert math.isclose(parzen_kernel(0.25), 0.71875)
    assert math.isclose(parzen_kernel(0.6), 0.128, abs_tol=1e-15)
    assert math.isclose(parzen_kernel(0.8), 0.016, abs_tol=1e-15)
    assert parzen_kernel(1) == 0
    assert parzen_kernel(1.5) == 0


def test_realized_kernel_regression():
    assert math.isclose(realized_kernel(R, 1), 6.305499999999998e-05, abs_tol=1e-18)
    assert math.isclose(realized_kernel(R, 2), 3.440296296296295e-05, abs_tol=1e-18)
    assert math.isclose(realized_kernel(R, 4), 4.808607999999996e-05, abs_tol=1e-18)
    assert math.isclose(realized_kernel(R, 5), 5.7029444444444435e-05, abs_tol=1e-18)


def test_kernel_corrects_noise_bias():
    assert realized_kernel(R, 2) < RV / 2
    assert realized_kernel(R, 2) > 0


def test_fallback_and_volatility():
    assert math.isclose(realized_kernel(R, 0), RV, abs_tol=1e-18)
    assert math.isclose(
        realized_kernel_volatility(R, 4), math.sqrt(4.808607999999996e-05), rel_tol=1e-12
    )
    assert realized_kernel_volatility(R, 4) >= 0


def test_edges():
    assert realized_kernel([], 4) == 0
    assert realized_kernel([0.01], 4) == 1e-4
    assert realized_kernel_volatility([], 4) == 0
