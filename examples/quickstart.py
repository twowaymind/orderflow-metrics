"""orderflow-metrics — quickstart (Python)

A self-contained tour: deterministic synthetic market data in, a spread of
microstructure metrics out. No external data, no dependencies.

    python examples/quickstart.py
"""
import math

from orderflow_metrics import (
    Candle,
    L1Quote,
    Trade,
    abdi_ranaldo,
    bucket_by_volume,
    corwin_schultz,
    hurst_exponent,
    ofi,
    parkinson_volatility,
    realized_kurtosis,
    realized_skewness,
    realized_volatility,
    trade_imbalance,
    variance_ratio,
    vpin,
    yang_zhang_volatility,
)

# Deterministic pseudo-random stream (MINSTD) so the numbers reproduce exactly.
_seed = 1


def rand() -> float:
    global _seed
    _seed = (48271 * _seed) % 2147483647
    return _seed / 2147483647


# 1) Best-quote updates -> Order Flow Imbalance
quotes = [
    L1Quote(bid_price=100, bid_size=5, ask_price=101, ask_size=4),
    L1Quote(bid_price=100, bid_size=8, ask_price=101, ask_size=2),
    L1Quote(bid_price=100.5, bid_size=3, ask_price=101, ask_size=1),
]
print("OFI:                  ", ofi(quotes))

# 2) Trades -> trade imbalance + VPIN (flow toxicity)
trades = []
for _ in range(400):
    r = rand()
    trades.append(
        Trade(price=100 + (r - 0.5), size=1 + int(rand() * 5), side="buy" if r > 0.5 else "sell")
    )
print("Trade imbalance:      ", round(trade_imbalance(trades), 4))
print("VPIN (flow toxicity): ", round(vpin(bucket_by_volume(trades, 200), window=10), 4))

# 3) Daily OHLC candles -> spread estimators + range-based volatility
candles = []
px = 100.0
for _ in range(60):
    open_ = px
    close = open_ + (rand() - 0.5) * 1.5
    high = max(open_, close) + rand() * 0.8
    low = min(open_, close) - rand() * 0.8
    candles.append(Candle(open_, high, low, close))
    px = close
print("Corwin-Schultz spread:", round(corwin_schultz(candles), 5))
print("Abdi-Ranaldo spread:  ", round(abdi_ranaldo(candles), 5))
print("Parkinson vol:        ", round(parkinson_volatility(candles), 5))
print("Yang-Zhang vol:       ", round(yang_zhang_volatility(candles), 5))

# 4) Return series -> realized measures, higher moments, efficiency, long memory
returns = [math.log(candles[i].close / candles[i - 1].close) for i in range(1, len(candles))]
print("Realized vol:         ", round(realized_volatility(returns), 5))
print("Realized skewness:    ", round(realized_skewness(returns), 4))
print("Realized kurtosis:    ", round(realized_kurtosis(returns), 4))
print("Variance ratio (q=4): ", round(variance_ratio(returns, 4), 4))
print("Hurst exponent:       ", round(hurst_exponent(returns), 4))
