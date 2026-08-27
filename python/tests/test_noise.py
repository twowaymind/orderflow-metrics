import math

from orderflow_metrics import (
    noise_variance,
    sparse_realized_variance,
    volatility_signature,
)

# A bouncing series — strong bid-ask-bounce style microstructure noise.
R = [
    0.002, -0.0015, 0.0018, -0.0016, 0.0021, -0.0014, 0.0019, -0.0017, 0.0022,
    -0.0015, 0.002, -0.0016,
]
RV_ALL = 3.8570000000000005e-05


def test_noise_variance():
    assert math.isclose(noise_variance(R), 1.6070833333333335e-06, abs_tol=1e-18)


def test_sparse_step1_is_plain_rv():
    assert math.isclose(sparse_realized_variance(R, 1), RV_ALL, abs_tol=1e-18)


def test_sparse_regression_values():
    assert math.isclose(sparse_realized_variance(R, 2), 1.2799999999999998e-06, abs_tol=1e-18)
    assert math.isclose(sparse_realized_variance(R, 3), 1.218e-05, abs_tol=1e-18)
    assert math.isclose(sparse_realized_variance(R, 4), 1.9424999999999996e-06, abs_tol=1e-18)


def test_coarser_suppresses_noise():
    assert sparse_realized_variance(R, 2) < sparse_realized_variance(R, 1) / 10


def test_signature():
    sig = volatility_signature(R, [1, 2, 3, 4])
    assert [s for s, _ in sig] == [1, 2, 3, 4]
    assert math.isclose(sig[0][1], RV_ALL, abs_tol=1e-18)
    assert math.isclose(sig[1][1], 1.2799999999999998e-06, abs_tol=1e-18)


def test_edge_cases():
    assert noise_variance([]) == 0.0
    assert sparse_realized_variance([], 2) == 0.0
    assert sparse_realized_variance(R, 0) == 0.0
    assert sparse_realized_variance(R, 999) == 0.0
    assert volatility_signature([], [1, 2]) == [(1, 0.0), (2, 0.0)]


def test_non_negative():
    assert noise_variance(R) >= 0.0
    for k in (1, 2, 3, 4, 5):
        assert sparse_realized_variance(R, k) >= 0.0
