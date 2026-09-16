import math

from orderflow_metrics import kelly_fraction, kelly_leverage, growth_optimal_leverage

R = [
    0.012, -0.008, 0.005, -0.021, 0.015, 0.004, -0.011, 0.02, -0.006, 0.009, 0.001,
    -0.014, 0.017, -0.003, 0.006, 0.011, -0.032, 0.007, 0.002, -0.01, 0.013, -0.004,
    0.008, -0.006, 0.019, -0.025, 0.003, 0.014, -0.009, 0.006,
]


def test_kelly_fraction():
    assert math.isclose(kelly_fraction(0.6, 2.0), 0.4, abs_tol=1e-12)
    assert math.isclose(kelly_fraction(0.55, 1.0), 0.1, abs_tol=1e-12)
    assert math.isclose(kelly_fraction(0.4, 1.0), -0.2, abs_tol=1e-12)


def test_kelly_leverage():
    mu = sum(R) / len(R)
    v = sum((x - mu) ** 2 for x in R) / len(R)
    assert math.isclose(kelly_leverage(mu, v), 4.63955998144176, abs_tol=1e-9)


def test_growth_optimal_leverage():
    lam = growth_optimal_leverage(R)
    assert math.isclose(lam, 4.455232959391717, abs_tol=1e-6)
    assert abs(lam - 4.455232928) < 1e-4  # matches scipy's bounded optimum
    g = lambda l: sum(math.log(1 + l * r) for r in R) / len(R)
    assert g(lam) > g(lam + 0.1)
    assert g(lam) > g(lam - 0.1)


def test_empirical_below_gaussian():
    mu = sum(R) / len(R)
    v = sum((x - mu) ** 2 for x in R) / len(R)
    assert growth_optimal_leverage(R) < kelly_leverage(mu, v)


def test_edge_cases():
    assert math.isnan(kelly_fraction(1.2, 2))
    assert math.isnan(kelly_fraction(0.5, 0))
    assert math.isnan(kelly_leverage(0.01, 0))
    assert math.isnan(growth_optimal_leverage([0.01]))
    assert math.isnan(growth_optimal_leverage([0.01, 0.02, 0.03]))
    assert math.isnan(growth_optimal_leverage([-0.01, -0.02]))
