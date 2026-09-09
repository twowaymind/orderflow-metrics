import math

from orderflow_metrics import symmetric_eigenvalues, absorption_ratio

C = [
    [4, 1, 2],
    [1, 3, 0.5],
    [2, 0.5, 5],
]
D = [
    [1, 0.8, 0.7, 0.6],
    [0.8, 1, 0.5, 0.4],
    [0.7, 0.5, 1, 0.3],
    [0.6, 0.4, 0.3, 1],
]


def test_eigenvalues_reference():
    ev = symmetric_eigenvalues(C)
    assert math.isclose(ev[0], 6.831254430698207, abs_tol=1e-9)
    assert math.isclose(ev[1], 3.0722239520050736, abs_tol=1e-9)
    assert math.isclose(ev[2], 2.096521617296719, abs_tol=1e-9)


def test_eigenvalues_sum_to_trace():
    assert math.isclose(sum(symmetric_eigenvalues(C)), 12.0, abs_tol=1e-9)
    assert math.isclose(sum(symmetric_eigenvalues(D)), 4.0, abs_tol=1e-9)


def test_eigenvalues_descending():
    ev = symmetric_eigenvalues(D)
    assert all(ev[i - 1] >= ev[i] for i in range(1, len(ev)))


def test_diagonal_matrix():
    ev = symmetric_eigenvalues([[5, 0, 0], [0, 2, 0], [0, 0, 9]])
    assert math.isclose(ev[0], 9, abs_tol=1e-12)
    assert math.isclose(ev[1], 5, abs_tol=1e-12)
    assert math.isclose(ev[2], 2, abs_tol=1e-12)


def test_absorption_ratio_reference():
    assert math.isclose(absorption_ratio(C, 1), 0.569271202558184, abs_tol=1e-9)
    assert math.isclose(absorption_ratio(C, 2), 0.8252898652252734, abs_tol=1e-9)
    assert math.isclose(absorption_ratio(C, 3), 1.0, abs_tol=1e-9)
    assert math.isclose(absorption_ratio(D, 1), 0.6718490750193321, abs_tol=1e-9)
    assert math.isclose(absorption_ratio(D, 2), 0.8502498373868795, abs_tol=1e-9)


def test_clamping():
    assert math.isclose(absorption_ratio(C, 0), absorption_ratio(C, 1), abs_tol=1e-12)
    assert math.isclose(absorption_ratio(C, 99), 1.0, abs_tol=1e-9)


def test_default_components():
    # n=3 -> round(0.6)=1, n=4 -> round(0.8)=1
    assert math.isclose(absorption_ratio(C), absorption_ratio(C, 1), abs_tol=1e-12)
    assert math.isclose(absorption_ratio(D), absorption_ratio(D, 1), abs_tol=1e-12)


def test_single_factor_block():
    ones = [[1, 0.99, 0.99], [0.99, 1, 0.99], [0.99, 0.99, 1]]
    assert absorption_ratio(ones, 1) > 0.99


def test_edge_cases():
    assert symmetric_eigenvalues([]) == []
    assert math.isnan(absorption_ratio([]))
    assert math.isclose(symmetric_eigenvalues([[7]])[0], 7, abs_tol=1e-12)
    assert math.isclose(absorption_ratio([[7]], 1), 1.0, abs_tol=1e-12)
    assert math.isnan(absorption_ratio([[0, 0], [0, 0]]))
