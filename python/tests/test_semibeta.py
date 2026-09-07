import math

from orderflow_metrics import (
    realized_semibetas,
    downside_semibeta,
    semibeta_asymmetry,
    realized_beta,
)

ASSET = [0.02, -0.03, 0.01, -0.04, -0.01]
MARKET = [0.01, -0.02, 0.015, -0.03, 0.008]


def test_four_realized_semibetas():
    s = realized_semibetas(ASSET, MARKET)
    assert math.isclose(s.concordant_positive, 0.20722320899940794, abs_tol=1e-12)
    assert math.isclose(s.concordant_negative, 1.0657193605683837, abs_tol=1e-12)
    assert math.isclose(s.mixed_market_up, 0.04736530491415039, abs_tol=1e-12)
    assert math.isclose(s.mixed_market_down, 0.0, abs_tol=1e-12)


def test_all_non_negative():
    s = realized_semibetas(ASSET, MARKET)
    assert s.concordant_positive >= 0
    assert s.concordant_negative >= 0
    assert s.mixed_market_up >= 0
    assert s.mixed_market_down >= 0


def test_reconstructs_realized_beta():
    s = realized_semibetas(ASSET, MARKET)
    recon = (
        s.concordant_positive
        + s.concordant_negative
        - s.mixed_market_up
        - s.mixed_market_down
    )
    assert math.isclose(recon, realized_beta(ASSET, MARKET), abs_tol=1e-12)


def test_reconstruction_second_series():
    a = [0.03, 0.01, -0.02, -0.05, 0.02, -0.01]
    m = [0.02, -0.01, -0.03, -0.04, 0.01, 0.005]
    s = realized_semibetas(a, m)
    assert math.isclose(s.concordant_positive, 0.256, abs_tol=1e-12)
    assert math.isclose(s.concordant_negative, 0.832, abs_tol=1e-12)
    assert math.isclose(s.mixed_market_up, 0.016, abs_tol=1e-12)
    assert math.isclose(s.mixed_market_down, 0.032, abs_tol=1e-12)
    recon = (
        s.concordant_positive
        + s.concordant_negative
        - s.mixed_market_up
        - s.mixed_market_down
    )
    assert math.isclose(recon, realized_beta(a, m), abs_tol=1e-12)


def test_downside_semibeta():
    assert math.isclose(downside_semibeta(ASSET, MARKET), 1.0657193605683837, abs_tol=1e-12)
    assert math.isclose(
        downside_semibeta(ASSET, MARKET),
        realized_semibetas(ASSET, MARKET).concordant_negative,
        abs_tol=1e-12,
    )


def test_semibeta_asymmetry():
    assert math.isclose(semibeta_asymmetry(ASSET, MARKET), 0.8584961515689757, abs_tol=1e-12)


def test_common_length():
    a = [0.02, -0.03, 0.01]
    m = [0.01, -0.02, 0.015, -0.09]  # extra market entry ignored
    s = realized_semibetas(a, m)
    rv_m = 0.01 * 0.01 + 0.02 * 0.02 + 0.015 * 0.015
    assert math.isclose(s.concordant_positive, (0.02 * 0.01 + 0.01 * 0.015) / rv_m, abs_tol=1e-12)
    assert math.isclose(s.concordant_negative, (0.03 * 0.02) / rv_m, abs_tol=1e-12)


def test_edge_cases():
    z = realized_semibetas([], [])
    assert z.concordant_positive == 0
    assert z.concordant_negative == 0
    assert z.mixed_market_up == 0
    assert z.mixed_market_down == 0
    flat = realized_semibetas([0.01, -0.02], [0.0, 0.0])
    assert flat.concordant_negative == 0
    assert downside_semibeta([0.01], [0.0]) == 0
    assert semibeta_asymmetry([0.01], [0.0]) == 0
