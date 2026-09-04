import math

from orderflow_metrics import (
    markout_profile,
    adverse_selection_score,
    average_markout_profile,
    MarkoutProfileObservation,
)


def close_arr(a, b):
    assert len(a) == len(b)
    for x, y in zip(a, b):
        assert math.isclose(x, y, abs_tol=1e-9)


def test_markout_profile():
    close_arr(markout_profile("buy", 100.0, [100.02, 100.05, 100.04]), [0.02, 0.05, 0.04])
    close_arr(markout_profile("sell", 100.0, [99.98, 99.95, 99.97]), [0.02, 0.05, 0.03])


def test_adverse_selection_score():
    assert math.isclose(adverse_selection_score("buy", 100.0, 100.02, 0.02), 2.0, abs_tol=1e-9)
    assert math.isclose(adverse_selection_score("sell", 100.0, 99.98, 0.02), 2.0, abs_tol=1e-9)
    assert math.isclose(adverse_selection_score("buy", 100.0, 100.004, 0.02), 0.4, abs_tol=1e-9)
    assert adverse_selection_score("buy", 100.0, 100.02, 0.0) == 0.0


def test_average_markout_profile():
    obs = [
        MarkoutProfileObservation("buy", 100.0, [100.02, 100.05, 100.04]),
        MarkoutProfileObservation("sell", 100.0, [99.98, 99.95, 99.97]),
    ]
    close_arr(average_markout_profile(obs), [0.02, 0.05, 0.035])


def test_ragged_average():
    obs = [
        MarkoutProfileObservation("buy", 10, [10.1, 10.2]),
        MarkoutProfileObservation("sell", 10, [9.9]),
    ]
    close_arr(average_markout_profile(obs), [0.1, 0.2])


def test_edges():
    assert markout_profile("buy", 100, []) == []
    assert average_markout_profile([]) == []
