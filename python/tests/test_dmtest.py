import math

from orderflow_metrics import diebold_mariano, student_t_survival

E1 = [
    0.241766, -0.271732, 0.633114, 0.083171, -0.049544, -0.085795, -0.579921, -0.273557,
    -0.321961, -0.381048, -0.176751, 0.020189, -0.063873, -0.038951, -0.073255, 0.509975,
    -0.149227, 0.178422, 0.707952, -0.040504, -0.043168, -0.57466, 0.464417, -0.007308,
    0.552235, -0.089778, 0.408804, -0.579385, 0.637148, 0.302073, 0.243236, 0.441425,
    0.629664, 0.385326, 0.075799, 0.735734, -0.347088, -0.014038, 0.135072, 0.480158,
]
E2 = [
    0.405394, -0.767131, 0.2889, 0.960543, 0.149787, -2.627575, -0.615474, -0.728873,
    0.389167, 0.084466, 0.728792, -0.13145, 0.662299, 0.613303, -0.379713, -1.249394,
    -0.049808, -0.819156, 0.495865, -1.033564, -0.260471, -1.3037, 0.609302, -0.500258,
    0.304543, 0.441319, -0.036726, 0.242754, -0.179271, -0.120575, -0.105004, -0.001303,
    1.770749, 0.055161, -0.120635, 0.162561, -1.122268, -1.112377, -0.719745, 0.322362,
]


def test_dm_squared_one_step():
    r = diebold_mariano(E1, E2)
    assert math.isclose(r.statistic, -2.3711928880853135, abs_tol=1e-9)
    assert math.isclose(r.p_value, 0.022765787230317462, abs_tol=1e-11)
    assert r.n == 40 and r.horizon == 1
    assert r.statistic < 0 and r.p_value < 0.05


def test_dm_absolute_loss():
    r = diebold_mariano(E1, E2, power=1)
    assert math.isclose(r.statistic, -2.8245211507254275, abs_tol=1e-9)
    assert math.isclose(r.p_value, 0.007423557534847647, abs_tol=1e-11)


def test_dm_multistep():
    r = diebold_mariano(E1, E2, horizon=4)
    assert math.isclose(r.statistic, -3.0306506583625725, abs_tol=1e-9)
    assert math.isclose(r.p_value, 0.004318865943136373, abs_tol=1e-11)
    assert r.horizon == 4


def test_one_sided_split():
    two = diebold_mariano(E1, E2).p_value
    less = diebold_mariano(E1, E2, alternative="less").p_value
    greater = diebold_mariano(E1, E2, alternative="greater").p_value
    assert math.isclose(less + greater, 1.0, abs_tol=1e-12)
    assert math.isclose(less, two / 2, abs_tol=1e-12)


def test_identical_forecasts():
    assert math.isnan(diebold_mariano(E1, E1).statistic)


def test_student_t_survival_vs_scipy():
    assert math.isclose(2 * student_t_survival(2.0, 10), 0.07338803477074045, abs_tol=1e-12)
    assert math.isclose(2 * student_t_survival(3.6, 8), 0.006982298238034361, abs_tol=1e-12)
    assert math.isclose(2 * student_t_survival(0.5, 100), 0.6181735658308998, abs_tol=1e-11)
    assert math.isclose(student_t_survival(-1.7, 15), 1 - student_t_survival(1.7, 15), abs_tol=1e-14)
    assert math.isclose(student_t_survival(0, 12), 0.5, abs_tol=1e-14)
    assert math.isnan(student_t_survival(1, 0))


def test_edge_cases():
    assert math.isnan(diebold_mariano([1, 2], [1, 2, 3]).statistic)
    assert math.isnan(diebold_mariano([1], [2]).statistic)
    assert math.isnan(diebold_mariano(E1, E2, horizon=0).statistic)
