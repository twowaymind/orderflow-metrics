# orderflow-metrics

[![CI](https://github.com/twowaymind/orderflow-metrics/actions/workflows/ci.yml/badge.svg)](https://github.com/twowaymind/orderflow-metrics/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-22%2B-brightgreen.svg)](package.json)

Microstructure **order-flow metrics** in dependency-free TypeScript: Order Flow
Imbalance (OFI), VPIN, information-driven bars, transaction-cost / price-impact
metrics, trade-sign classification, limit-order-book reconstruction and
execution scheduling. Runs on Node 22+ with no build step and no runtime
dependencies.

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
- `standardNormalCdf(z)` — Φ, the standard normal CDF (Abramowitz & Stegun 7.1.26)

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

## Information-driven bars

Sampling trades on a fixed time grid oversamples quiet periods and produces
non-IID returns. Sampling on **activity** instead — a bar every N ticks, N
units of volume, or N units of traded value — gives bars with much better
statistical properties (López de Prado, *Advances in Financial ML*, ch. 2).
Build them first, then run the other metrics on the resulting series.

```ts
import { tickBars, volumeBars, dollarBars } from "orderflow-metrics";

const trades = [
  { price: 100, size: 3, side: "buy" },
  { price: 101, size: 4, side: "buy" },
  { price: 100, size: 2, side: "sell" },
  { price: 102, size: 5, side: "sell" },
];

tickBars(trades, 2);      // one bar per 2 trades
volumeBars(trades, 5);    // new bar each time cumulative size ≥ 5
dollarBars(trades, 500);  // new bar each time cumulative price·size ≥ 500
```

Each `Bar` carries `open`/`high`/`low`/`close`, `volume`, `dollar` (traded
value), `vwap`, `ticks`, and signed `buyVolume` / `sellVolume` (plus `start` /
`end` timestamps when the feed provides them). The trade that crosses the
threshold is included whole (never split), and a trailing partial bar is
dropped. Dollar bars are usually preferred — they are the most robust of the
three to changes in price level.

- `tickBars(trades, threshold)` — a bar every `threshold` trades
- `volumeBars(trades, threshold)` — a bar every `threshold` units of volume
- `dollarBars(trades, threshold)` — a bar every `threshold` units of traded value

## Market impact

Pre-trade cost models and post-trade markouts:

```ts
import { squareRootImpact, almgrenChrissCost, markout } from "orderflow-metrics";

squareRootImpact(0.02, 1_000, 1_000_000);   // Y·σ·√(Q/V) — empirical impact
almgrenChrissCost(10_000, 30, 1e-6, 2e-7);  // { permanent, temporary, total }
markout("buy", 100, 100.5);                 // +0.5 — price moved with the trade
```

- `squareRootImpact` — the empirical square-root law of impact
- `linearPermanentImpact` / `linearTemporaryImpact` — Almgren-Chriss impact terms
- `almgrenChrissCost` — expected TWAP cost, split into permanent vs temporary
- `markout` / `averageMarkout` — realized post-trade adverse-selection drift

## Implementation shortfall

Execution-quality analytics against a decision / arrival benchmark:

```ts
import { implementationShortfall, arrivalSlippageBps } from "orderflow-metrics";

implementationShortfall("buy", 100, 100.5, 800, 1000, 101, 5);
// { execution: 400, opportunity: 200, fees: 5, total: 605 }

arrivalSlippageBps("buy", 100, 100.5);   // 50 bps paid up vs arrival
```

- `implementationShortfall` — Perold's execution + opportunity + fees decomposition
- `arrivalSlippageBps` — signed slippage of the fill vs the arrival price

## Spread estimators (from OHLC)

Recover the effective bid-ask spread when all you have is daily high, low, and
close — no tick data required:

```ts
import { corwinSchultz, abdiRanaldo } from "orderflow-metrics";

const bars = [
  { high: 10.2, low: 9.8, close: 10.18 },
  { high: 10.25, low: 9.85, close: 9.88 },
  { high: 10.3, low: 9.9, close: 10.27 },
];

corwinSchultz(bars);   // proportional spread from the two-day high-low range
abdiRanaldo(bars);     // proportional spread from close vs high-low mid-range
```

- `corwinSchultz` — Corwin & Schultz (2012) high-low estimator
- `abdiRanaldo` — Abdi & Ranaldo (2017) close/high/low estimator

Both return a proportional spread (a fraction of price); negative estimates are
floored at 0.

## Range-based volatility (from OHLC)

Estimate volatility from the open, high, low, and close — far more efficient than
close-to-close when you have candles:

```ts
import {
  parkinsonVolatility,
  garmanKlassVolatility,
  rogersSatchellVolatility,
  yangZhangVolatility,
} from "orderflow-metrics";

const candles = [
  { open: 100, high: 105, low: 99, close: 102 },
  { open: 102, high: 106, low: 101, close: 104 },
  { open: 104, high: 104, low: 98, close: 99 },
];

parkinsonVolatility(candles);       // high-low range
garmanKlassVolatility(candles);     // adds open & close
rogersSatchellVolatility(candles);  // drift-independent
yangZhangVolatility(candles);       // + overnight jumps (needs >= 3 bars)
```

- `parkinsonVolatility` — Parkinson (1980), high-low range
- `garmanKlassVolatility` — Garman & Klass (1980), OHLC
- `rogersSatchellVolatility` — Rogers & Satchell (1991), drift-independent
- `yangZhangVolatility` — Yang & Zhang (2000), drift- and jump-robust

Each returns the volatility (standard deviation) per bar; multiply the variance
by bars-per-year to annualize.

## Hurst exponent

Detect long-memory — trending vs mean-reverting — from a return series via
rescaled-range (R/S) analysis:

```ts
import { hurstExponent } from "orderflow-metrics";

hurstExponent(returns);
// ~0.5 random walk · >0.5 persistent/trending · <0.5 mean-reverting
// NaN if the series is too short (needs ~32+ points)
```

- `hurstExponent` — R/S Hurst estimate; a companion to `varianceRatio` and
  `autocorrelation` for gauging market efficiency

## Realized moments

Higher moments of the intraday return distribution (Amaya et al., 2015):

```ts
import { realizedSkewness, realizedKurtosis } from "orderflow-metrics";

realizedSkewness(returns);  // √N · Σr³ / RV^1.5  — intraday asymmetry
realizedKurtosis(returns);  // N · Σr⁴ / RV²      — intraday tail heaviness
```

- `realizedSkewness` — asymmetry of the intraday return distribution
- `realizedKurtosis` — tail heaviness of the intraday return distribution

Both return 0 for an empty or zero-variance series.

## Python

A dependency-free Python port lives in [`python/`](python/) and ships the same
metrics (OFI, VPIN, information-driven bars, spreads, price impact, order-book
reconstruction). Install from PyPI:

```bash
pip install orderflow-metrics
```

See [python/README.md](python/README.md) for the Python API.

## Tests

```bash
node --experimental-strip-types --test
```

## License

MIT © RATE LTD (TwoWayMind). See [LICENSE](LICENSE).

---

Part of [TwoWayMind](https://twowaymind.com)'s open microstructure tooling.
Educational and technical material only — not investment advice.
