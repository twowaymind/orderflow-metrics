import math

from orderflow_metrics import med_rv, min_rv, realized_quarticity

# A quiet series with one large jump (the 0.05 return).
WITH_JUMP = [0.001, -0.0015, 0.002, -0.001, 0.0012, 0.05, -0.0008, 0.0011]


def _rv(r):
    return sum(x * x for x in r)


def test_min_rv():
    assert math.isclose(min_rv(WITH_JUMP), 2.5066227427721536e-05, abs_tol=1e-15)


def test_med_rv():
    assert math.isclose(med_rv(WITH_JUMP), 1.8981551692380114e-05, abs_tol=1e-15)


def test_realized_quarticity():
    assert math.isclose(realized_quarticity(WITH_JUMP), 1.6666738692800002e-05, abs_tol=1e-15)


def test_jump_robust():
    total = _rv(WITH_JUMP)
    assert min_rv(WITH_JUMP) < total / 50
    assert med_rv(WITH_JUMP) < total / 50


def test_med_rv_picks_median():
    scale = math.pi / (6 - 4 * math.sqrt(3) + math.pi)
    assert math.isclose(med_rv([1, 3, 2]), scale * (3 / 1) * 4, rel_tol=1e-12)


def test_edge_cases():
    assert min_rv([]) == 0.0
    assert min_rv([0.01]) == 0.0
    assert med_rv([0.01, 0.02]) == 0.0
    assert realized_quarticity([]) == 0.0


def test_non_negative():
    for fn in (min_rv, med_rv, realized_quarticity):
        assert fn(WITH_JUMP) >= 0.0
