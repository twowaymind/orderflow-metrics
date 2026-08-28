"""orderflow-metrics — dependency-free market-microstructure metrics in Python.

OFI, VPIN, information-driven bars, transaction-cost / price-impact metrics,
trade-sign classification, limit-order-book reconstruction, and execution
scheduling. Python port of the TypeScript library of the same name.
"""
from __future__ import annotations

from .bars import Bar, dollar_bars, tick_bars, volume_bars
from .classify import PriceVsMid, lee_ready, tick_rule
from .efficiency import autocorrelation, variance_ratio
from .execution import (
    FlowObservation,
    effective_half_spread,
    effective_spread,
    kyle_lambda,
    price_impact,
    realized_spread,
    roll_spread,
)
from .fairvalue import mid, relative_spread_bps, weighted_mid
from .imbalance import depth_imbalance, trade_imbalance
from .impact import (
    ImpactCost,
    MarkoutObservation,
    almgren_chriss_cost,
    average_markout,
    linear_permanent_impact,
    linear_temporary_impact,
    markout,
    square_root_impact,
)
from .liquidity import ReturnVolume, amihud_illiquidity
from .shortfall import ShortfallResult, arrival_slippage_bps, implementation_shortfall
from .spreadest import Ohlc, abdi_ranaldo, corwin_schultz
from .rangevol import (
    Candle,
    garman_klass_volatility,
    parkinson_volatility,
    rogers_satchell_volatility,
    yang_zhang_volatility,
)
from .hurst import hurst_exponent
from .moments import realized_kurtosis, realized_skewness
from .jumps import bipower_variation, jump_variation, relative_jump_variation
from .semivar import (
    Semivariance,
    downside_variance_ratio,
    realized_semivariance,
    signed_jump_variation,
)
from .entropy import normalized_entropy, shannon_entropy, sign_entropy
from .online import Ewma, EwmaVariance, RollingWindow, Welford
from .covariance import realized_beta, realized_correlation, realized_covariance
from .robustvol import med_rv, min_rv, realized_quarticity
from .noise import noise_variance, sparse_realized_variance, volatility_signature
from .tsrv import two_scale_realized_variance, two_scale_realized_volatility
from .ofi import ofi, ofi_contribution, ofi_series
from .orderbook import BookSide, Level, OrderBook
from .scheduling import pov, twap
from .simulate import Fill, MarketOrderResult, simulate_market_order
from .types import L1Quote, Side, Trade
from .volatility import (
    annualized_volatility,
    realized_variance,
    realized_volatility,
)
from .vpin import (
    VolumeBucket,
    bucket_by_volume,
    bvc_buy_fraction,
    standard_normal_cdf,
    vpin,
)

__version__ = "0.15.0"

__all__ = [
    # types
    "L1Quote",
    "Trade",
    "Side",
    # ofi
    "ofi",
    "ofi_series",
    "ofi_contribution",
    # imbalance
    "depth_imbalance",
    "trade_imbalance",
    # vpin
    "vpin",
    "bucket_by_volume",
    "bvc_buy_fraction",
    "standard_normal_cdf",
    "VolumeBucket",
    # execution
    "effective_spread",
    "effective_half_spread",
    "realized_spread",
    "price_impact",
    "kyle_lambda",
    "roll_spread",
    "FlowObservation",
    # fairvalue
    "mid",
    "weighted_mid",
    "relative_spread_bps",
    # classify
    "tick_rule",
    "lee_ready",
    "PriceVsMid",
    # liquidity
    "amihud_illiquidity",
    "ReturnVolume",
    # volatility
    "realized_variance",
    "realized_volatility",
    "annualized_volatility",
    # efficiency
    "autocorrelation",
    "variance_ratio",
    # orderbook
    "OrderBook",
    "Level",
    "BookSide",
    # simulate
    "simulate_market_order",
    "Fill",
    "MarketOrderResult",
    # scheduling
    "twap",
    "pov",
    # bars
    "tick_bars",
    "volume_bars",
    "dollar_bars",
    "Bar",
    # impact
    "square_root_impact",
    "linear_permanent_impact",
    "linear_temporary_impact",
    "almgren_chriss_cost",
    "markout",
    "average_markout",
    "ImpactCost",
    "MarkoutObservation",
    # shortfall
    "implementation_shortfall",
    "arrival_slippage_bps",
    "ShortfallResult",
    # spread estimators
    "corwin_schultz",
    "abdi_ranaldo",
    "Ohlc",
    # range-based volatility
    "parkinson_volatility",
    "garman_klass_volatility",
    "rogers_satchell_volatility",
    "yang_zhang_volatility",
    "Candle",
    # hurst
    "hurst_exponent",
    # realized moments
    "realized_skewness",
    "realized_kurtosis",
    # jumps
    "bipower_variation",
    "jump_variation",
    "relative_jump_variation",
    # realized semivariance
    "realized_semivariance",
    "downside_variance_ratio",
    "signed_jump_variation",
    "Semivariance",
    # order-flow entropy
    "shannon_entropy",
    "normalized_entropy",
    "sign_entropy",
    # online / streaming estimators
    "Welford",
    "Ewma",
    "EwmaVariance",
    "RollingWindow",
    # realized covariance
    "realized_covariance",
    "realized_correlation",
    "realized_beta",
    # jump-robust realized variance
    "min_rv",
    "med_rv",
    "realized_quarticity",
    # microstructure-noise-aware variance
    "noise_variance",
    "sparse_realized_variance",
    "volatility_signature",
    # two-scale realized variance
    "two_scale_realized_variance",
    "two_scale_realized_volatility",
    "__version__",
]
