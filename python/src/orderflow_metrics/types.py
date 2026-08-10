"""Core input types for order-flow metrics.

Prices and sizes are plain floats; timestamps (if provided) are opaque to this
library — pass whatever epoch unit your feed uses, we never compare across
records.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

try:  # Literal is available on 3.8+
    from typing import Literal

    Side = Literal["buy", "sell"]
except ImportError:  # pragma: no cover
    Side = str  # type: ignore


@dataclass(frozen=True)
class L1Quote:
    """Top-of-book (level-1) snapshot."""

    bid_price: float
    bid_size: float
    ask_price: float
    ask_size: float
    ts: Optional[float] = None


@dataclass(frozen=True)
class Trade:
    """A single executed trade."""

    price: float
    size: float
    side: "Side"
    ts: Optional[float] = None
