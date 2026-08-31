import math

from orderflow_metrics import (
    quoted_spread,
    quoted_half_spread,
    price_improvement,
    effective_to_quoted_ratio,
)

# bid 99.98 / ask 100.02, mid 100.00, quoted spread 0.04
BID = 99.98
ASK = 100.02


def test_quoted_spread():
    assert math.isclose(quoted_spread(BID, ASK), 0.04, abs_tol=1e-9)
    assert math.isclose(quoted_half_spread(BID, ASK), 0.02, abs_tol=1e-9)


def test_price_improvement_positive():
    assert math.isclose(price_improvement(100.01, BID, ASK, "buy"), 0.01, abs_tol=1e-9)
    assert math.isclose(price_improvement(99.985, BID, ASK, "sell"), 0.005, abs_tol=1e-9)


def test_price_improvement_zero_and_negative():
    assert math.isclose(price_improvement(ASK, BID, ASK, "buy"), 0.0, abs_tol=1e-9)
    assert math.isclose(price_improvement(BID, BID, ASK, "sell"), 0.0, abs_tol=1e-9)
    assert math.isclose(price_improvement(100.05, BID, ASK, "buy"), -0.03, abs_tol=1e-9)
    assert math.isclose(price_improvement(99.95, BID, ASK, "sell"), -0.03, abs_tol=1e-9)


def test_effective_to_quoted_ratio():
    assert math.isclose(effective_to_quoted_ratio(0.02, 0.04), 0.5, abs_tol=1e-9)
    assert math.isclose(effective_to_quoted_ratio(0.03, 0.04), 0.75, abs_tol=1e-9)
    assert math.isclose(effective_to_quoted_ratio(0.04, 0.04), 1.0, abs_tol=1e-9)


def test_edges():
    assert effective_to_quoted_ratio(0.02, 0) == 0
    assert effective_to_quoted_ratio(0.02, -0.01) == 0
    assert quoted_spread(100, 100) == 0
    assert price_improvement(100, 100, 100, "buy") == 0
