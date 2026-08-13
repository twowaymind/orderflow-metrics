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

__version__ = "0.3.0"

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
    "__version__",
]
