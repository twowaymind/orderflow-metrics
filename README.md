# orderflow-metrics

[![CI](https://github.com/twowaymind/orderflow-metrics/actions/workflows/ci.yml/badge.svg)](https://github.com/twowaymind/orderflow-metrics/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-22%2B-brightgreen.svg)](package.json)

Microstructure **order-flow metrics** in dependency-free TypeScript: Order Flow
Imbalance (OFI) and top-of-book / trade imbalance. Runs on Node 22+ with no
build step and no runtime dependencies.

## Install

```bash
npm install orderflow-metrics
# or vendor the src/ directory directly — it's tiny and dependency-free
```

## Usage

```ts
import { ofi, depthImbalance, tradeImbalance } from "orderflow-metrics";

// Order Flow Imbalance across a stream of best-quote updates
const quotes = [
  { bidPrice: 100, bidSize: 5, askPrice: 101, askSize: 4 },
  { bidPrice: 100, bidSize: 8, askPrice: 101, askSize: 1 },
  { bidPrice: 100.5, bidSize: 2, askPrice: 101, askSize: 1 },
];
ofi(quotes); // 8  (net buy-side pressure)

depthImbalance(quotes[0]); // (5 - 4) / (5 + 4) ≈ 0.111

tradeImbalance([
  { price: 100, size: 2, side: "buy" },
  { price: 100, size: 1, side: "sell" },
]); // 0.333
```

## Order Flow Imbalance

`ofi` implements the level-1 OFI of Cont, Kukanov & Stoikov (2014). For two
consecutive best-quote observations the event contribution is:

```
e_n =  q_bid_n · 1{P_bid_n ≥ P_bid_{n-1}}  −  q_bid_{n-1} · 1{P_bid_n ≤ P_bid_{n-1}}
     − q_ask_n · 1{P_ask_n ≤ P_ask_{n-1}}  +  q_ask_{n-1} · 1{P_ask_n ≥ P_ask_{n-1}}
```

OFI over a window is the sum of `e_n`. Intuitively it counts size added to the
bid and removed from the ask (buy pressure) against the reverse. Empirically it
is a strong linear predictor of short-horizon price changes.

- `ofiContribution(prev, curr)` — one transition
- `ofiSeries(quotes)` — per-step contributions (for bucketing / regression)
- `ofi(quotes)` — cumulative

## Imbalance

- `depthImbalance(quote)` — `(bidSize − askSize) / (bidSize + askSize)`, in `[-1, 1]`
- `tradeImbalance(trades)` — `(buyVol − sellVol) / (buyVol + sellVol)`, in `[-1, 1]`

## VPIN

`vpin` implements Volume-Synchronized Probability of Informed Trading (Easley,
López de Prado & O'Hara, 2012). Trades are grouped into equal-volume buckets;
each bucket is split into buy/sell volume by Bulk Volume Classification (BVC)
from the standardized price change, and VPIN is the average absolute imbalance
across a rolling window.

```ts
import { bucketByVolume, vpin } from "orderflow-metrics";

const buckets = bucketByVolume(trades, 1_000); // equal-volume buckets
vpin(buckets, { window: 50 }); // flow toxicity in [0, 1]
```

- `bucketByVolume(trades, bucketSize)` — split a trade stream into equal-volume buckets
- `bvcBuyFraction(priceChange, sigma)` — BVC buy fraction Φ(ΔP/σ)
- `vpin(buckets, { window, sigma })` — VPIN over the last `window` buckets

## Execution cost & price impact

Transaction-cost analysis (TCA) building blocks (buys `+1`, sells `−1`):

```ts
import { effectiveSpread, realizedSpread, priceImpact, kyleLambda } from "orderflow-metrics";

effectiveSpread(101, 100, "buy");        // 2  — cost vs the midpoint
realizedSpread(101, 100.5, "buy");       // 1  — LP revenue after reversion
priceImpact(100, 100.5, "buy");          // 1  — permanent impact (effective − realized)

kyleLambda([                             // price impact per unit signed flow
  { signedVolume: 2, priceChange: 1 },
  { signedVolume: -2, priceChange: -1 },
]);                                      // 0.5
```

- `effectiveSpread` / `effectiveHalfSpread` — realized cost vs the quote mid
- `realizedSpread` — post-trade reversion component
- `priceImpact` — permanent impact
- `kyleLambda` — OLS impact slope of ΔP on signed volume
- `rollSpread` — Roll's (1984) spread from price-change autocovariance

## Fair value

```ts
import { weightedMid, relativeSpreadBps } from "orderflow-metrics";

weightedMid({ bidPrice: 100, bidSize: 9, askPrice: 101, askSize: 1 }); // ~100.9 — heavy bid pulls toward ask
relativeSpreadBps({ bidPrice: 99.99, bidSize: 1, askPrice: 100.01, askSize: 1 }); // 2 (bps)
```

- `weightedMid` — imbalance-weighted mid (a simple micro-price)
- `mid` — arithmetic mid
- `relativeSpreadBps` — quoted spread in basis points

## Trade-sign classification

Public prints rarely say who was the aggressor. Infer it so OFI / imbalance /
VPIN inputs can be signed (+1 buyer-initiated, −1 seller-initiated, 0 unknown):

```ts
import { tickRule, leeReady } from "orderflow-metrics";

tickRule([100, 101, 101, 100]);                        // [0, 1, 1, -1]
leeReady([{ price: 101, mid: 100 }, { price: 99, mid: 100 }]); // [1, -1]
```

- `tickRule` — sign from the change vs the previous price (zero ticks carry)
- `leeReady` — Lee-Ready (1991): quote rule, with the tick rule breaking ties

## Liquidity

```ts
import { amihudIlliquidity } from "orderflow-metrics";

amihudIlliquidity([
  { ret: 0.02, volume: 100 },
  { ret: -0.01, volume: 50 },
]); // 0.0002 — price move per unit of volume; higher = thinner
```

- `amihudIlliquidity` — Amihud (2002): average |return| / volume across periods

## Volatility

```ts
import { realizedVolatility, annualizedVolatility } from "orderflow-metrics";

realizedVolatility([0.03, 0.04]);          // 0.05  — √(Σ rᵢ²)
annualizedVolatility(minuteReturns, 252 * 390); // scaled to a year
```

- `realizedVariance` — Σ rᵢ²
- `realizedVolatility` — √ of the realized variance
- `annualizedVolatility` — √( mean(rᵢ²) · periodsPerYear )

## Market efficiency

```ts
import { varianceRatio, autocorrelation } from "orderflow-metrics";

varianceRatio(returns, 2);   // <1 mean-reverting · ~1 random walk · >1 trending
autocorrelation(returns, 1); // lag-1 return autocorrelation
```

- `varianceRatio` — Lo-MacKinlay variance ratio over overlapping q-period returns
- `autocorrelation` — lag-k autocorrelation of a return series

## Order book

Reconstruct a limit order book from incremental level updates and read the
usual top-of-book / depth signals:

```ts
import { OrderBook } from "orderflow-metrics";

const ob = new OrderBook();
ob.update("bid", 100, 5);
ob.update("ask", 101, 3);

ob.bestBid();      // { price: 100, size: 5 }
ob.mid();          // 100.5
ob.spread();       // 1
ob.imbalance(1);   // 0.25  — top-of-book bid/ask size imbalance
ob.update("bid", 100, 0); // size 0 removes the level
```

- `update(side, price, size)` · `bestBid` / `bestAsk` · `mid` · `spread`
- `depth(side, n)` — top n levels · `imbalance(n)` — depth imbalance in `[-1, 1]`

### Market-order simulation

Sweep the book with a market order and see the real fill — VWAP price, slippage
and any unfilled size (read-only, the book isn't touched):

```ts
import { simulateMarketOrder } from "orderflow-metrics";

const r = simulateMarketOrder(ob, "buy", 4);
r.avgPrice;      // volume-weighted fill price
r.slippageBps;   // cost vs mid, in basis points
r.remainingSize; // > 0 if the book was too thin
```

## Execution scheduling

Split a parent order into child slices:

```ts
import { twap, pov } from "orderflow-metrics";

twap(100, 4);                       // [25, 25, 25, 25] — even time slices
pov(30, [100, 100, 100], 0.1);      // [10, 10, 10] — 10% of each interval's volume
```

- `twap` — time-weighted: even slices that sum exactly to the parent size
- `pov` — percentage-of-volume: participate at a fixed fraction of each interval

## Tests

```bash
node --experimental-strip-types --test
```

## License

MIT © RATE LTD (TwoWayMind). See [LICENSE](LICENSE).

---

Part of [TwoWayMind](https://twowaymind.com)'s open microstructure tooling.
Educational and technical material only — not investment advice.
