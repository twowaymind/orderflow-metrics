import math

from orderflow_metrics import (
    bipower_variation,
    jump_variation,
    relative_jump_variation,
)

WITH_JUMP = [0.001, -0.0015, 0.002, -0.001, 0.0012, 0.05, -0.0008, 0.0011]


def test_bipower_variation():
    assert math.isclose(bipower_variation(WITH_JUMP), 0.000170557065, abs_tol=1e-12)


def test_jump_variation():
    assert math.isclose(jump_variation(WITH_JUMP), 0.002340982935, abs_tol=1e-12)


def test_relative_jump():
    rj = relative_jump_variation(WITH_JUMP)
    assert math.isclose(rj, 0.932090643524, abs_tol=1e-9)
    assert 0.0 <= rj <= 1.0


def test_smooth_series_no_jump():
    smooth = [0.001, -0.0012, 0.0011, -0.0009, 0.0013, -0.001, 0.0008, -0.0011]
    assert jump_variation(smooth) == 0.0
    assert relative_jump_variation(smooth) == 0.0


def test_edge_cases():
    assert bipower_variation([]) == 0.0
    assert bipower_variation([0.01]) == 0.0
    assert jump_variation([0.01]) == 0.0
    assert relative_jump_variation([0, 0, 0]) == 0.0
