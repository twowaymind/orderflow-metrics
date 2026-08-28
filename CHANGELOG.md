# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).
This project follows [Semantic Versioning](https://semver.org/); pre-1.0 the
public API may still change between minor versions.

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
