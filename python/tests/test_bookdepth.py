import math

from orderflow_metrics import (
    Level,
    depth_within,
    order_book_slope,
    cost_of_round_trip,
)

# best-first: bids by descending price, asks by ascending price. mid = 99.975
BIDS = [Level(99.95, 6), Level(99.90, 10), Level(99.85, 15), Level(99.75, 25)]
ASKS = [Level(100.00, 5), Level(100.05, 8), Level(100.10, 12), Level(100.20, 20)]


def test_depth_within():
    d10 = depth_within(BIDS, ASKS, 10)
    assert d10.bid_depth == 16
    assert d10.ask_depth == 13
    assert d10.total == 29
    d20 = depth_within(BIDS, ASKS, 20)
    assert d20.bid_depth == 31
    assert d20.ask_depth == 25
    assert d20.total == 56


def test_order_book_slope():
    assert math.isclose(order_book_slope(ASKS, 99.975), 19994.999999999243, rel_tol=1e-12)
    assert math.isclose(order_book_slope(BIDS, 99.975), 24882.66666666729, rel_tol=1e-12)


def test_cost_of_round_trip():
    rt = cost_of_round_trip(BIDS, ASKS, 15)
    assert math.isclose(rt.avg_buy_price, 100.04, abs_tol=1e-9)
    assert math.isclose(rt.avg_sell_price, 99.92, abs_tol=1e-9)
    assert math.isclose(rt.round_trip_bps, 12.00300075018658, rel_tol=1e-12)
    assert rt.filled_size == 15

    small = cost_of_round_trip(BIDS, ASKS, 5)
    assert math.isclose(small.avg_buy_price, 100.0, abs_tol=1e-9)
    assert math.isclose(small.avg_sell_price, 99.95, abs_tol=1e-9)
    assert math.isclose(small.round_trip_bps, 5.001250312577861, rel_tol=1e-12)


def test_bigger_round_trip_costs_more():
    a = cost_of_round_trip(BIDS, ASKS, 5).round_trip_bps
    b = cost_of_round_trip(BIDS, ASKS, 15).round_trip_bps
    assert b > a


def test_thin_side_caps_filled():
    # asks total 45, bids total 56 -> only 45 can round-trip
    rt = cost_of_round_trip(BIDS, ASKS, 200)
    assert rt.filled_size == 45


def test_edges():
    assert depth_within([], ASKS, 10).total == 0
    assert depth_within(BIDS, ASKS, 0).total == 0
    assert order_book_slope([], 100) == 0
    assert order_book_slope(ASKS, 0) == 0
    assert order_book_slope([Level(100, 5)], 100) == 0
    assert cost_of_round_trip(BIDS, [], 10).filled_size == 0
    assert cost_of_round_trip(BIDS, ASKS, 0).filled_size == 0
