import math

import pytest

from orderflow_metrics import (
    ImpactCost,
    MarkoutObservation,
    almgren_chriss_cost,
    average_markout,
    linear_permanent_impact,
    linear_temporary_impact,
    markout,
    square_root_impact,
)


def close(a, b, eps=1e-9):
    assert math.isclose(a, b, abs_tol=eps), f"{a} !~= {b}"


def test_square_root_law():
    close(square_root_impact(0.1, 100, 100), 0.1)  # sqrt(1) = 1
    close(square_root_impact(0.02, 1000, 1_000_000), 0.02 * math.sqrt(0.001))
    close(square_root_impact(0.1, 100, 100, 0.5), 0.05)  # coefficient
    assert square_root_impact(0.1, 100, 0) == 0  # no volume
    assert square_root_impact(0.1, 0, 100) == 0  # no size


def test_linear_impact_components():
    close(linear_permanent_impact(0.5, 10), 5)
    close(linear_temporary_impact(0.1, 20), 2)


def test_almgren_chriss_cost():
    c = almgren_chriss_cost(10, 5, 0.1, 0.2)
    assert isinstance(c, ImpactCost)
    close(c.permanent, 10)  # 0.5 * 0.2 * 100
    close(c.temporary, 2)  # 0.1 * 100 / 5
    close(c.total, 12)
    with pytest.raises(ValueError):
        almgren_chriss_cost(10, 0, 0.1, 0.2)  # non-positive duration


def test_markouts():
    close(markout("buy", 100, 100.5), 0.5)  # price up after a buy -> informed
    close(markout("sell", 100, 99.5), 0.5)  # price down after a sell -> informed
    close(markout("buy", 100, 99.5), -0.5)  # faded
    close(
        average_markout(
            [
                MarkoutObservation("buy", 100, 100.5),
                MarkoutObservation("sell", 100, 99.5),
            ]
        ),
        0.5,
    )
    assert average_markout([]) == 0
