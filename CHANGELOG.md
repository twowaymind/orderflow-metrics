# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).

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
