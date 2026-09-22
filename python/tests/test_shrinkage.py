import math

from orderflow_metrics import ledoit_wolf_shrinkage

# 24 observations x 4 assets - reference from sklearn.covariance.ledoit_wolf
X = [
    [-0.014862, -0.003251, -0.055895, 0.009241],
    [0.013766, 0.00324, -0.00343, 0.002429],
    [-0.004353, -0.00412, 0.016677, 0.005644],
    [-0.000283, -0.000603, 0.004255, -0.004303],
    [-0.007075, 0.003945, -0.002867, -0.009154],
    [-0.008546, 0.004584, -0.005627, 0.00142],
    [0.013837, 0.028672, -0.001532, 0.018974],
    [-0.0236, -0.00797, -0.040598, 0.009618],
    [0.017678, 0.022158, -0.008578, 0.010432],
    [-0.00938, -0.00916, 0.007261, 0.007117],
    [0.005088, -0.004696, -0.023225, 0.009318],
    [0.012879, 0.014982, 0.069618, 0.001905],
    [0.052189, 0.061846, 0.086638, 0.02643],
    [-0.012276, 0.006959, -0.01096, 0.003245],
    [-0.004809, 0.001792, 0.034867, -0.000301],
    [-0.018708, -0.019904, -0.04003, -0.018098],
    [-0.017259, 0.008303, -0.015476, 0.006259],
    [-0.023338, -0.007916, -0.055935, -0.008959],
    [0.046091, 0.014295, 0.048032, 0.007031],
    [-0.00206, -0.008202, 0.030457, -0.000695],
    [0.031548, 0.006118, 0.01198, 0.003723],
    [0.008463, -0.010447, -0.020974, -0.006556],
    [-0.016074, 0.001445, 0.013257, -0.012604],
    [-0.035105, -0.030626, -0.019771, 0.011585],
]

COV_REF = [
    [0.0004610095032172498, 0.00020846012350429568, 0.00037379282370970533, 6.597910580801435e-05],
    [0.00020846012350429568, 0.000356305914148069, 0.0002821600761063521, 7.186759052043373e-05],
    [0.00037379282370970533, 0.0002821600761063521, 0.0010304890600397222, 7.679023153378475e-05],
    [6.597910580801435e-05, 7.186759052043373e-05, 7.679023153378475e-05, 0.00019715469367482033],
]


def test_ledoit_wolf_vs_sklearn():
    r = ledoit_wolf_shrinkage(X)
    assert math.isclose(r.shrinkage, 0.2469621254921902, abs_tol=1e-10)
    assert math.isclose(r.mu, 0.0005112397927699654, abs_tol=1e-12)
    for i in range(4):
        for j in range(4):
            assert math.isclose(r.covariance[i][j], COV_REF[i][j], abs_tol=1e-12)


def test_symmetric_and_valid_intensity():
    r = ledoit_wolf_shrinkage(X)
    for i in range(4):
        for j in range(4):
            assert math.isclose(r.covariance[i][j], r.covariance[j][i], abs_tol=1e-15)
    assert 0.0 < r.shrinkage < 1.0


def test_off_diagonals_damped():
    r = ledoit_wolf_shrinkage(X)
    n, p = len(X), 4
    means = [sum(row[i] for row in X) / n for i in range(p)]
    def S(i, j):
        return sum((row[i] - means[i]) * (row[j] - means[j]) for row in X) / n
    for i in range(p):
        for j in range(p):
            if i != j:
                assert abs(r.covariance[i][j]) < abs(S(i, j))


def test_more_assets_than_obs_shrinks_hard():
    wide = [row + [row[0] - row[1]] for row in X[:4]]  # 4 x 5, p > n
    r = ledoit_wolf_shrinkage(wide)
    assert r.shrinkage > ledoit_wolf_shrinkage(X).shrinkage
    assert r.shrinkage > 0.4


def test_single_asset():
    one = [[row[0]] for row in X]
    r = ledoit_wolf_shrinkage(one)
    assert r.shrinkage == 0.0
    col = [row[0] for row in X]
    mean = sum(col) / len(col)
    var_mle = sum((v - mean) ** 2 for v in col) / len(col)
    assert math.isclose(r.covariance[0][0], var_mle, abs_tol=1e-15)


def test_assume_centered():
    r1 = ledoit_wolf_shrinkage(X, assume_centered=False)
    r2 = ledoit_wolf_shrinkage(X, assume_centered=True)
    assert abs(r1.shrinkage - r2.shrinkage) > 1e-6


def test_edge_cases():
    assert math.isnan(ledoit_wolf_shrinkage([]).shrinkage)
    assert math.isnan(ledoit_wolf_shrinkage([[1, 2], [3]]).shrinkage)
    assert ledoit_wolf_shrinkage([]).covariance == []
