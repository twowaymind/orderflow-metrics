/**
 * Pástor-Stambaugh liquidity — the return-reversal measure of liquidity
 * (Pástor & Stambaugh 2003).
 *
 * Illiquidity leaves a fingerprint in returns: when a trade pushes the price, part
 * of that move is temporary and reverses the next period. The more illiquid the
 * asset, the larger the order-flow-induced move and the stronger the reversal.
 * Pástor & Stambaugh (2003), "Liquidity Risk and Expected Stock Returns" (Journal of
 * Political Economy 111(3), 642–685), turn that into a regression: tomorrow's excess
 * return on today's return and today's *signed volume* —
 *
 *   rᵉₜ₊₁ = θ + φ·rₜ + γ·sign(rᵉₜ)·vₜ + εₜ₊₁
 *
 * where rᵉ is the excess return, r the raw return, and v the dollar volume. The
 * coefficient γ is the liquidity measure. A more negative γ means a given signed
 * volume is followed by a stronger reversal — i.e. less liquidity; γ near zero means
 * order flow moves the price and it *stays*, the mark of a deep, liquid market. It is
 * the daily-frequency building block from which Pástor & Stambaugh construct their
 * traded liquidity factor.
 *
 * The ordinary-least-squares fit uses a dependency-free Gaussian-elimination solver —
 * no linear-algebra library. Pass aligned daily series (returns, excess returns, and
 * volume), typically one month's worth per estimate.
 */

/** Fitted Pástor-Stambaugh regression: the liquidity γ plus the other coefficients. */
export interface PSLiquidity {
  /** γ — the liquidity measure; more negative = less liquid (stronger reversal). */
  gamma: number;
  /** φ — the autoregressive coefficient on the raw return. */
  phi: number;
  /** θ — the regression intercept. */
  intercept: number;
}

const sign = (x: number): number => (x > 0 ? 1 : x < 0 ? -1 : 0);

/** Solve A·x = b by Gaussian elimination with partial pivoting; null if singular. */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    if (Math.abs(m[piv][c]) < 1e-15) return null;
    [m[c], m[piv]] = [m[piv], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/**
 * Pástor-Stambaugh liquidity measure γ (2003). Regresses next-period excess return
 * on the current raw return and the current signed volume `sign(rᵉₜ)·vₜ` by ordinary
 * least squares, and returns the fitted `{ gamma, phi, intercept }`. `gamma` is the
 * liquidity measure — more negative means a stronger post-trade reversal, i.e. lower
 * liquidity. The three series are paired by index (align to the same daily grid) and
 * must be the same length; the regression uses observations `t → t+1`. Returns all
 * `NaN` with fewer than four usable pairs or a singular design.
 */
export function pastorStambaughGamma(
  returns: readonly number[],
  excessReturns: readonly number[],
  volumes: readonly number[],
): PSLiquidity {
  const n = Math.min(returns.length, excessReturns.length, volumes.length);
  const nan: PSLiquidity = { gamma: NaN, phi: NaN, intercept: NaN };
  // rows are pairs t → t+1, so we need n-1 rows; require ≥ 4 for a real regression
  if (n - 1 < 4) return nan;

  const X: number[][] = [];
  const y: number[] = [];
  for (let t = 0; t < n - 1; t++) {
    X.push([1, returns[t], sign(excessReturns[t]) * volumes[t]]);
    y.push(excessReturns[t + 1]);
  }

  // normal equations XᵀX β = Xᵀy
  const p = 3;
  const xtx: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const xty: number[] = new Array(p).fill(0);
  for (let r = 0; r < X.length; r++) {
    for (let i = 0; i < p; i++) {
      xty[i] += X[r][i] * y[r];
      for (let j = 0; j < p; j++) xtx[i][j] += X[r][i] * X[r][j];
    }
  }
  const beta = solve(xtx, xty);
  if (beta === null) return nan;
  return { intercept: beta[0], phi: beta[1], gamma: beta[2] };
}
