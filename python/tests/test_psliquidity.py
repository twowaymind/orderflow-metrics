import math

from orderflow_metrics import pastor_stambaugh_gamma

R = [
    0.012, -0.008, 0.005, -0.02, 0.015, 0.004, -0.011, 0.02, -0.006, 0.009, 0.001,
    -0.014, 0.017, -0.003, 0.006, 0.011, -0.019, 0.007, 0.002, -0.01, 0.013, -0.004,
]
RE = [
    0.01, -0.01, 0.004, -0.022, 0.013, 0.003, -0.013, 0.018, -0.008, 0.007, 0.0,
    -0.016, 0.015, -0.005, 0.004, 0.009, -0.021, 0.006, 0.001, -0.012, 0.011, -0.006,
]
V = [
    1.2, 0.9, 1.5, 2.1, 1.1, 0.8, 1.7, 1.3, 0.95, 1.05, 1.4, 2.0, 1.15, 0.85, 1.6,
    1.25, 2.2, 1.0, 0.9, 1.8, 1.35, 1.1,
]


def test_reference():
    ps = pastor_stambaugh_gamma(R, RE, V)
    assert math.isclose(ps.gamma, -0.008012986415941436, abs_tol=1e-6)
    assert math.isclose(ps.phi, 0.2678802801880574, abs_tol=1e-6)
    assert math.isclose(ps.intercept, -0.0007943910370823526, abs_tol=1e-6)


def test_recovers_planted_gamma():
    theta, phi, gamma = 0.001, 0.3, -0.02
    r = [0.01, -0.02, 0.015, -0.01, 0.02, -0.005, 0.012, -0.018, 0.008, 0.004]
    re0 = [0.009, -0.021, 0.014, -0.012, 0.019, -0.006, 0.011, -0.02, 0.007, 0.003]
    sgn = lambda x: 1.0 if x > 0 else (-1.0 if x < 0 else 0.0)
    v = [1.1, 0.9, 1.4, 2.0, 1.2, 0.8, 1.6, 1.3, 1.0, 1.5]
    re = [re0[0]]
    for t in range(len(r) - 1):
        re.append(theta + phi * r[t] + gamma * sgn(re0[t]) * v[t])
    ps = pastor_stambaugh_gamma(r, re, v)
    assert math.isclose(ps.gamma, gamma, abs_tol=1e-6)
    assert math.isclose(ps.phi, phi, abs_tol=1e-6)
    assert math.isclose(ps.intercept, theta, abs_tol=1e-6)


def test_negative_gamma():
    assert pastor_stambaugh_gamma(R, RE, V).gamma < 0


def test_common_length():
    a = pastor_stambaugh_gamma(R, RE, V)
    b = pastor_stambaugh_gamma(R + [0.05], RE, V + [9])
    assert math.isclose(a.gamma, b.gamma, abs_tol=1e-12)


def test_sign_zero():
    r = [0.01, 0.0, 0.02, -0.01, 0.015, 0.005, -0.02, 0.01]
    re = [0.009, 0.0, 0.018, -0.012, 0.013, 0.004, -0.021, 0.008]
    v = [1.1, 1.0, 1.4, 2.0, 1.2, 0.8, 1.6, 1.3]
    assert math.isfinite(pastor_stambaugh_gamma(r, re, v).gamma)


def test_edge_cases():
    ps = pastor_stambaugh_gamma([0.01, -0.02, 0.03], [0.01, -0.02, 0.03], [1, 1, 1])
    assert math.isnan(ps.gamma)
    assert math.isnan(ps.phi)
    assert math.isnan(pastor_stambaugh_gamma([], [], []).gamma)
