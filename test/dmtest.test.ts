import { test } from "node:test";
import assert from "node:assert/strict";
import { dieboldMariano, studentTSurvival } from "../src/dmtest.ts";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// forecast errors of two models over the same 40 points (reference from a numpy/scipy DM)
const E1 = [
  0.241766, -0.271732, 0.633114, 0.083171, -0.049544, -0.085795, -0.579921, -0.273557,
  -0.321961, -0.381048, -0.176751, 0.020189, -0.063873, -0.038951, -0.073255, 0.509975,
  -0.149227, 0.178422, 0.707952, -0.040504, -0.043168, -0.57466, 0.464417, -0.007308,
  0.552235, -0.089778, 0.408804, -0.579385, 0.637148, 0.302073, 0.243236, 0.441425,
  0.629664, 0.385326, 0.075799, 0.735734, -0.347088, -0.014038, 0.135072, 0.480158,
];
const E2 = [
  0.405394, -0.767131, 0.2889, 0.960543, 0.149787, -2.627575, -0.615474, -0.728873,
  0.389167, 0.084466, 0.728792, -0.13145, 0.662299, 0.613303, -0.379713, -1.249394,
  -0.049808, -0.819156, 0.495865, -1.033564, -0.260471, -1.3037, 0.609302, -0.500258,
  0.304543, 0.441319, -0.036726, 0.242754, -0.179271, -0.120575, -0.105004, -0.001303,
  1.770749, 0.055161, -0.120635, 0.162561, -1.122268, -1.112377, -0.719745, 0.322362,
];

test("Diebold-Mariano vs reference — squared loss, one-step", () => {
  const r = dieboldMariano(E1, E2);
  close(r.statistic, -2.3711928880853135, 1e-9);
  close(r.pValue, 0.022765787230317462, 1e-11);
  assert.equal(r.n, 40);
  assert.equal(r.horizon, 1);
  // model 1 (E1) has the lower loss and the difference is significant at 5%
  assert.ok(r.statistic < 0 && r.pValue < 0.05);
});

test("Diebold-Mariano — absolute loss (power 1)", () => {
  const r = dieboldMariano(E1, E2, { power: 1 });
  close(r.statistic, -2.8245211507254275, 1e-9);
  close(r.pValue, 0.007423557534847647, 1e-11);
});

test("Diebold-Mariano — multi-step horizon (h = 4)", () => {
  const r = dieboldMariano(E1, E2, { horizon: 4 });
  close(r.statistic, -3.0306506583625725, 1e-9);
  close(r.pValue, 0.004318865943136373, 1e-11);
  assert.equal(r.horizon, 4);
});

test("one-sided alternatives split the two-sided p-value", () => {
  const two = dieboldMariano(E1, E2).pValue;
  const less = dieboldMariano(E1, E2, { alternative: "less" }).pValue; // H1: model 1 better
  const greater = dieboldMariano(E1, E2, { alternative: "greater" }).pValue;
  close(less + greater, 1, 1e-12);
  close(less, two / 2, 1e-12); // statistic is negative, so "less" is the small tail
});

test("identical forecasts ⇒ no difference (degenerate loss differential)", () => {
  const r = dieboldMariano(E1, E1);
  assert.ok(Number.isNaN(r.statistic)); // zero-variance loss differential
});

test("studentTSurvival matches scipy.stats.t across degrees of freedom", () => {
  // two-sided p = 2 * survival(|t|); values checked against scipy.stats.t
  close(2 * studentTSurvival(2.0, 10), 0.07338803477074045, 1e-12);
  close(2 * studentTSurvival(3.6, 8), 0.006982298238034361, 1e-12);
  close(2 * studentTSurvival(0.5, 100), 0.6181735658308998, 1e-11);
  // symmetry: survival(-t) = 1 - survival(t)
  close(studentTSurvival(-1.7, 15), 1 - studentTSurvival(1.7, 15), 1e-14);
  close(studentTSurvival(0, 12), 0.5, 1e-14);
  assert.ok(Number.isNaN(studentTSurvival(1, 0)));
});

test("edge cases return NaN", () => {
  assert.ok(Number.isNaN(dieboldMariano([1, 2], [1, 2, 3]).statistic)); // length mismatch
  assert.ok(Number.isNaN(dieboldMariano([1], [2]).statistic)); // n <= horizon
  assert.ok(Number.isNaN(dieboldMariano(E1, E2, { horizon: 0 }).statistic)); // horizon < 1
});
