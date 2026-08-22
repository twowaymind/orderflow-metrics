import math

from orderflow_metrics import Ewma, EwmaVariance, RollingWindow, Welford


def batch_mean(xs):
    return sum(xs) / len(xs) if xs else 0.0


def batch_var(xs, ddof=1):
    if len(xs) <= ddof:
        return 0.0
    m = batch_mean(xs)
    ss = sum((x - m) ** 2 for x in xs)
    return ss / (len(xs) - ddof)


SERIES = [0.5, -0.2, 0.3, -0.1, 0.4, 1.7, -0.9, 0.05, 0.6, -0.3, 0.8, 0.2]


def test_welford_matches_batch_each_step():
    w = Welford()
    seen = []
    for x in SERIES:
        w.push(x)
        seen.append(x)
        assert math.isclose(w.mean, batch_mean(seen), abs_tol=1e-9)
        assert math.isclose(w.variance, batch_var(seen, 1), abs_tol=1e-9)
        assert math.isclose(w.population_variance, batch_var(seen, 0), abs_tol=1e-9)
        assert w.count == len(seen)


def test_welford_stable_with_large_offset():
    w = Welford()
    base = 1e9
    for v in (base + 1, base + 2, base + 3, base + 4, base + 5):
        w.push(v)
    assert math.isclose(w.variance, 2.5, abs_tol=1e-6)


def test_ewma_regression_value():
    e = Ewma(0.94)
    for x in [0.5, -0.2, 0.3, -0.1, 0.4]:
        e.push(x)
    assert math.isclose(e.value, 0.41467227199999995, abs_tol=1e-15)


def test_ewma_seed_and_validation():
    e = Ewma(0.9)
    assert e.initialized is False
    assert e.value == 0.0
    e.push(3)
    assert e.value == 3
    assert e.initialized is True
    for bad in (0.0, 1.0, 1.5, -0.1):
        try:
            Ewma(bad)
            assert False, "expected ValueError"
        except ValueError:
            pass


def test_ewma_variance_regression_value():
    ev = EwmaVariance(0.94)
    for r in [0.5, -0.2, 0.3, -0.1, 0.4]:
        ev.push(r)
    assert math.isclose(ev.variance, 0.21211608159999998, abs_tol=1e-15)
    assert math.isclose(ev.std, 0.4605606166401986, abs_tol=1e-15)


def test_rolling_window_matches_batch_each_step():
    size = 4
    rw = RollingWindow(size)
    seen = []
    for x in SERIES:
        rw.push(x)
        seen.append(x)
        window = seen[-size:]
        assert math.isclose(rw.mean, batch_mean(window), abs_tol=1e-9)
        assert math.isclose(rw.variance, batch_var(window, 1), abs_tol=1e-9)
        assert math.isclose(rw.population_variance, batch_var(window, 0), abs_tol=1e-9)
        assert rw.count == min(len(seen), size)
        assert rw.full == (len(seen) >= size)


def test_rolling_window_exact_after_evictions():
    rw = RollingWindow(3)
    for x in [1, 2, 3, 4, 5, 6]:
        rw.push(x)
    assert math.isclose(rw.mean, 5.0, abs_tol=1e-12)
    assert math.isclose(rw.variance, 1.0, abs_tol=1e-12)
    assert rw.count == 3


def test_edge_cases():
    w = Welford()
    assert w.mean == 0.0
    assert w.variance == 0.0
    assert w.std == 0.0
    w.push(7)
    assert w.mean == 7
    assert w.variance == 0.0
    rw = RollingWindow(5)
    assert rw.mean == 0.0
    assert rw.variance == 0.0
    assert rw.full is False
    for bad in (0, -1):
        try:
            RollingWindow(bad)
            assert False, "expected ValueError"
        except ValueError:
            pass
