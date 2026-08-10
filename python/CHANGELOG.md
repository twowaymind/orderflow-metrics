# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).
This project follows [Semantic Versioning](https://semver.org/); pre-1.0 the
public API may still change between minor versions.

## [0.1.0] - 2026-08-10

### Added
- Initial release — a dependency-free Python port of the TypeScript
  `orderflow-metrics` library, with full feature parity:
  - **Order Flow Imbalance** (Cont–Kukanov–Stoikov 2014): `ofi`, `ofi_series`,
    `ofi_contribution`.
  - **Imbalance**: `depth_imbalance`, `trade_imbalance`.
  - **VPIN** (Easley–López de Prado–O'Hara 2012): `vpin`, `bucket_by_volume`,
    `bvc_buy_fraction`, `standard_normal_cdf`.
  - **Execution / TCA**: `effective_spread`, `effective_half_spread`,
    `realized_spread`, `price_impact`, `kyle_lambda`, `roll_spread`.
  - **Fair value**: `mid`, `weighted_mid`, `relative_spread_bps`.
  - **Trade-sign classification**: `tick_rule`, `lee_ready`.
  - **Liquidity**: `amihud_illiquidity`.
  - **Volatility**: `realized_variance`, `realized_volatility`,
    `annualized_volatility`.
  - **Market efficiency**: `autocorrelation`, `variance_ratio`.
  - **Order book**: `OrderBook` reconstruction from incremental level updates.
  - **Market-order simulation**: `simulate_market_order`.
  - **Execution scheduling**: `twap`, `pov`.
  - **Information-driven bars** (López de Prado 2018): `tick_bars`,
    `volume_bars`, `dollar_bars`.
- pytest test suite, PEP 561 typing marker (`py.typed`), zero runtime
  dependencies.
