import math

from orderflow_metrics import ljung_box, box_pierce, chi_square_survival

# AR(1) series (phi=0.4, n=64) - reference stats/p-values from statsmodels.acorr_ljungbox
AR1 = [
    0.0, 0.2987455375084699, -0.1546396403588296, -0.952447694900806, -0.835649863132045,
    -1.3259065002492805, -0.47021899750227375, 1.152127646553624, -0.03135545992987998,
    -0.6330170837918924, 0.23663521666844128, 0.45154109482743726, 0.28603068692887346,
    -0.8160557699366553, -0.35567413043793566, 0.5530335422831135, -1.1230011303718366,
    -0.9068162131889528, -2.2639492250764253, -2.1951174298155465, -2.719782009717951,
    -1.3230039349618616, -1.7966480554284479, -0.4473948633496777, -0.022206858715645927,
    -0.19581368811621275, -2.5950851860669983, -1.576726970273436, -0.6791917335104464,
    -0.15836770740087097, -1.593482848465742, -1.1151464154202275, -1.4245776442247307,
    -1.3786682971154915, 0.5094313045398821, -0.6037621535159436, -0.2740265663518981,
    0.7747792408424147, -0.27368873640633606, -0.22117744414669405, 0.02199316559080297,
    0.07257904049138314, -1.19602421022114, -0.40226945371144796, 1.1979156402569584,
    -1.067978422025699, 0.43219131921131865, 0.2922305533811087, -0.5245781727547779,
    1.7905852772405115, 1.4784938229809166, -0.6078913729128567, -0.16864032039367927,
    0.5092334555127136, 0.014911256854336141, 0.6888747699369404, 0.2090325878253606,
    0.7508605959644722, 1.7388668300419408, 0.0198844810111235, 0.21109240279405844,
    -0.37887061542079176, -0.024279834942485895, -1.1969064618271343,
]


def test_ljung_box_vs_statsmodels():
    r5 = ljung_box(AR1, 5)
    assert math.isclose(r5.statistic, 29.44703410541104, abs_tol=1e-9)
    assert math.isclose(r5.p_value, 1.894487476786188e-05, abs_tol=1e-12)
    assert r5.degrees_of_freedom == 5

    r10 = ljung_box(AR1, 10)
    assert math.isclose(r10.statistic, 39.600816577561616, abs_tol=1e-9)
    assert math.isclose(r10.p_value, 1.9918226202030487e-05, abs_tol=1e-12)

    r20 = ljung_box(AR1, 20)
    assert math.isclose(r20.statistic, 51.926341744914986, abs_tol=1e-9)
    assert math.isclose(r20.p_value, 0.00011670815747718229, abs_tol=1e-12)


def test_box_pierce_vs_statsmodels():
    r5 = box_pierce(AR1, 5)
    assert math.isclose(r5.statistic, 27.55391271183425, abs_tol=1e-9)
    assert math.isclose(r5.p_value, 4.4485167175334426e-05, abs_tol=1e-12)

    r10 = box_pierce(AR1, 10)
    assert math.isclose(r10.statistic, 36.2013300201597, abs_tol=1e-9)
    assert math.isclose(r10.p_value, 7.772613585065212e-05, abs_tol=1e-12)

    r20 = box_pierce(AR1, 20)
    assert math.isclose(r20.statistic, 44.88334477659736, abs_tol=1e-9)
    assert math.isclose(r20.p_value, 0.0011443712981785488, abs_tol=1e-12)


def test_box_pierce_le_ljung_box():
    for h in (3, 7, 15):
        assert box_pierce(AR1, h).statistic <= ljung_box(AR1, h).statistic + 1e-12


def test_fitted_params_reduces_df():
    raw = ljung_box(AR1, 10)
    resid = ljung_box(AR1, 10, 2)  # e.g. ARMA(1,1) residual
    assert resid.degrees_of_freedom == 8
    assert math.isclose(resid.statistic, raw.statistic, abs_tol=1e-12)
    assert resid.p_value < raw.p_value  # same Q, fewer df => more extreme


def test_white_noise_not_rejected():
    import random

    rng = random.Random(12345)
    wn = [rng.gauss(0.0, 1.0) for _ in range(400)]
    lb = ljung_box(wn, 10)
    bp = box_pierce(wn, 10)
    assert lb.p_value > 0.05
    assert bp.p_value > 0.05


def test_chi_square_survival_vs_scipy():
    assert math.isclose(chi_square_survival(3.5, 5), 0.6233876277495822, abs_tol=1e-12)
    assert math.isclose(chi_square_survival(18.2, 10), 0.0516821935539136, abs_tol=1e-12)
    assert math.isclose(chi_square_survival(25.0, 20), 0.20143110494553594, abs_tol=1e-12)
    assert math.isclose(chi_square_survival(2.0, 1), 0.15729920705028105, abs_tol=1e-12)
    assert math.isclose(chi_square_survival(4.0, 2), 0.1353352832366127, abs_tol=1e-12)
    assert math.isclose(chi_square_survival(50.0, 7), 1.4444852779215402e-08, abs_tol=1e-16)
    assert math.isclose(chi_square_survival(200.0, 20), 1.125347396084281e-31, abs_tol=1e-40)
    assert chi_square_survival(0, 5) == 1.0
    assert chi_square_survival(-1, 5) == 1.0
    assert math.isnan(chi_square_survival(5, 0))


def test_edge_cases():
    assert math.isnan(ljung_box([1, 2, 3], 5).statistic)  # series too short
    assert math.isnan(ljung_box(AR1, 0).statistic)  # lags < 1
    assert math.isnan(ljung_box([7.0] * 20, 5).statistic)  # constant
    assert math.isnan(ljung_box(AR1, 3, 3).statistic)  # df < 1
