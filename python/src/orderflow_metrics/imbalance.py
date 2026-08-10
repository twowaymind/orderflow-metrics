"""Book and trade imbalance metrics.

Both return a value in [-1, 1]: positive = buy-side heavy, negative = sell-side
heavy, 0 = balanced (or empty input).
"""
from __future__ import annotations

from typing import Sequence

from .types import L1Quote, Trade


def depth_imbalance(q: L1Quote) -> float:
    """Top-of-book depth imbalance: (bid_size - ask_size) / (bid_size + ask_size)."""
    denom = q.bid_size + q.ask_size
    return 0.0 if denom == 0 else (q.bid_size - q.ask_size) / denom


def trade_imbalance(trades: Sequence[Trade]) -> float:
    """Trade imbalance: (buy_vol - sell_vol) / (buy_vol + sell_vol)."""
    buy = sum(t.size for t in trades if t.side == "buy")
    sell = sum(t.size for t in trades if t.side == "sell")
    denom = buy + sell
    return 0.0 if denom == 0 else (buy - sell) / denom
