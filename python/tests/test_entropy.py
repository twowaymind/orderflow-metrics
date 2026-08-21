import math

from orderflow_metrics import (
    normalized_entropy,
    shannon_entropy,
    sign_entropy,
)


def test_two_equal_outcomes_one_bit():
    assert math.isclose(shannon_entropy([1, 1]), 1.0, abs_tol=1e-12)
    assert math.isclose(shannon_entropy([5, 5]), 1.0, abs_tol=1e-12)


def test_k_uniform_outcomes():
    assert math.isclose(shannon_entropy([1, 1, 1, 1]), 2.0, abs_tol=1e-12)
    assert math.isclose(shannon_entropy([2, 1, 1]), 1.5, abs_tol=1e-12)


def test_skewed_distribution():
    assert math.isclose(shannon_entropy([3, 1]), 0.8112781244591328, abs_tol=1e-15)


def test_fully_concentrated_zero_entropy():
    assert shannon_entropy([7]) == 0.0
    assert shannon_entropy([0, 4, 0]) == 0.0
    assert shannon_entropy([]) == 0.0


def test_normalized_entropy():
    assert math.isclose(normalized_entropy([1, 1, 1, 1]), 1.0, abs_tol=1e-12)
    assert math.isclose(normalized_entropy([2, 1, 1]), 0.9463946303571862, abs_tol=1e-15)
    assert math.isclose(normalized_entropy([3, 1]), 0.8112781244591328, abs_tol=1e-15)
    assert normalized_entropy([5]) == 0.0
    assert normalized_entropy([]) == 0.0


def test_zero_and_negative_weights_ignored():
    assert math.isclose(shannon_entropy([1, 0, 1]), 1.0, abs_tol=1e-12)
    assert math.isclose(shannon_entropy([1, -3, 1]), 1.0, abs_tol=1e-12)


def test_sign_entropy_series():
    series = [0.001, -0.0015, 0.002, -0.001, 0.0012, 0.05, -0.0008, 0.0011]
    se = sign_entropy(series)
    assert math.isclose(se, 0.954434002924965, abs_tol=1e-15)  # 5 up, 3 down
    assert 0.0 <= se <= 1.0


def test_balanced_vs_one_sided():
    assert math.isclose(sign_entropy([0.1, -0.1, 0.2, -0.2]), 1.0, abs_tol=1e-12)
    assert sign_entropy([0.1, 0.2, 0.3]) == 0.0
    assert sign_entropy([0, 0, 0]) == 0.0
