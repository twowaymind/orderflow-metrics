/**
 * Diebold-Mariano test — is one forecast genuinely more accurate than another?
 *
 * Two models forecast the same series; one has a lower average error. Is that a real edge
 * or a lucky sample? Comparing losses by eye, or with a naive t-test, ignores that forecast
 * errors are serially correlated (especially at multi-step horizons), which inflates
 * significance and lets noise masquerade as skill. Diebold &amp; Mariano (1995) test equal
 * predictive accuracy properly: form the loss differential dₜ = g(e₁ₜ) − g(e₂ₜ) between the
 * two models' errors (g = squared or absolute loss), and test whether its mean is zero
 * against a long-run variance that accounts for autocorrelation up to the forecast horizon.
 * Harvey, Leybourne &amp; Newbold (1997) add the small-sample correction that makes the test
 * usable on the short samples real backtests produce, and compare the statistic to a
 * Student-t distribution rather than a normal.
 *
 * A negative statistic means model 1 has the lower loss (is more accurate); a small p-value
 * says the difference is unlikely to be chance. It is the honest way to answer "did my new
 * model actually beat the benchmark?", and the natural significance test on top of the
 * `har` forecasting tooling. The Student-t p-value uses an exact, dependency-free
 * regularized incomplete beta — matching `scipy.stats.t` to ~1e-13, no statistics library.
 */

/** Result of a Diebold-Mariano test of equal predictive accuracy. */
export interface DieboldMarianoResult {
  /** HLN-corrected DM statistic; negative ⇒ the first model has lower loss (more accurate). */
  statistic: number;
  /** p-value against Student-t with n − 1 degrees of freedom (two-sided by default). */
  pValue: number;
  /** Number of paired forecast points compared. */
  n: number;
  /** The forecast horizon h used for the autocorrelation correction. */
  horizon: number;
}

const NAN_RESULT: DieboldMarianoResult = {
  statistic: NaN,
  pValue: NaN,
  n: NaN,
  horizon: NaN,
};

// Lanczos log-Γ (g = 7), accurate to ~1e-15 for z > 0.
const LANCZOS_G = 7;
const LANCZOS_C = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function logGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = LANCZOS_C[0];
  for (let i = 1; i < LANCZOS_C.length; i++) x += LANCZOS_C[i] / (z + i);
  const t = z + LANCZOS_G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Continued-fraction expansion for the regularized incomplete beta (Numerical Recipes). */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const fpmin = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-16) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b), exact and dependency-free. */
function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (bt * betaContinuedFraction(a, b, x)) / a
    : 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b;
}

/**
 * Upper tail of the Student-t distribution, P(T_df > t), for any positive degrees of
 * freedom. Exact and dependency-free via the regularized incomplete beta. A reusable
 * companion to the χ² and normal tails used across the library.
 */
export function studentTSurvival(t: number, df: number): number {
  if (!(df > 0)) return NaN;
  const half = 0.5 * incompleteBeta(df / 2, 0.5, df / (df + t * t)); // = P(T > |t|)
  return t >= 0 ? half : 1 - half;
}

/**
 * Diebold-Mariano test (1995) of equal predictive accuracy between two forecasts, with the
 * Harvey-Leybourne-Newbold (1997) small-sample correction. `errors1` and `errors2` are the
 * two models' forecast errors over the same points (actual − forecast). `horizon` is the
 * forecast horizon h — the loss differential's autocorrelation is accounted for up to lag
 * h − 1 (default 1, one-step). `power` selects the loss: 2 for squared error (default), 1
 * for absolute. `alternative` is `"two-sided"` (default), or a one-sided `"less"` (model 1
 * more accurate) / `"greater"`. Returns the corrected statistic (negative ⇒ model 1 has the
 * lower loss), its p-value against Student-t with n − 1 df, and the sample size. Returns
 * `NaN` for mismatched or too-short series (n ≤ horizon), `horizon < 1`, or a degenerate
 * loss differential with no variance.
 */
export function dieboldMariano(
  errors1: readonly number[],
  errors2: readonly number[],
  options: {
    horizon?: number;
    power?: number;
    alternative?: "two-sided" | "less" | "greater";
  } = {},
): DieboldMarianoResult {
  const h = Math.floor(options.horizon ?? 1);
  const power = options.power ?? 2;
  const alternative = options.alternative ?? "two-sided";
  const n = errors1.length;
  if (n !== errors2.length || h < 1 || n <= h) return { ...NAN_RESULT };

  // loss differential dₜ = |e₁|^power − |e₂|^power
  const d = new Array<number>(n);
  let dbar = 0;
  for (let t = 0; t < n; t++) {
    d[t] = Math.abs(errors1[t]) ** power - Math.abs(errors2[t]) ** power;
    dbar += d[t];
  }
  dbar /= n;

  // autocovariances γ₀..γ_{h−1} (divisor n), long-run variance γ₀ + 2Σγₖ
  const dev = d.map((v) => v - dbar);
  let lrvOverN = 0;
  for (let k = 0; k < h; k++) {
    let g = 0;
    for (let t = k; t < n; t++) g += dev[t] * dev[t - k];
    g /= n;
    lrvOverN += k === 0 ? g : 2 * g;
  }
  lrvOverN /= n;
  if (!(lrvOverN > 0)) return { ...NAN_RESULT };

  // HLN small-sample correction, compared to Student-t(n − 1)
  const correction = Math.sqrt((n + 1 - 2 * h + (h * (h - 1)) / n) / n);
  const statistic = (dbar / Math.sqrt(lrvOverN)) * correction;
  const df = n - 1;

  let pValue: number;
  if (alternative === "two-sided") pValue = 2 * studentTSurvival(Math.abs(statistic), df);
  else if (alternative === "greater") pValue = studentTSurvival(statistic, df);
  else pValue = 1 - studentTSurvival(statistic, df); // "less"

  return { statistic, pValue, n, horizon: h };
}
