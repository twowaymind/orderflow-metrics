import math

import pytest

from orderflow_metrics import (
    FlowObservation,
    L1Quote,
    PriceVsMid,
    ReturnVolume,
    Trade,
    amihud_illiquidity,
    annualized_volatility,
    autocorrelation,
    bucket_by_volume,
    bvc_buy_fraction,
    depth_imbalance,
    effective_spread,
    kyle_lambda,
    lee_ready,
    mid,
    ofi,
    ofi_series,
    price_impact,
    realized_spread,
    realized_volatility,
    relative_spread_bps,
    roll_spread,
    standard_normal_cdf,
    tick_rule,
    trade_imbalance,
    variance_ratio,
    vpin,
    weighted_mid,
)


def close(a, b, eps=1e-9):
    assert math.isclose(a, b, abs_tol=eps), f"{a} !~= {b}"


# --- OFI ---
def test_ofi():
    quotes = [
        L1Quote(bid_price=100, bid_size=5, ask_price=101, ask_size=4),
        L1Quote(bid_price=100, bid_size=8, ask_price=101, ask_size=1),
        L1Quote(bid_price=100.5, bid_size=2, ask_price=101, ask_size=1),
    ]
    assert ofi(quotes) == 8
    assert ofi_series(quotes) == [6, 2]
    assert ofi([]) == 0


# --- Imbalance ---
def test_imbalance():
    close(depth_imbalance(L1Quote(100, 5, 101, 4)), 1 / 9)
    close(
        trade_imbalance([Trade(100, 2, "buy"), Trade(100, 1, "sell")]),
        1 / 3,
    )
    assert depth_imbalance(L1Quote(100, 0, 101, 0)) == 0
    assert trade_imbalance([]) == 0


# --- Fair value ---
def test_fairvalue():
    close(weighted_mid(L1Quote(100, 5, 102, 5)), 101)
    close(weighted_mid(L1Quote(100, 9, 101, 1)), 100.9)
    close(weighted_mid(L1Quote(100, 0, 102, 0)), 101)  # fallback to mid
    close(mid(L1Quote(100, 5, 102, 5)), 101)
    close(relative_spread_bps(L1Quote(99.99, 1, 100.01, 1)), 2)
    assert relative_spread_bps(L1Quote(0, 1, 0, 1)) == 0


# --- Execution / TCA ---
def test_execution():
    close(effective_spread(101, 100, "buy"), 2)
    close(realized_spread(101, 100.5, "buy"), 1)
    close(price_impact(100, 100.5, "buy"), 1)
    # identity: effective - realized == impact
    close(
        effective_spread(101, 100, "buy") - realized_spread(101, 100.5, "buy"),
        price_impact(100, 100.5, "buy"),
    )
    close(
        kyle_lambda(
            [
                FlowObservation(price_change=1, signed_volume=2),
                FlowObservation(price_change=-1, signed_volume=-2),
            ]
        ),
        0.5,
    )
    assert kyle_lambda([]) == 0
    assert roll_spread([100]) == 0
    # negative autocovariance -> positive spread
    assert roll_spread([100, 101, 100, 101, 100]) > 0


# --- Trade-sign classification ---
def test_classify():
    assert tick_rule([100, 101, 101, 100]) == [0, 1, 1, -1]
    assert lee_ready([PriceVsMid(101, 100), PriceVsMid(99, 100)]) == [1, -1]


# --- Liquidity ---
def test_liquidity():
    close(
        amihud_illiquidity([ReturnVolume(0.02, 100), ReturnVolume(-0.01, 50)]),
        0.0002,
    )
    assert amihud_illiquidity([ReturnVolume(0.02, 0)]) == 0  # zero volume skipped


# --- Volatility ---
def test_volatility():
    close(realized_volatility([0.03, 0.04]), 0.05)
    assert annualized_volatility([], 252) == 0
    assert annualized_volatility([0.01, -0.01], 252) > 0


# --- Efficiency ---
def test_efficiency():
    close(autocorrelation([1, -1, 1, -1], 1), -0.75)
    assert autocorrelation([1, 2], 5) == 0
    assert autocorrelation([2, 2, 2], 1) == 0
    close(variance_ratio([0.5, -0.2, 0.1, 0.3, -0.4], 1), 1)
    close(variance_ratio([1, -1, 1, -1, 1, -1], 2), 0)
    assert variance_ratio([1, 1, 1, 1, -1, -1, -1, -1], 2) > 1
    assert variance_ratio([], 2) == 1
    assert variance_ratio([0.1, -0.2, 0.3], 3) == 1  # q == length degenerate


# --- VPIN ---
def test_vpin():
    close(standard_normal_cdf(0), 0.5)
    close(bvc_buy_fraction(1, 0), 0.5)  # sigma 0 -> 0.5
    trades = [Trade(10, 3, "buy"), Trade(11, 4, "buy"), Trade(12, 3, "sell")]
    buckets = bucket_by_volume(trades, 5)
    assert len(buckets) == 2
    assert all(b.volume == 5 for b in buckets)
    v = vpin(buckets)
    assert 0 <= v <= 1
    assert vpin([]) == 0
    with pytest.raises(ValueError):
        bucket_by_volume(trades, 0)
