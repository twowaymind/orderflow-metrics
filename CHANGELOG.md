# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).
This project follows [Semantic Versioning](https://semver.org/); pre-1.0 the
public API may still change between minor versions.

## [0.52.0] - 2026-09-23

### Added
- Diebold-Mariano test of equal predictive accuracy (`dmtest`) — the significance test on
  top of the `har` forecasting tooling. `dieboldMariano(errors1, errors2)` compares two
  models' forecast errors over the same points via the loss differential
  dₜ = g(e₁ₜ) − g(e₂ₜ) (squared or absolute loss), testing its mean against a long-run
  variance that accounts for forecast-error autocorrelation up to the horizon (Diebold &
  Mariano 1995), with the Harvey-Leybourne-Newbold (1997) small-sample correction and a
  Student-t reference. A negative statistic means the first model has the lower loss; a
  small p-value says the edge is unlikely to be chance. `horizon`, `power` (2 = squared,
  1 = absolute), and one-/two-sided `alternative` are configurable. Ships a reusable
  general-df `studentTSurvival` — the Student-t upper tail via an exact, dependency-free
  regularized incomplete beta (Lanczos log-Γ + continued fraction), joining
  `chiSquareSurvival` and `standardNormalCdf` as a distribution primitive. Verified against
  `scipy.stats.t` to ~1e-13 and the DM statistic against a numpy reference. (Python: 0.40.0.)

## [0.51.0] - 2026-09-22

### Added
- Ledoit-Wolf shrinkage covariance (`shrinkage`) — a well-conditioned covariance matrix
  fit for optimization. The sample covariance is ill-conditioned or singular when the
  number of assets approaches or exceeds the number of observations, and any optimizer
  that inverts it turns that noise into unstable weights. `ledoitWolfShrinkage(observations)`
  pulls the sample covariance S toward a scaled-identity target μ·I (μ = trace(S)/p) by a
  data-chosen intensity δ ∈ [0, 1] that minimizes expected error: Σ̂ = (1 − δ)·S + δ·μ·I,
  always positive-definite and invertible, with off-diagonal noise damped (Ledoit & Wolf,
  2004, *A well-conditioned estimator for large-dimensional covariance matrices*). Returns
  the shrunk matrix, the intensity δ, and the target scale μ; `assumeCentered` skips mean
  subtraction. Maximum-likelihood (divide-by-n) convention, dependency-free — matches
  `sklearn.covariance.ledoit_wolf` to ~1e-15 on both the matrix and the intensity. The
  standard conditioning step ahead of the `covariance` / mean-variance / Kelly tooling.
  (Python: 0.39.0.)

## [0.50.0] - 2026-09-21

### Added
- Augmented Dickey-Fuller unit-root test (`adf`) — the stationarity test underneath every
  mean-reversion / pairs-trading claim. `augmentedDickeyFuller(series, lags, regression)`
  regresses Δyₜ on the lagged level yₜ₋₁, `lags` lagged differences (the Said-Dickey 1984
  augmentation), and the deterministic terms, then returns the t-statistic on the lagged
  level — small (below the Dickey-Fuller critical value ⇒ small p-value) rejects the unit
  root, i.e. the series is stationary / mean-reverting. `regression` is `"c"` (constant,
  the default, for a spread reverting to a level) or `"ct"` (constant + linear trend).
  The result carries the statistic, the MacKinnon (1994/2010) p-value, the augmentation
  order, the regression observation count, and the 1%/5%/10% critical values. Fully
  dependency-free — OLS via a hand-rolled Gauss-Jordan inverse, the p-value's normal CDF
  reusing `standardNormalCdf`, and MacKinnon's response-surface coefficients embedded.
  Verified against `statsmodels.tsa.stattools.adfuller` to ~1e-13 on the statistic and
  exactly on the critical values. Completes the market-efficiency / time-series cluster
  (`varianceRatioTest`, `ljungBox`, `meanReversionSpeed`) with the decisive stationarity
  test. (Python: 0.38.0.)

## [0.49.0] - 2026-09-19

### Added
- Portmanteau autocorrelation tests (`ljungbox`) — a formal white-noise test over the
  *whole* autocorrelation function up to lag h, lifting `efficiency`'s single-lag
  `autocorrelation` to a joint hypothesis test. `ljungBox` (Ljung & Box 1978) is the
  standard portmanteau statistic Q = n(n+2)·Σ ρ̂ₖ²/(n−k), χ²(h); `boxPierce` (Box &
  Pierce 1970) is the original unweighted Q = n·Σ ρ̂ₖ², χ²(h). A small p-value rejects
  "the series is serially uncorrelated": run on returns it flags predictability
  (momentum / mean-reversion), on squared returns volatility clustering, on model
  residuals misspecification. Optional `fittedParams` reduces the degrees of freedom to
  h − (p + q) for ARMA(p, q) residuals, as Ljung-Box prescribes. Ships a general-df
  `chiSquareSurvival` — an exact, dependency-free regularized incomplete gamma (Lanczos
  log-Γ + series/continued-fraction split) valid for *any* degrees of freedom, a reusable
  upgrade over `vartest`'s df∈{1,2} closed forms. Verified against
  `statsmodels.stats.diagnostic.acorr_ljungbox` and `scipy.stats.chi2.sf` to ~1e-9 on the
  statistics and ~1e-15 on the χ² tail. (Python: 0.37.0.)

## [0.48.0] - 2026-09-18

### Added
- VaR backtesting (`vartest`) — validating the `valueatrisk` forecasts against what
  actually happened, the Basel backtesting checks. `kupiecPOF` (Kupiec 1995) tests
  *unconditional coverage* — the right *number* of breaches, χ²(1). `christoffersenIndependence`
  (Christoffersen 1998) tests whether breaches *cluster* in time, χ²(1). `christoffersenConditionalCoverage`
  is the joint test of coverage and independence together, χ²(2) — a model can pass the
  count and still fail here by breaching in bursts. Each takes a 0/1 (or boolean) breach
  series and returns the likelihood-ratio statistic and p-value; the χ² p-values use exact
  closed forms (χ²₁ via the dependency-free `standardNormalCdf`, χ²₂ = e^(−x/2)), no
  statistics library. Verified against `scipy.stats.chi2` to ~1e-9 on the statistics.
  Closes the loop on the tail-risk tooling: measure VaR, then prove it. (Python: 0.36.0.)

## [0.47.0] - 2026-09-17

### Added
- Lo-MacKinlay variance-ratio test (`vrtest`) — the formal random-walk / market-
  efficiency test around the descriptive `varianceRatio`. Lo & MacKinlay (1988) ask
  whether `VR(q) = σ²(q)/(q·σ²(1))` is far enough from 1 to reject a random walk (VR > 1
  = momentum, VR < 1 = mean reversion). `varianceRatioTest(returns, q)` returns the ratio
  plus the homoskedastic (`zStatistic`) and heteroskedasticity-robust (`robustZStatistic`)
  z-statistics — the robust form is the one to trust on real, volatility-clustering
  returns — each with a two-sided p-value. Uses the overlapping, bias-corrected estimator
  (verified against the reference implementation to ~1e-9 on the z-statistics) and the
  dependency-free `standardNormalCdf` from `vpin` for the p-values. Turns the efficiency
  module's descriptive ratio into a proper hypothesis test. (Python: 0.35.0.)

## [0.46.0] - 2026-09-16

### Added
- Kelly criterion / growth-optimal position sizing (`kelly`) — how *much* to bet, the
  complement to the risk and performance metrics that judge *whether* to. `kellyFraction`
  is the classic discrete stake `f* = p − (1 − p)/b` for a bet that wins with probability
  `p` at odds `b` (negative = no edge, skip). `kellyLeverage` is the continuous
  mean-variance form `μ / σ²`. `growthOptimalLeverage` finds the *exact* empirical
  optimum — the leverage λ that maximizes realized mean log-growth
  `(1/N)·Σ log(1 + λ·rₜ)` — with a dependency-free golden-section search over the range
  where every `1 + λ·rₜ` stays positive, making no Gaussian assumption. A fresh theme
  (money management) alongside the risk (`valueatrisk`) and performance
  (`performance`, `benchmark`) tooling. Dependency-free. (Python: 0.34.0.)

## [0.45.0] - 2026-09-15

### Added
- Benchmark-relative performance (`benchmark`) — judging a return stream against a
  benchmark rather than on its own: `jensensAlpha` (Jensen 1968, the CAPM regression
  intercept `mean(r − rf) − β·mean(m − rf)` — return the benchmark can't explain),
  `treynorRatio` (Treynor 1965, mean excess return per unit of *systematic* risk β),
  `trackingError` (sample stdev of the active return `rₜ − mₜ`), and `informationRatio`
  (Grinold & Kahn, mean active return over tracking error — active reward per unit of
  active risk). β is the OLS slope `Σ(rₜ−r̄)(mₜ−m̄)/Σ(mₜ−m̄)²`; series are paired to
  their common length. Complements the standalone `performance` ratios with
  benchmark-relative alpha and skill measurement. Dependency-free. (Python: 0.33.0.)

## [0.44.0] - 2026-09-14

### Added
- Risk-adjusted performance ratios (`performance`) — the headline numbers that put
  return and risk on the same footing: `sharpeRatio` (Sharpe 1966/1994, mean excess
  return over total volatility, sample stdev), `annualizedSharpeRatio` (scaled by
  `√periodsPerYear`), `sortinoRatio` (Sortino & Price 1994, excess return over the
  downside deviation / target semideviation only — upside volatility isn't penalized),
  `maxDrawdown` (largest peak-to-trough decline of the compounded equity curve, a
  positive fraction), and `calmarRatio` (geometric annualized return over maximum
  drawdown). Conventions are documented for reproducibility. Complements the
  `valueatrisk` tail-risk tooling with reward-to-risk measurement. Dependency-free.
  (Python: 0.32.0.)

## [0.43.0] - 2026-09-13

### Added
- Value-at-Risk & Expected Shortfall (`valueatrisk`) — the standard tail-risk
  measures, including the Cornish-Fisher modified VaR that corrects the Gaussian
  figure for skewness and fat tails. VaR at confidence `c` is the loss not exceeded
  with probability `c`; Expected Shortfall (Conditional VaR) is the average loss in
  that tail — the coherent measure the Basel framework adopted. Three lenses:
  `valueAtRisk` / `expectedShortfall` (historical/empirical, no distributional
  assumption), `gaussianValueAtRisk` (parametric normal `−(μ + z·σ)`), and
  `cornishFisherValueAtRisk` (the normal quantile expanded with sample skewness and
  excess kurtosis, `z_cf = z + (z²−1)/6·S + (z³−3z)/24·K − (2z³−5z)/36·S²`; Favre &
  Galéano 2002) — which lifts VaR above the Gaussian number for a left-skewed,
  fat-tailed series. All returned as positive loss magnitudes. Ships a
  dependency-free inverse normal CDF `inverseNormalCdf` (Acklam, ~1e-9 accuracy) — a
  reusable companion to the `standardNormalCdf` in `vpin`. First VaR/ES tooling in the
  library; no statistics dependency. (Python: 0.31.0.)

## [0.42.0] - 2026-09-12

### Added
- Lee-Mykland nonparametric jump test (`leemykland`) — detecting *individual*
  jumps and their timing, from Lee & Mykland 2008 (*Jumps in Financial Markets: A
  New Nonparametric Test and Jump Dynamics*, Review of Financial Studies 21(6),
  2535–2563). Where bipower variation (`jumps`) measures how much of a sample's
  variance came from jumps, this test flags *which* returns are jumps and *when*.
  For each return it forms the standardized statistic `L(i) = rᵢ / σ̂(tᵢ)`, with
  `σ̂(tᵢ)` a jump-robust bipower estimate of local volatility over the `K` returns
  *before* `i` (the tested return excluded, so a jump cannot inflate its own
  benchmark). Under the continuous-path null the maximum of `|L|` follows a Gumbel
  law, giving an extreme-value critical value `Sₙ·β* + Cₙ` that controls the
  chance of even one false jump across the whole sample. `leeMyklandStatistics(
  returns, opts?)` → the L(i) series; `leeMyklandCriticalValue(numStatistics,
  significance?)` → the threshold; `leeMyklandJumps(returns, opts?)` → the detected
  jumps `{ index, statistic, direction }`. Window `K` defaults to `√n` (Lee &
  Mykland's asymptotic rule); override to match your sampling frequency.
  Dependency-free. Complements the aggregate `jumps` (bipower) split with per-return
  jump timing. (Python: 0.30.0.)

## [0.41.0] - 2026-09-11

### Added
- Pástor-Stambaugh liquidity (`psliquidity`) — the return-reversal measure of
  liquidity from Pástor & Stambaugh 2003 (*Liquidity Risk and Expected Stock
  Returns*, Journal of Political Economy 111(3), 642–685). `pastorStambaughGamma(
  returns, excessReturns, volumes)` fits the regression `rᵉₜ₊₁ = θ + φ·rₜ +
  γ·sign(rᵉₜ)·vₜ` by ordinary least squares and returns `{ gamma, phi, intercept }`.
  `gamma` is the liquidity measure: a stronger reversal of order-flow-induced price
  moves gives a more negative γ, i.e. lower liquidity; γ near zero marks a deep,
  liquid market. The daily building block of the Pástor-Stambaugh traded liquidity
  factor. OLS via a **dependency-free Gaussian-elimination solver** — no
  linear-algebra library. Complements the `amihud` illiquidity and order-book depth
  tooling with a reversal-based liquidity lens. (Python: 0.29.0.)

## [0.40.0] - 2026-09-10

### Added
- HAR-RV realized-volatility forecasting (`har`) — the Heterogeneous
  Autoregressive model of Corsi 2009 (*A Simple Approximate Long-Memory Model of
  Realized Volatility*, Journal of Financial Econometrics 7(2), 174–196), the
  standard benchmark for forecasting realized volatility. `harForecast(rv)` fits
  `RVₜ₊₁ = β₀ + β_d·RV^(d) + β_w·RV^(w) + β_m·RV^(m)` by ordinary least squares over
  the supplied history — daily, weekly (5) and monthly (22) averages of past
  realized variance — and returns the one-step-ahead forecast with the fitted
  coefficients. `harComponents(rv)` exposes the latest daily/weekly/monthly
  aggregates; windows are configurable. The OLS solve uses a **dependency-free
  Gaussian-elimination linear solver** (no linear-algebra library). Adds a
  forecasting layer on top of the realized-variance suite (`volatility`,
  `robustvol`, `kernel`, `tsrv`, `noise`). (Python: 0.28.0.)

## [0.39.0] - 2026-09-09

### Added
- Absorption ratio (`absorption`) — the systemic-risk measure of Kritzman, Li,
  Page & Rigobon 2011 (*Principal Components as a Measure of Systemic Risk*,
  Journal of Portfolio Management 37(4), 112–126). `absorptionRatio(covariance,
  numComponents)` returns the fraction of a covariance matrix's total variance
  captured by its largest eigenvalues — the share of market movement absorbed by
  the top principal components; a rising ratio flags a tightly-coupled, fragile
  market. `numComponents` defaults to a fifth of the assets (the authors'
  convention). `symmetricEigenvalues` exposes the underlying eigenvalues
  (descending). Both run on a **dependency-free cyclic Jacobi eigensolver** for
  real symmetric matrices — no linear-algebra library. Caps the covariance-matrix
  cluster (`covariance`, `semicovariance`, `downsidecov`) with a portfolio-level
  fragility gauge. (Python: 0.27.0.)

## [0.38.0] - 2026-09-08

### Added
- Hayashi-Yoshida non-synchronous covariance (`hayashi`) — realized covariance
  and correlation estimated directly from two price series' own irregular
  timestamps, with no resampling and no Epps-effect bias (Hayashi & Yoshida
  2005, *On covariance estimation of non-synchronously observed diffusion
  processes*, Bernoulli 11(2), 359–379). `hayashiYoshidaCovariance` sums return
  cross-products `ΔXᵢ·ΔYⱼ` over every pair of time-overlapping return intervals
  `(tᵢ₋₁, tᵢ]` (half-open — intervals touching only at an endpoint do not
  overlap); it collapses exactly to `realizedCovariance` on a shared grid.
  `hayashiYoshidaCorrelation` normalizes by each series' own realized variance
  for a synchronization-free correlation (`NaN` for a zero-variance series).
  Inputs are `TimedPrice { time, price }` sorted by ascending time; feed
  log-prices for log-return covariance. The async-trading complement to
  `covariance` — addresses the Epps caveat flagged in the semicovariance
  article. (Python: 0.26.0.)

## [0.37.0] - 2026-09-07

### Added
- Realized semibetas (`semibeta`) — the four-way sign decomposition of market
  beta from Bollerslev, Patton & Quaedvlieg 2022 (*Realized semibetas:
  Disentangling &ldquo;good&rdquo; and &ldquo;bad&rdquo; downside risks*, JFE
  144, 227–246). `realizedSemibetas` returns the four non-negative components —
  `concordantPositive` (β^P), `concordantNegative` (β^N), `mixedMarketUp` (β^M⁺)
  and `mixedMarketDown` (β^M⁻) — that reconstruct `realizedBeta` exactly via
  `β = β^P + β^N − β^M⁺ − β^M⁻`. `downsideSemibeta` exposes β^N (the priced
  &ldquo;both fall together&rdquo; component) and `semibetaAsymmetry` gives
  `β^N − β^P`. Uncentered and additive, conditioning on the signs of *both*
  series — the complement to the demeaned Ang-Chen-Xing `downsideBeta`.
  (Python: 0.25.0.)

## [0.36.0] - 2026-09-07

### Added
- Downside covariance & correlation matrices (`downsidecov`) — lifts the
  joint-downside (both-down) component of `semicovariance` to a full N×N book.
  `downsideCovarianceMatrix` builds the matrix of `Σ min(xᵢ,0)·min(xⱼ,0)` (its
  diagonal is each asset's downside semivariance), `downsideCorrelationMatrix`
  normalizes it, and `averageDownsideCorrelation` collapses the off-diagonal to a
  single &ldquo;how correlated is my book on the way down&rdquo; number — the
  crash-correlation gauge. Answers the multivariate-downside-covariance ask.
  (Python: 0.24.0.)

## [0.35.0] - 2026-09-05

### Added
- Downside & upside beta (`downsidebeta`) — `downsideBeta` and `upsideBeta`
  compute the asset's regression beta conditional on the market falling / rising
  (Ang, Chen & Xing 2006, "Downside Risk"), and `betaAsymmetry` is the gap
  `β⁻ − β⁺` — the extra sensitivity to down markets that carries a risk premium.
  A sign-conditional companion to the unconditional `realizedBeta` and the
  `semicovariance` downside decomposition. (Python: 0.23.0.)

## [0.34.0] - 2026-09-04

### Added
- Adverse-selection & markout profiles (`adverseselection`) — `markoutProfile`
  gives the signed post-fill mid move at a sequence of horizons (the shape of
  toxicity, not a single point), `adverseSelectionScore` normalizes a markout by
  the half-spread (a score above 1 = the fill was toxic beyond what the spread
  paid for), and `averageMarkoutProfile` is the aggregate markout curve across
  many fills. Extends the single-horizon `markout` into the standard TCA
  adverse-selection lens. (Python: 0.22.0.)

## [0.33.0] - 2026-09-03

### Added
- Multi-level OFI (`mlofi`) — deep-book order-flow imbalance. `multiLevelOFI`
  applies the Cont–Kukanov–Stoikov event-flow logic at each of the top `K` price
  levels and returns the per-level OFI vector (Cont, Cucuringu & Zhang 2023,
  "Cross-impact of order flow imbalance in equity markets"); `multiLevelOFISeries`
  gives the per-step vectors for a sequence of
  snapshots; `depthWeightedOFI` collapses the vector to a scalar with geometric
  depth-decay weights. Extends the level-1 `ofi` to the noise-resistant,
  size-aware signal that fragmented books need. (Python: 0.21.0.)

## [0.32.0] - 2026-09-02

### Added
- Mean-reversion metrics (`meanrev`) — `meanReversionSpeed` recovers the
  Ornstein–Uhlenbeck reversion speed `κ` per step (the negated OLS slope of the
  change on the lagged level; `κ > 0` mean-reverting, `κ < 0` trending),
  `halfLife` converts it to the reversion horizon `ln 2 / κ` (`Infinity` when
  the series does not revert), and `zScore` standardizes the latest observation
  against the sample mean — the entry/exit signal. The pairs / stat-arb
  timescale toolkit, operating on a level/spread series and complementing the
  variance-ratio and Hurst regime diagnostics. (Python: 0.20.0.)

## [0.31.0] - 2026-09-01

### Added
- Realized semicovariance (`semicovariance`) — `realizedSemicovariance` splits
  realized covariance by the signs of the two return series into concordant-
  positive (both up), concordant-negative (both down), and mixed (opposite
  signs) components that sum back to `realizedCovariance` (Bollerslev, Li, Patton
  & Quaedvlieg 2020). The negative component is joint downside covariance — the
  crash-correlation / downside-beta half. The cross-asset analogue of realized
  semivariance. (Python: 0.19.0.)

## [0.30.0] - 2026-08-31

### Added
- Execution-quality metrics (`execquality`) — `quotedSpread` / `quotedHalfSpread`
  (the width of the market), `priceImprovement` (how much better than the
  standing quote a fill was, signed by side), and `effectiveToQuotedRatio` (the
  SEC Rule 605 / TCA workhorse: <1 = executed inside the quoted spread, >1 =
  outside). These measure a trade against the quote it faced, complementing the
  effective/realized spread and impact measures in `execution`. (Python: 0.18.0.)

## [0.29.0] - 2026-08-30

### Added
- Realized kernel (`kernel`) — `realizedKernel` and `realizedKernelVolatility`
  (Barndorff-Nielsen, Hansen, Lund & Shephard 2008), the flagship noise-robust
  estimator of integrated variance. It adds Parzen-weighted realized
  autocovariances of the returns to plain RV, cancelling the microstructure-
  noise bias while staying non-negative by construction. `bandwidth` sets the
  number of lags. Also exports the building blocks `realizedAutocovariance`
  (γ_h = Σ rⱼ·rⱼ₋ₕ) and `parzenKernel` (the kernel weight). The efficient
  companion to the two-scale estimator in `tsrv`. Test suite included.
  (Python: 0.17.0.)

## [0.28.0] - 2026-08-29

### Added
- Book-depth liquidity (`bookdepth`) — `depthWithin` (resting size within ±bps
  of mid, split by side), `orderBookSlope` (cumulative size per unit of relative
  price distance — how steeply the book thickens away from mid), and
  `costOfRoundTrip` (the basis-point "liquidity tax" of buying then selling a
  given size, walking both sides of the book). Snapshot statistics of the
  *standing* book, complementing `amihudIlliquidity` (impact over time) and
  `simulateMarketOrder` (a single execution). Operate on plain `Level[]` arrays
  sorted best-first. Test suite included. (Python: 0.16.0.)

## [0.27.0] - 2026-08-28

### Added
- Two-Scale Realized Variance (`tsrv`) — `twoScaleRealizedVariance` and
  `twoScaleRealizedVolatility`, a *consistent*, microstructure-noise-corrected
  estimator of integrated variance (Zhang, Mykland & Aït-Sahalia 2005). It
  combines a slow subsampled RV with the fast all-ticks RV and subtracts the
  noise bias — the estimator-grade sequel to the diagnostics in the `noise`
  module. Test suite included. (Python: 0.15.0.)

## [0.26.0] - 2026-08-27

### Added
- Microstructure-noise-aware realized variance (`noise`) — `noiseVariance`
  (variance of the microstructure noise, ≈ RV_finest / 2n; Zhang, Mykland &
  Aït-Sahalia 2005), `sparseRealizedVariance` (RV on a coarser grid, averaged
  over every offset by subsampling so no data is wasted — `step = 1` reproduces
  plain RV, larger steps suppress noise bias) and `volatilitySignature` (RV as a
  function of sampling step: the classic signature plot whose blow-up at fine
  steps is the fingerprint of microstructure noise). Test suite included.
  (Python: 0.14.0.)

## [0.25.0] - 2026-08-26

### Added
- Jump-robust realized variance (`robustvol`) — `minRV` and `medRV`, integrated
  variance estimators built from the minimum / median of neighbouring absolute
  returns (Andersen, Dobrev & Schaumburg, 2012). Like bipower variation they
  strip discrete jumps out of realized variance, but more robustly — MedRV also
  shrugs off isolated zero returns and outliers. Plus `realizedQuarticity`
  ((n/3)·Σrᵢ⁴, Barndorff-Nielsen & Shephard 2002), the integrated-quarticity
  estimate that sets the standard error of realized variance and standardises
  jump tests. Test suite included. (Python: 0.13.0.)

## [0.24.0] - 2026-08-25

### Changed
- Packaging (no API changes): the npm package now ships **compiled ESM plus
  type declarations** under `dist/` (built with TypeScript's
  `rewriteRelativeImportExtensions`), so it imports cleanly in any Node ≥ 18
  project without a type-stripping flag. `main`/`module`/`types`/`exports` point
  at the compiled output; the TypeScript source under `src/` stays vendorable as
  before. Every metric, signature and result is unchanged (129 TS tests still
  green). (Python: unchanged at 0.12.0.)

### Added
- npm publishing via GitHub Actions on `v*` tags (`npm-publish.yml`), with build
  provenance — the TypeScript counterpart to the existing PyPI Trusted
  Publishing workflow. First npm release of the package.

## [0.23.0] - 2026-08-24

### Added
- Realized covariance (`covariance`) — cross-asset co-movement from two aligned
  return series: `realizedCovariance` (Σ xᵢyᵢ), `realizedCorrelation`
  (Σxy / (√Σx²·√Σy²), in [−1, 1]) and `realizedBeta` (Σa·m / Σm², an asset's
  sensitivity to a market). Model-free, high-frequency analogues of covariance /
  correlation / beta. Test suite included. (Python: 0.12.0.)

## [0.22.0] - 2026-08-22

### Added
- Online / streaming estimators (`online`) — O(1)-per-update, constant-memory
  stateful estimators for live pipelines, numerically stable (Welford / West,
  not the naive Σx² form):
  - `Welford` — running mean & variance over all data (sample and population).
  - `Ewma` — exponentially weighted moving average of a level.
  - `EwmaVariance` — RiskMetrics-style EWMA variance / volatility (λ decay).
  - `RollingWindow` — mean & variance over a fixed trailing window, with O(1)
    add/remove (West 1979).
  Each is validated in tests to equal a batch recomputation at every step.
  (Python: 0.11.0.)

## [0.21.0] - 2026-08-21

### Added
- Order-flow entropy (`entropy`): `shannonEntropy` (H = −Σpᵢ·log₂pᵢ, in bits,
  of a count/probability vector), `normalizedEntropy` (H / log₂k, in [0,1]) and
  `signEntropy` (the up/down balance of a return or signed-flow series, in [0,1]
  bits). A predictability / informativeness measure — persistently low flow
  entropy marks one-sided, potentially informed activity. Test suite included.
  (Python: 0.10.0.)

## [0.20.0] - 2026-08-20

### Added
- Realized semivariance (`semivar`): `realizedSemivariance` (splits realized
  variance into upside RS⁺ = Σrᵢ²·1{rᵢ>0} and downside RS⁻ = Σrᵢ²·1{rᵢ<0}, whose
  sum is RV), `downsideVarianceRatio` (RS⁻ share of RV, in [0,1]) and
  `signedJumpVariation` (RS⁺ − RS⁻, which keeps the *direction* of jump risk) —
  Barndorff-Nielsen, Kinnebrock & Shephard (2010) and Patton & Shephard (2015).
  Test suite included. (Python: 0.9.0.)

## [0.19.0] - 2026-08-19

### Added
- Jump detection via bipower variation (`jumps`): `bipowerVariation`
  ((π/2)·Σ|rᵢ₋₁||rᵢ|, a jump-robust estimate of continuous variance),
  `jumpVariation` (max(RV − BV, 0)) and `relativeJumpVariation` (jump share of
  realized variance, in [0,1]) — Barndorff-Nielsen & Shephard (2004). Test suite
  included. (Python: 0.8.0.)

## [0.18.1] - 2026-08-18

### Changed
- Docs only (no API changes): grouped **metric navigation** (a table of contents
  by metric family) at the top of the README, and runnable, dependency-free
  **quickstart examples** (TypeScript + Python) under `examples/`. Both tour the
  library end to end on deterministic synthetic data and print identical output,
  demonstrating TS/Python parity. (Python: 0.7.1.)

## [0.18.0] - 2026-08-17

### Added
- Realized higher moments (`moments`): `realizedSkewness` and `realizedKurtosis`
  summarise the asymmetry and tail heaviness of an intraday return series
  (Amaya, Christoffersen, Jacobs & Vasquez, 2015), scaled to be comparable
  across sampling frequencies. Test suite included. (Python: 0.7.0.)

## [0.17.0] - 2026-08-14

### Added
- Hurst exponent (`hurst`): `hurstExponent` estimates long-memory from a return
  series via rescaled-range (R/S) analysis — >0.5 persistent/trending, <0.5
  mean-reverting, ~0.5 random walk. A companion to the market-efficiency
  metrics (variance ratio, autocorrelation). Test suite included.
  (Python: 0.6.0.)

## [0.16.0] - 2026-08-14

### Added
- Range-based volatility estimators (`rangevol`): `parkinsonVolatility`
  (Parkinson 1980, high-low), `garmanKlassVolatility` (Garman-Klass 1980, OHLC),
  `rogersSatchellVolatility` (Rogers-Satchell 1991, drift-independent), and
  `yangZhangVolatility` (Yang-Zhang 2000, drift- and jump-robust). Each returns
  per-bar volatility from OHLC candles. Test suite included. (Python: 0.5.0.)

## [0.15.0] - 2026-08-13

### Added
- OHLC bid-ask spread estimators (`spreadest`): `corwinSchultz` (Corwin &
  Schultz, 2012 — the two-day high-low range estimator) and `abdiRanaldo`
  (Abdi & Ranaldo, 2017 — close vs the high-low mid-range). Recover the
  effective proportional spread from daily high/low/close with no tick data;
  negative estimates are floored at 0. Test suite included. (Python: 0.4.0.)

## [0.14.0] - 2026-08-12

### Added
- Implementation shortfall & arrival slippage (`shortfall`):
  `implementationShortfall` (Perold's decomposition into execution cost,
  opportunity cost and fees) and `arrivalSlippageBps` (signed slippage vs the
  arrival price, in basis points). Test suite included.

## [0.13.0] - 2026-08-10

### Added
- Market-impact models and trade markouts (`impact`): `squareRootImpact` (the
  empirical Y·σ·√(Q/V) law), `linearPermanentImpact` and
  `linearTemporaryImpact`, `almgrenChrissCost` (TWAP permanent/temporary cost
  split), and `markout` / `averageMarkout` (post-trade adverse-selection drift,
  signed by trade direction). Test suite included.

## [0.12.0] - 2026-08-10

### Added
- Information-driven bars (López de Prado, 2018): `tickBars`, `volumeBars` and
  `dollarBars` aggregate a raw trade stream into OHLCV bars sampled on activity
  rather than clock time — the natural upstream sampling layer for OFI,
  imbalance, volatility and VPIN. Each `Bar` carries open/high/low/close,
  volume, traded value, VWAP, tick count and signed buy/sell volume. Test
  suite included.

### Fixed
- `varianceRatio` now returns 1 (the documented degenerate value) when
  `q === returns.length`. Previously that case produced a spurious 0 because
  the variance of a single overlapping q-period return is zero.

## [0.11.0] - 2026-08-05

### Added
- Execution scheduling: `twap(totalSize, slices)` (even time-weighted slices,
  exact sum) and `pov(totalSize, intervalVolumes, rate)` (percentage-of-volume
  participation with shortfall handling). Test suite included.

## [0.10.0] - 2026-08-05

### Added
- `simulateMarketOrder(book, side, size)` — sweep an `OrderBook` with a market
  order: volume-weighted fill price, slippage vs mid (bps), unfilled remainder
  and per-level fills. Read-only. Test suite included.

## [0.9.0] - 2026-08-04

### Added
- `OrderBook` — limit order book reconstruction from incremental level
  updates: `bestBid`/`bestAsk`, `mid`, `spread`, `depth(side, n)` and
  top-n `imbalance`. Size-0 updates remove a level. Test suite included.

## [0.8.0] - 2026-08-04

### Added
- Market-efficiency diagnostics: `autocorrelation(returns, lag)` and
  `varianceRatio(returns, q)` (Lo-MacKinlay: <1 mean-reverting, ~1 random
  walk, >1 trending). Test suite included.

## [0.7.0] - 2026-08-02

### Added
- Realized volatility: `realizedVariance` (Σ rᵢ²), `realizedVolatility`
  (√ of it) and `annualizedVolatility` (scaled by periods per year). Test
  suite included.

## [0.6.0] - 2026-08-01

### Added
- `amihudIlliquidity` — Amihud (2002) illiquidity, the average of
  |return| / volume across periods (price move per unit of traded volume).
  Test suite included.

## [0.5.0] - 2026-07-31

### Added
- Trade-sign classification: `tickRule` and `leeReady` (Lee-Ready 1991) infer
  buyer/seller-initiated trades from prints, so OFI / imbalance / VPIN inputs
  can be signed. Test suite included.

## [0.4.0] - 2026-07-30

### Added
- Fair-value helpers: `weightedMid` (imbalance-weighted mid / simple
  micro-price), `mid`, and `relativeSpreadBps` (quoted spread in basis
  points). Test suite included.

## [0.3.0] - 2026-07-29

### Added
- Execution-cost & price-impact metrics: `effectiveSpread`,
  `effectiveHalfSpread`, `realizedSpread`, `priceImpact`, `kyleLambda`
  (price impact per unit signed flow) and `rollSpread` (Roll's 1984
  autocovariance estimator). Test suite included.

## [0.2.0] - 2026-07-28

### Added
- VPIN (Volume-Synchronized Probability of Informed Trading): `vpin`,
  `bucketByVolume`, `bvcBuyFraction`, `standardNormalCdf` — with Bulk Volume
  Classification and equal-volume bucketing.
- Test suite for VPIN, BVC and volume bucketing.

## [0.1.0] - 2026-07-27

### Added
- Initial release.
- Order Flow Imbalance (Cont–Kukanov–Stoikov): `ofi`, `ofiSeries`,
  `ofiContribution`.
- Top-of-book depth imbalance and trade imbalance.
