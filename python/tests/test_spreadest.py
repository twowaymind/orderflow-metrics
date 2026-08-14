import math

from orderflow_metrics import Ohlc, abdi_ranaldo, corwin_schultz

BOUNCE = [
    Ohlc(10.2, 9.8, 10.18),
    Ohlc(10.25, 9.85, 9.88),
    Ohlc(10.3, 9.9, 10.27),
    Ohlc(10.15, 9.75, 9.78),
    Ohlc(10.35, 9.95, 10.32),
]


def test_corwin_schultz_positive_spread():
    assert math.isclose(corwin_schultz(BOUNCE), 0.014838161189, abs_tol=1e-9)


def test_abdi_ranaldo_positive_spread():
    assert math.isclose(abdi_ranaldo(BOUNCE), 0.042078311801, abs_tol=1e-9)


def test_need_two_bars():
    assert corwin_schultz([]) == 0.0
    assert corwin_schultz([Ohlc(10, 9, 9.5)]) == 0.0
    assert abdi_ranaldo([Ohlc(10, 9, 9.5)]) == 0.0


def test_flat_bars_zero_spread():
    flat = [Ohlc(10, 10, 10), Ohlc(10, 10, 10)]
    assert math.isclose(corwin_schultz(flat), 0.0, abs_tol=1e-12)
    assert math.isclose(abdi_ranaldo(flat), 0.0, abs_tol=1e-12)


def test_abdi_ranaldo_trending_floored_at_zero():
    trend = [
        Ohlc(10.1, 9.9, 10.0),
        Ohlc(10.2, 10.0, 10.15),
        Ohlc(10.3, 10.05, 10.2),
    ]
    assert abdi_ranaldo(trend) == 0.0
