import math

from orderflow_metrics import (
    OrderBook,
    dollar_bars,
    pov,
    simulate_market_order,
    tick_bars,
    twap,
    volume_bars,
)
from orderflow_metrics.types import Trade


def close(a, b, eps=1e-9):
    assert math.isclose(a, b, abs_tol=eps), f"{a} !~= {b}"


def T(price, size, side, ts=None):
    return Trade(price=price, size=size, side=side, ts=ts)


# --- OrderBook ---
def test_orderbook():
    ob = OrderBook()
    ob.update("bid", 100, 5)
    ob.update("ask", 101, 3)
    assert ob.best_bid() is not None and ob.best_bid().price == 100
    assert ob.best_ask().price == 101
    close(ob.mid(), 100.5)
    close(ob.spread(), 1)
    close(ob.imbalance(1), 0.25)  # (5-3)/(5+3)

    ob.update("bid", 99, 10)
    assert [level.price for level in ob.depth("bid", 2)] == [100, 99]  # best first

    ob.update("bid", 100, 0)  # size 0 removes the level
    assert ob.best_bid().price == 99


def test_orderbook_empty():
    ob = OrderBook()
    assert ob.best_bid() is None
    assert ob.mid() is None
    assert ob.spread() is None
    assert ob.imbalance(1) == 0


# --- Market-order simulation ---
def test_simulate_market_order():
    ob = OrderBook()
    ob.update("bid", 100, 5)
    ob.update("ask", 101, 2)
    ob.update("ask", 102, 5)

    r = simulate_market_order(ob, "buy", 4)
    assert r.filled_size == 4
    assert r.remaining_size == 0
    # 2 @ 101 + 2 @ 102 = 406, avg 101.5
    close(r.avg_price, 101.5)
    close(r.notional, 406)
    assert r.slippage_bps is not None and r.slippage_bps > 0

    thin = simulate_market_order(ob, "buy", 100)
    assert thin.remaining_size > 0  # book too thin


# --- Scheduling ---
def test_scheduling():
    assert twap(100, 4) == [25, 25, 25, 25]
    close(sum(twap(100, 3)), 100)  # exact sum
    assert pov(30, [100, 100, 100], 0.1) == [10, 10, 10]
    # remaining caps participation
    assert pov(15, [100, 100, 100], 0.1) == [10, 5, 0]


# --- Bars ---
def test_tick_bars():
    trades = [T(100, 1, "buy"), T(101, 1, "sell"), T(102, 1, "buy"), T(103, 1, "sell")]
    bars = tick_bars(trades, 2)
    assert len(bars) == 2
    b0 = bars[0]
    assert (b0.open, b0.high, b0.low, b0.close) == (100, 101, 100, 101)
    assert b0.ticks == 2 and b0.volume == 2
    close(b0.vwap, 100.5)
    assert b0.buy_volume == 1 and b0.sell_volume == 1

    # trailing partial bar dropped
    assert len(tick_bars([T(1, 1, "buy")] * 4, 3)) == 1
    assert tick_bars([], 2) == []
    assert tick_bars([T(1, 1, "buy")], 0) == []


def test_volume_and_dollar_bars():
    trades = [T(10, 3, "buy"), T(11, 4, "buy"), T(12, 2, "sell"), T(13, 5, "sell")]
    vb = volume_bars(trades, 5)
    assert len(vb) == 2
    assert vb[0].volume == 7 and vb[0].buy_volume == 7
    close(vb[0].vwap, (10 * 3 + 11 * 4) / 7)

    # threshold-crossing trade included whole (not split)
    single = volume_bars([T(100, 1, "buy"), T(100, 10, "buy")], 5)
    assert len(single) == 1 and single[0].volume == 11

    db = dollar_bars([T(10, 1, "buy"), T(10, 1, "buy"), T(20, 1, "sell")], 20)
    assert len(db) == 2
    assert db[0].dollar == 20 and db[0].ticks == 2

    # timestamps propagate
    ts_bars = tick_bars([T(1, 1, "buy", 1000), T(2, 1, "buy", 1500)], 2)
    assert ts_bars[0].start == 1000 and ts_bars[0].end == 1500

    assert volume_bars([T(1, 1, "buy")], 0) == []
    assert dollar_bars([T(1, 1, "buy")], -5) == []
