import math

from orderflow_metrics import (
    Level,
    BookSnapshot,
    multi_level_ofi,
    multi_level_ofi_series,
    depth_weighted_ofi,
)

PREV = BookSnapshot(
    bids=[Level(100.0, 200), Level(99.9, 150), Level(99.8, 120)],
    asks=[Level(100.1, 180), Level(100.2, 160), Level(100.3, 140)],
)
CURR = BookSnapshot(
    bids=[Level(100.0, 260), Level(99.9, 150), Level(99.8, 90)],
    asks=[Level(100.1, 120), Level(100.2, 160), Level(100.3, 140)],
)


def test_vector():
    assert multi_level_ofi(PREV, CURR, 3) == [120, 0, -30]


def test_depth_weighted():
    assert math.isclose(depth_weighted_ofi(PREV, CURR, 3, 0.5), 64.28571428571429, abs_tol=1e-9)
    assert math.isclose(depth_weighted_ofi(PREV, CURR, 3, 1.0), 30.0, abs_tol=1e-9)


def test_decay_concentrates_near_touch():
    light = depth_weighted_ofi(PREV, CURR, 3, 0.9)
    heavy = depth_weighted_ofi(PREV, CURR, 3, 0.2)
    assert heavy > light
    assert heavy < 120 and light > 30


def test_levels_beyond_depth_zero():
    assert multi_level_ofi(PREV, CURR, 4) == [120, 0, -30, 0.0]


def test_series():
    curr2 = BookSnapshot(
        bids=[Level(100.0, 240), Level(99.95, 100), Level(99.8, 90)],
        asks=[Level(100.1, 120), Level(100.2, 130), Level(100.3, 140)],
    )
    s = multi_level_ofi_series([PREV, CURR, curr2], 3)
    assert s == [[120, 0, -30], [-20, 130, 0]]


def test_edges():
    empty = BookSnapshot(bids=[], asks=[])
    assert multi_level_ofi(empty, empty, 3) == [0.0, 0.0, 0.0]
    assert depth_weighted_ofi(empty, empty, 3, 0.5) == 0.0
    assert multi_level_ofi(PREV, CURR, 0) == []
    assert depth_weighted_ofi(PREV, CURR, 0, 0.5) == 0.0
    assert depth_weighted_ofi(PREV, CURR, 3, 0.0) == 0.0
    assert multi_level_ofi_series([PREV], 3) == []
