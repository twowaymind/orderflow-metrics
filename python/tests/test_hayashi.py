import math

from orderflow_metrics import (
    TimedPrice,
    hayashi_yoshida_covariance,
    hayashi_yoshida_correlation,
    realized_covariance,
)

X = [
    TimedPrice(0, 100.0),
    TimedPrice(1, 100.5),
    TimedPrice(3, 100.2),
    TimedPrice(4, 100.4),
]
Y = [
    TimedPrice(0, 50.0),
    TimedPrice(2, 50.2),
    TimedPrice(3, 50.1),
    TimedPrice(5, 50.4),
]


def test_covariance_over_overlaps():
    assert math.isclose(hayashi_yoshida_covariance(X, Y), 0.13, abs_tol=1e-9)


def test_correlation():
    assert math.isclose(
        hayashi_yoshida_correlation(X, Y), 0.5636214801906857, abs_tol=1e-12
    )


def test_touching_intervals_do_not_overlap():
    a = [TimedPrice(0, 10), TimedPrice(3, 11)]  # (0,3]
    b = [TimedPrice(3, 20), TimedPrice(6, 25)]  # (3,6] — touches at 3 only
    assert math.isclose(hayashi_yoshida_covariance(a, b), 0.0, abs_tol=1e-12)


def test_collapses_to_realized_covariance_on_shared_grid():
    a = [TimedPrice(0, 10.0), TimedPrice(1, 10.2), TimedPrice(2, 9.9), TimedPrice(3, 10.1)]
    b = [TimedPrice(0, 20.0), TimedPrice(1, 20.1), TimedPrice(2, 20.3), TimedPrice(3, 20.0)]
    returns_a = [0.2, -0.3, 0.2]
    returns_b = [0.1, 0.2, -0.3]
    assert math.isclose(
        hayashi_yoshida_covariance(a, b),
        realized_covariance(returns_a, returns_b),
        abs_tol=1e-12,
    )


def test_symmetry():
    assert math.isclose(
        hayashi_yoshida_covariance(X, Y),
        hayashi_yoshida_covariance(Y, X),
        abs_tol=1e-12,
    )


def test_self_covariance_is_realized_variance():
    assert math.isclose(
        hayashi_yoshida_covariance(X, X),
        0.5 * 0.5 + 0.3 * 0.3 + 0.2 * 0.2,
        abs_tol=1e-9,
    )
    assert math.isclose(hayashi_yoshida_correlation(X, X), 1.0, abs_tol=1e-12)


def test_edge_cases():
    assert hayashi_yoshida_covariance([], []) == 0
    assert hayashi_yoshida_covariance([TimedPrice(0, 1)], Y) == 0
    assert math.isnan(hayashi_yoshida_correlation([], []))
    flat = [TimedPrice(0, 5), TimedPrice(1, 5)]
    assert math.isnan(hayashi_yoshida_correlation(flat, Y))
