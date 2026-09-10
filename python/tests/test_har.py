import math

from orderflow_metrics import har_components, har_forecast

RV = [
    0.8, 1.0, 0.9, 1.2, 1.1, 0.7, 0.6, 0.9, 1.3, 1.5, 1.2, 1.0, 0.8, 0.9, 1.1,
    1.4, 1.6, 1.3, 1.1, 0.9, 0.7, 0.8, 1.0, 1.2, 1.5, 1.7, 1.4, 1.2, 1.0, 1.1,
    0.95, 1.25, 1.35, 1.05, 0.85, 0.9, 1.15, 1.45, 1.55, 1.2, 1.0, 0.9, 1.1, 1.3,
    1.25,
]


def test_components():
    c = har_components(RV)
    assert math.isclose(c.daily, 1.25, abs_tol=1e-9)
    assert math.isclose(c.weekly, (1.0 + 0.9 + 1.1 + 1.3 + 1.25) / 5, abs_tol=1e-9)
    assert math.isclose(c.monthly, 1.1977272727272727, abs_tol=1e-9)


def test_fit_and_forecast_reference():
    f = har_forecast(RV)
    assert math.isclose(f.coefficients.intercept, 1.4149855768430284, abs_tol=1e-6)
    assert math.isclose(f.coefficients.daily, 0.6068675996730355, abs_tol=1e-6)
    assert math.isclose(f.coefficients.weekly, -0.8485968216666858, abs_tol=1e-6)
    assert math.isclose(f.coefficients.monthly, 0.03520511355716988, abs_tol=1e-6)
    assert math.isclose(f.forecast, 1.2737937290311845, abs_tol=1e-6)


def test_forecast_is_coeffs_applied_to_components():
    f = har_forecast(RV)
    c = har_components(RV)
    manual = (
        f.coefficients.intercept
        + f.coefficients.daily * c.daily
        + f.coefficients.weekly * c.weekly
        + f.coefficients.monthly * c.monthly
    )
    assert math.isclose(f.forecast, manual, abs_tol=1e-9)


def test_constant_series_is_singular():
    # all three regressors equal the constant → collinear → singular → NaN
    f = har_forecast([2.5] * 40)
    assert math.isnan(f.forecast)
    assert math.isnan(f.coefficients.intercept)


def test_custom_windows():
    f = har_forecast(RV, weekly=3, monthly=10)
    c = har_components(RV, weekly=3, monthly=10)
    assert math.isclose(c.weekly, (1.1 + 1.3 + 1.25) / 3, abs_tol=1e-9)  # last 3
    assert math.isfinite(f.forecast)


def test_windows_longer_than_series():
    c = har_components([2, 4], weekly=5, monthly=22)
    assert math.isclose(c.daily, 4, abs_tol=1e-12)
    assert math.isclose(c.weekly, 3, abs_tol=1e-12)
    assert math.isclose(c.monthly, 3, abs_tol=1e-12)


def test_edge_cases():
    nan = har_forecast([1, 2, 3])
    assert math.isnan(nan.forecast)
    assert math.isnan(nan.coefficients.intercept)
    empty = har_components([])
    assert math.isnan(empty.daily)
