"""Information-driven bars.

Sampling a raw trade stream on a fixed *time* grid oversamples quiet periods and
undersamples busy ones, and produces returns that are far from IID. Sampling on
*activity* instead — a bar every N ticks, every N units of volume, or every N
units of traded value — yields bars with much better statistical properties
(Lopez de Prado, *Advances in Financial Machine Learning*, ch. 2). These bars
are the natural upstream sampling layer for the rest of this library: build them
first, then compute OFI, imbalance, volatility, VPIN, ... on the resulting
series.

Trades are never split across bars: the trade that crosses the threshold is
included whole and closes the bar, so ``volume`` / ``dollar`` may slightly
exceed the threshold. A trailing partial bar (below threshold at end of stream)
is dropped, matching ``bucket_by_volume`` in the VPIN module.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, List, Optional, Sequence

from .types import Trade


@dataclass(frozen=True)
class Bar:
    """One OHLCV bar aggregated from a slice of trades."""

    open: float
    high: float
    low: float
    close: float
    volume: float
    dollar: float
    vwap: float
    ticks: int
    buy_volume: float
    sell_volume: float
    start: Optional[float] = None
    end: Optional[float] = None


def _build_bar(trades: Sequence[Trade]) -> Bar:
    first = trades[0]
    last = trades[-1]

    high = first.price
    low = first.price
    volume = 0.0
    dollar = 0.0
    buy_volume = 0.0
    sell_volume = 0.0

    for t in trades:
        if t.price > high:
            high = t.price
        if t.price < low:
            low = t.price
        volume += t.size
        dollar += t.price * t.size
        if t.side == "buy":
            buy_volume += t.size
        else:
            sell_volume += t.size

    return Bar(
        open=first.price,
        high=high,
        low=low,
        close=last.price,
        volume=volume,
        dollar=dollar,
        vwap=(dollar / volume) if volume > 0 else first.price,
        ticks=len(trades),
        buy_volume=buy_volume,
        sell_volume=sell_volume,
        start=first.ts,
        end=last.ts,
    )


def tick_bars(trades: Sequence[Trade], threshold: int) -> List[Bar]:
    """Emit a bar every ``threshold`` trades (tick bars)."""
    step = int(threshold)
    if step < 1:
        return []
    bars: List[Bar] = []
    i = 0
    n = len(trades)
    while i + step <= n:
        bars.append(_build_bar(trades[i : i + step]))
        i += step
    return bars


def _accumulate(
    trades: Sequence[Trade],
    threshold: float,
    weight: Callable[[Trade], float],
) -> List[Bar]:
    if not (threshold > 0):
        return []
    bars: List[Bar] = []
    start = 0
    acc = 0.0
    for i in range(len(trades)):
        acc += weight(trades[i])
        if acc >= threshold:
            bars.append(_build_bar(trades[start : i + 1]))
            start = i + 1
            acc = 0.0
    return bars


def volume_bars(trades: Sequence[Trade], threshold: float) -> List[Bar]:
    """Emit a bar each time cumulative size reaches ``threshold`` (volume bars)."""
    return _accumulate(trades, threshold, lambda t: t.size)


def dollar_bars(trades: Sequence[Trade], threshold: float) -> List[Bar]:
    """Emit a bar each time cumulative traded value reaches ``threshold`` (dollar bars)."""
    return _accumulate(trades, threshold, lambda t: t.price * t.size)
