# orderflow-metrics (Python)

[![CI](https://github.com/twowaymind/orderflow-metrics-py/actions/workflows/ci.yml/badge.svg)](https://github.com/twowaymind/orderflow-metrics-py/actions/workflows/ci.yml)
[![PyPI](https://img.shields.io/pypi/v/orderflow-metrics.svg)](https://pypi.org/project/orderflow-metrics/)
[![Python](https://img.shields.io/pypi/pyversions/orderflow-metrics.svg)](https://pypi.org/project/orderflow-metrics/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Dependency-free **market-microstructure metrics** in pure Python: Order Flow
Imbalance (OFI), VPIN, information-driven bars, transaction-cost / price-impact
metrics, trade-sign classification, limit-order-book reconstruction and
execution scheduling. No NumPy, no pandas — just the standard library.

This is the Python port of the TypeScript
[`orderflow-metrics`](https://github.com/twowaymind/orderflow-metrics) library,
with the same API surface in `snake_case`.

## Install

```bash
pip install orderflow-metrics
```

## Usage

```python
from orderflow_metrics import ofi, depth_imbalance, trade_imbalance, L1Quote, Trade

quotes = [
    L1Quote(bid_price=100, bid_size=5, ask_price=101, ask_size=4),
    L1Quote(bid_price=100, bid_size=8, ask_price=101, ask_size=1),
    L1Quote(bid_price=100.5, bid_size=2, ask_price=101, ask_size=1),
]
ofi(quotes)  # 8  (net buy-side pressure)

depth_imbalance(quotes[0])  # (5 - 4) / (5 + 4) ~ 0.111

trade_imbalance([Trade(100, 2, "buy"), Trade(100, 1, "sell")])  # 0.333
```

## Order Flow Imbalance

`ofi` implements the level-1 OFI of Cont, Kukanov & Stoikov (2014). OFI over a
window is the sum of per-event contributions; it counts size added to the bid
and removed from the ask (buy pressure) against the reverse, and is a strong
linear predictor of short-horizon price changes.

- `ofi_contribution(prev, curr)` — one transition
- `ofi_series(quotes)` — per-step contributions
- `ofi(quotes)` — cumulative

## VPIN

Volume-Synchronized Probability of Informed Trading (Easley, López de Prado &
O'Hara, 2012). Trades are grouped into equal-volume buckets; each bucket is
split into buy/sell volume by Bulk Volume Classification, and VPIN is the
average absolute imbalance over a rolling window.

```python
from orderflow_metrics import bucket_by_volume, vpin

buckets = bucket_by_volume(trades, 1_000)
vpin(buckets, window=50)  # flow toxicity in [0, 1]
```

## Execution cost & price impact

Transaction-cost analysis building blocks (buys `+1`, sells `-1`):

```python
from orderflow_metrics import effective_spread, realized_spread, price_impact, kyle_lambda, FlowObservation

effective_spread(101, 100, "buy")   # 2 — cost vs the midpoint
realized_spread(101, 100.5, "buy")  # 1 — LP revenue after reversion
price_impact(100, 100.5, "buy")     # 1 — permanent impact

kyle_lambda([
    FlowObservation(price_change=1, signed_volume=2),
    FlowObservation(price_change=-1, signed_volume=-2),
])  # 0.5 — price impact per unit signed flow
```

Also: `effective_half_spread`, `roll_spread` (Roll 1984).

## Fair value

```python
from orderflow_metrics import weighted_mid, relative_spread_bps, L1Quote

weighted_mid(L1Quote(100, 9, 101, 1))          # ~100.9 — heavy bid pulls toward ask
relative_spread_bps(L1Quote(99.99, 1, 100.01, 1))  # 2 (bps)
```

## Trade-sign classification

```python
from orderflow_metrics import tick_rule, lee_ready, PriceVsMid

tick_rule([100, 101, 101, 100])                       # [0, 1, 1, -1]
lee_ready([PriceVsMid(101, 100), PriceVsMid(99, 100)])  # [1, -1]
```

## Liquidity, volatility, efficiency

```python
from orderflow_metrics import (
    amihud_illiquidity, ReturnVolume,
    realized_volatility, annualized_volatility,
    variance_ratio, autocorrelation,
)

amihud_illiquidity([ReturnVolume(0.02, 100), ReturnVolume(-0.01, 50)])  # 0.0002
realized_volatility([0.03, 0.04])                                       # 0.05
variance_ratio(returns, 2)   # <1 mean-reverting · ~1 random walk · >1 trending
autocorrelation(returns, 1)  # lag-1 autocorrelation
```

## Order book & market-order simulation

```python
from orderflow_metrics import OrderBook, simulate_market_order

ob = OrderBook()
ob.update("bid", 100, 5)
ob.update("ask", 101, 3)
ob.mid()          # 100.5
ob.imbalance(1)   # 0.25 — top-of-book size imbalance
ob.update("bid", 100, 0)  # size 0 removes the level

r = simulate_market_order(ob, "buy", 4)
r.avg_price      # volume-weighted fill price
r.slippage_bps   # cost vs mid, in basis points
r.remaining_size # > 0 if the book was too thin
```

`OrderBook.mid()`, `spread()`, `best_bid()`, `best_ask()` return `None` on an
empty side.

## Information-driven bars

Sampling on **activity** rather than the clock — a bar every N ticks, N units of
volume, or N units of traded value — gives returns with far better statistical
properties (López de Prado, *Advances in Financial ML*, ch. 2). Build them
first, then run the other metrics on the resulting series.

```python
from orderflow_metrics import tick_bars, volume_bars, dollar_bars

tick_bars(trades, 100)       # a bar per 100 trades
volume_bars(trades, 5_000)   # a bar per 5,000 units of volume
dollar_bars(trades, 250_000) # a bar per $250k of traded value
```

Each `Bar` carries `open`/`high`/`low`/`close`, `volume`, `dollar`, `vwap`,
`ticks`, and signed `buy_volume` / `sell_volume` (plus `start` / `end`
timestamps when the feed provides them). Dollar bars are usually preferred.

## Execution scheduling

```python
from orderflow_metrics import twap, pov

twap(100, 4)                    # [25, 25, 25, 25] — even time slices
pov(30, [100, 100, 100], 0.1)   # [10, 10, 10] — 10% of each interval's volume
```

## Tests

```bash
pip install -e ".[dev]"
pytest
```

## License

MIT © RATE LTD (TwoWayMind). See [LICENSE](LICENSE).

---

Part of [TwoWayMind](https://twowaymind.com)'s open microstructure tooling.
Educational and technical material only — not investment advice.
