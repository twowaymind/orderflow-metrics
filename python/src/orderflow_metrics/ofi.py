"""Order Flow Imbalance (OFI).

Level-1 OFI of Cont, Kukanov & Stoikov (2014), "The price impact of order book
events". For consecutive best-quote observations (n-1, n) the event
contribution is::

    e_n =  q_bid_n * 1{P_bid_n >= P_bid_{n-1}}  -  q_bid_{n-1} * 1{P_bid_n <= P_bid_{n-1}}
         - q_ask_n * 1{P_ask_n <= P_ask_{n-1}}  +  q_ask_{n-1} * 1{P_ask_n >= P_ask_{n-1}}

OFI over a window is the sum of e_n. Positive OFI means net buy-side pressure at
the top of book; it is a strong linear predictor of short-term price moves.
"""
from __future__ import annotations

from typing import List, Sequence

from .types import L1Quote


def ofi_contribution(prev: L1Quote, curr: L1Quote) -> float:
    """OFI contribution of a single best-quote transition (prev -> curr)."""
    bid_term = (curr.bid_size if curr.bid_price >= prev.bid_price else 0.0) - (
        prev.bid_size if curr.bid_price <= prev.bid_price else 0.0
    )
    ask_term = (prev.ask_size if curr.ask_price >= prev.ask_price else 0.0) - (
        curr.ask_size if curr.ask_price <= prev.ask_price else 0.0
    )
    return bid_term + ask_term


def ofi_series(quotes: Sequence[L1Quote]) -> List[float]:
    """Per-step OFI contributions for a sequence of quotes (length n-1)."""
    return [ofi_contribution(quotes[i - 1], quotes[i]) for i in range(1, len(quotes))]


def ofi(quotes: Sequence[L1Quote]) -> float:
    """Cumulative OFI over the whole sequence of quotes."""
    return sum(
        ofi_contribution(quotes[i - 1], quotes[i]) for i in range(1, len(quotes))
    )
