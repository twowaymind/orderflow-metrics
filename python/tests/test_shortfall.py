import math

from orderflow_metrics import (
    ShortfallResult,
    arrival_slippage_bps,
    implementation_shortfall,
)


def close(a, b, eps=1e-9):
    assert math.isclose(a, b, abs_tol=eps), f"{a} !~= {b}"


def test_implementation_shortfall_buy():
    r = implementation_shortfall("buy", 100, 100.5, 800, 1000, 101, 5)
    assert isinstance(r, ShortfallResult)
    close(r.execution, 400)  # (100.5 - 100) * 800
    close(r.opportunity, 200)  # (101 - 100) * 200 unfilled
    close(r.fees, 5)
    close(r.total, 605)


def test_implementation_shortfall_sell():
    r = implementation_shortfall("sell", 100, 99.5, 800, 1000, 99, 0)
    close(r.execution, 400)  # (100 - 99.5) * 800
    close(r.opportunity, 200)  # (100 - 99) * 200
    close(r.total, 600)


def test_full_fill_has_no_opportunity_cost():
    r = implementation_shortfall("buy", 100, 100.2, 1000, 1000, 105, 0)
    close(r.opportunity, 0)
    close(r.total, r.execution)


def test_arrival_slippage_bps():
    close(arrival_slippage_bps("buy", 100, 100.5), 50)  # paid up 50 bps
    close(arrival_slippage_bps("sell", 100, 99.5), 50)  # sold low 50 bps
    close(arrival_slippage_bps("buy", 100, 99.5), -50)  # price improvement
    assert arrival_slippage_bps("buy", 0, 100) == 0
