"""Book-depth liquidity metrics - reading liquidity straight off a limit-order
book snapshot.

Where :func:`amihud_illiquidity` (see ``liquidity``) measures liquidity from
realized price impact over time, these functions measure it from the *shape* of
the resting book at a single instant: how much size is quoted near the touch,
how steeply depth thickens away from mid, and what a round trip would actually
cost. They complement :func:`simulate_market_order` (which walks the book for
one execution): these are summary statistics of the standing book, not a fill
simulation.

Every function takes plain ``Level`` sequences sorted best-first - bids by
descending price, asks by ascending price - exactly as ``OrderBook.depth()``
returns them.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Sequence

from .orderbook import Level


@dataclass(frozen=True)
class DepthWithin:
    """Resting size available within a price band around the mid."""

    bid_depth: float
    ask_depth: float
    total: float


@dataclass(frozen=True)
class RoundTripCost:
    """The cost of buying then selling the same size against the standing book."""

    avg_buy_price: float
    avg_sell_price: float
    round_trip_bps: float
    filled_size: float


def _mid(bids: Sequence[Level], asks: Sequence[Level]) -> Optional[float]:
    if not bids or not asks:
        return None
    return (bids[0].price + asks[0].price) / 2.0


def depth_within(
    bids: Sequence[Level], asks: Sequence[Level], bps: float
) -> DepthWithin:
    """Total resting size within ``±bps`` of the mid price, split by side.

    A snapshot of near-touch liquidity: how much can trade close to the current
    price before walking into deeper, worse-priced levels. The band half-width
    is ``mid * bps / 10_000``, applied symmetrically. Levels must be sorted
    best-first. Returns zeros if either side is empty (no mid) or ``bps <= 0``.
    """
    m = _mid(bids, asks)
    if m is None or bps <= 0:
        return DepthWithin(0.0, 0.0, 0.0)
    band = m * bps / 10_000.0
    lo = m - band
    hi = m + band
    bid_depth = sum(l.size for l in bids if l.price >= lo)
    ask_depth = sum(l.size for l in asks if l.price <= hi)
    return DepthWithin(bid_depth, ask_depth, bid_depth + ask_depth)


def order_book_slope(levels: Sequence[Level], ref_price: float) -> float:
    """Order-book slope: cumulative resting size divided by the relative price
    distance from ``ref_price`` to the outermost supplied level.

        slope = (sum size) / ( |P_last - ref_price| / ref_price )

    It answers "how much size is packed per unit of relative price move" - a
    steeper (larger) slope means depth builds up quickly near the reference
    price, i.e. a thicker, more liquid book. Pass one side's levels (best-first)
    and a reference price (typically the mid). Returns 0 for empty input, a
    non-positive ``ref_price``, or a zero distance (outermost level at the
    reference price).
    """
    if not levels or ref_price <= 0:
        return 0.0
    cum = sum(l.size for l in levels)
    dist = abs(levels[-1].price - ref_price) / ref_price
    if dist == 0:
        return 0.0
    return cum / dist


def _vwap_fill(levels: Sequence[Level], size: float) -> tuple[float, float]:
    remaining = size
    notional = 0.0
    filled = 0.0
    for l in levels:
        if remaining <= 0:
            break
        take = min(remaining, l.size)
        notional += take * l.price
        filled += take
        remaining -= take
    return notional, filled


def cost_of_round_trip(
    bids: Sequence[Level], asks: Sequence[Level], size: float
) -> RoundTripCost:
    """Round-trip liquidity cost: the basis-point gap between the VWAP of buying
    ``size`` from the asks and the VWAP of selling ``size`` into the bids,
    measured against the mid. This is the immediate "liquidity tax" of entering
    and exiting a position of ``size`` - spread plus the price impact of walking
    both sides of the book.

    Levels must be sorted best-first. ``filled_size`` is the smaller of the two
    sides' fills, so a book too thin on one side reports how much actually
    round-tripped. Returns zeros if either side is empty or ``size <= 0``.
    """
    m = _mid(bids, asks)
    zero = RoundTripCost(0.0, 0.0, 0.0, 0.0)
    if m is None or size <= 0:
        return zero
    buy_notional, buy_filled = _vwap_fill(asks, size)
    sell_notional, sell_filled = _vwap_fill(bids, size)
    if buy_filled == 0 or sell_filled == 0:
        return zero
    avg_buy = buy_notional / buy_filled
    avg_sell = sell_notional / sell_filled
    return RoundTripCost(
        avg_buy,
        avg_sell,
        (avg_buy - avg_sell) / m * 10_000.0,
        min(buy_filled, sell_filled),
    )
