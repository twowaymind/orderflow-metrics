import math

from orderflow_metrics import (
    Candle,
    garman_klass_volatility,
    parkinson_volatility,
    rogers_satchell_volatility,
    yang_zhang_volatility,
)

CANDLES = [
    Candle(100, 105, 99, 102),
    Candle(102, 106, 101, 104),
    Candle(104, 104, 98, 99),
    Candle(99, 103, 97, 101),
    Candle(101, 107, 100, 105),
]


def test_parkinson():
    assert math.isclose(parkinson_volatility(CANDLES), 0.035537684906, abs_tol=1e-9)


def test_garman_klass():
    assert math.isclose(garman_klass_volatility(CANDLES), 0.036828671825, abs_tol=1e-9)


def test_rogers_satchell():
    assert math.isclose(rogers_satchell_volatility(CANDLES), 0.03609558372, abs_tol=1e-9)


def test_yang_zhang():
    assert math.isclose(yang_zhang_volatility(CANDLES), 0.035129342404, abs_tol=1e-9)


def test_empty_or_insufficient():
    assert parkinson_volatility([]) == 0.0
    assert garman_klass_volatility([]) == 0.0
    assert rogers_satchell_volatility([]) == 0.0
    assert yang_zhang_volatility([]) == 0.0
    assert yang_zhang_volatility(CANDLES[:2]) == 0.0  # needs >= 3 bars


def test_flat_candles_zero_vol():
    flat = [Candle(100, 100, 100, 100) for _ in range(3)]
    assert math.isclose(parkinson_volatility(flat), 0.0, abs_tol=1e-12)
    assert math.isclose(garman_klass_volatility(flat), 0.0, abs_tol=1e-12)
    assert math.isclose(rogers_satchell_volatility(flat), 0.0, abs_tol=1e-12)
    assert math.isclose(yang_zhang_volatility(flat), 0.0, abs_tol=1e-12)
