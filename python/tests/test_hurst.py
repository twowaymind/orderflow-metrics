import math

from orderflow_metrics import hurst_exponent


def minstd(n):
    x = 1
    s = []
    for _ in range(n):
        x = (48271 * x) % 2147483647
        s.append(x / 2147483647)
    return s


def test_hurst_regression_value():
    assert math.isclose(hurst_exponent(minstd(128)), 0.638944060791, abs_tol=1e-9)


def test_noise_near_half_walk_higher():
    noise = minstd(128)
    h = hurst_exponent(noise)
    assert 0.3 < h < 0.7
    c = 0.0
    walk = []
    for v in noise:
        c += v - 0.5
        walk.append(c)
    assert hurst_exponent(walk) > h


def test_short_series_nan():
    assert math.isnan(hurst_exponent(list(range(1, 9))))
    assert math.isnan(hurst_exponent([]))
