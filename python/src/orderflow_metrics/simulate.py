"""Market-order simulation against a reconstructed order book.

Sweep the book with a market order and see what you'd actually get: the
volume-weighted fill price, slippage vs the starting mid, and any size the book
was too thin to fill. Read-only — the book is not mutated.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from .orderbook import OrderBook
from .types import Side


@dataclass(frozen=True)
class Fill:
    """One level's fill: price and size taken."""

    price: float
    size: float


@dataclass(frozen=True)
class MarketOrderResult:
    """Result of sweeping the book with a market order."""

    filled_size: float
    remaining_size: float
    avg_price: Optional[float]
    notional: float
    slippage_bps: Optional[float]
    fills: List[Fill]


def simulate_market_order(book: OrderBook, side: Side, size: float) -> MarketOrderResult:
    """Simulate a market order.

    A ``buy`` consumes asks from best (lowest) upward; a ``sell`` consumes bids
    from best (highest) downward. Stops when filled or the book runs out
    (``remaining_size`` > 0).
    """
    start_mid = book.mid()
    levels = book.depth("ask" if side == "buy" else "bid", 2 ** 53)

    fills: List[Fill] = []
    remaining = size
    notional = 0.0

    for level in levels:
        if remaining <= 0:
            break
        take = min(remaining, level.size)
        fills.append(Fill(price=level.price, size=take))
        notional += level.price * take
        remaining -= take

    filled = size - remaining
    avg_price = notional / filled if filled > 0 else None

    slippage_bps: Optional[float] = None
    if avg_price is not None and start_mid is not None and start_mid != 0:
        raw = (avg_price - start_mid) if side == "buy" else (start_mid - avg_price)
        slippage_bps = (raw / start_mid) * 10_000

    return MarketOrderResult(
        filled_size=filled,
        remaining_size=remaining,
        avg_price=avg_price,
        notional=notional,
        slippage_bps=slippage_bps,
        fills=fills,
    )
