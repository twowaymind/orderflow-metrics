# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).
This project follows [Semantic Versioning](https://semver.org/); pre-1.0 the
public API may still change between minor versions.

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
