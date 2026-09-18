import math

from orderflow_metrics import (
    kupiec_pof,
    christoffersen_independence,
    christoffersen_conditional_coverage,
)

B = [0] * 250
for i in [10, 11, 12, 40, 77, 78, 110, 140, 141, 142, 143, 180, 181, 200, 220, 221, 240, 249]:
    B[i] = 1


def test_kupiec_vs_scipy():
    r = kupiec_pof(B, 0.05)
    assert r.exceptions == 18
    assert r.observations == 250
    assert math.isclose(r.statistic, 2.255515250073676, abs_tol=1e-9)
    assert math.isclose(r.p_value, 0.13313913, abs_tol=1e-4)
    assert r.p_value > 0.05


def test_independence_vs_scipy():
    r = christoffersen_independence(B)
    assert math.isclose(r.statistic, 23.287349213116983, abs_tol=1e-9)
    assert r.p_value < 1e-4


def test_conditional_coverage_vs_scipy():
    r = christoffersen_conditional_coverage(B, 0.05)
    assert math.isclose(r.statistic, 25.54286446319066, abs_tol=1e-9)
    assert math.isclose(r.p_value, 2.840779045547318e-6, abs_tol=1e-12)
    assert r.p_value < 0.01


def test_clean_model_passes():
    b = [0] * 100
    for i in [9, 29, 49, 69, 89]:
        b[i] = 1
    assert kupiec_pof(b, 0.05).p_value > 0.1
    assert christoffersen_independence(b).p_value > 0.1
    assert christoffersen_conditional_coverage(b, 0.05).p_value > 0.1


def test_too_many_breaches_rejected():
    b = [0] * 100
    for i in range(0, 20, 2):
        b[i] = 1
    assert kupiec_pof(b, 0.05).p_value < 0.05


def test_no_breaches():
    b = [0] * 50
    pof = kupiec_pof(b, 0.05)
    assert math.isfinite(pof.statistic) and pof.statistic > 0
    assert christoffersen_independence(b).statistic == 0


def test_edge_cases():
    assert math.isnan(kupiec_pof([], 0.05).statistic)
    assert math.isnan(kupiec_pof(B, 0).statistic)
    assert math.isnan(kupiec_pof(B, 1).statistic)
    assert math.isnan(christoffersen_independence([1]).statistic)
    assert kupiec_pof([True, False, False, True], 0.5).exceptions == 2
