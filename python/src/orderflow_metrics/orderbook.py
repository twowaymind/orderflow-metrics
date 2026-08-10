"""Limit order book reconstruction from incremental level updates.

Feed it level updates (price + new size per side); it maintains both sides and
answers the usual top-of-book and depth questions. A size of 0 removes the
level. Prices are the level keys, so re-sending a price overwrites it.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

try:
    from typing import Literal

    BookSide = Literal["bid", "ask"]
except ImportError:  # pragma: no cover
    BookSide = str  # type: ignore


@dataclass(frozen=True)
class Level:
    """A single price level: price and resting size."""

    price: float
    size: float


class OrderBook:
    """In-memory limit order book rebuilt from incremental level updates."""

    def __init__(self) -> None:
        self._bids: Dict[float, float] = {}
        self._asks: Dict[float, float] = {}

    def update(self, side: "BookSide", price: float, size: float) -> None:
        """Apply a level update. ``size <= 0`` removes the price level."""
        book = self._bids if side == "bid" else self._asks
        if size <= 0:
            book.pop(price, None)
        else:
            book[price] = size

    def best_bid(self) -> Optional[Level]:
        best: Optional[Level] = None
        for price, size in self._bids.items():
            if best is None or price > best.price:
                best = Level(price, size)
        return best

    def best_ask(self) -> Optional[Level]:
        best: Optional[Level] = None
        for price, size in self._asks.items():
            if best is None or price < best.price:
                best = Level(price, size)
        return best

    def mid(self) -> Optional[float]:
        b = self.best_bid()
        a = self.best_ask()
        return (b.price + a.price) / 2 if b and a else None

    def spread(self) -> Optional[float]:
        b = self.best_bid()
        a = self.best_ask()
        return a.price - b.price if b and a else None

    def depth(self, side: "BookSide", n: int) -> List[Level]:
        """Top ``n`` levels of a side, best price first."""
        book = self._bids if side == "bid" else self._asks
        levels = [Level(price, size) for price, size in book.items()]
        levels.sort(key=lambda level: level.price, reverse=(side == "bid"))
        return levels[:n]

    def imbalance(self, n: int = 1) -> float:
        """Book imbalance over the top ``n`` levels, in [-1, 1]."""
        bid_vol = sum(level.size for level in self.depth("bid", n))
        ask_vol = sum(level.size for level in self.depth("ask", n))
        denom = bid_vol + ask_vol
        return 0.0 if denom == 0 else (bid_vol - ask_vol) / denom
