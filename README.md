# orderflow-metrics

[![CI](https://github.com/twowaymind/orderflow-metrics/actions/workflows/ci.yml/badge.svg)](https://github.com/twowaymind/orderflow-metrics/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/orderflow-metrics.svg?logo=npm)](https://www.npmjs.com/package/orderflow-metrics)
[![PyPI](https://img.shields.io/pypi/v/orderflow-metrics.svg?logo=pypi&logoColor=white)](https://pypi.org/project/orderflow-metrics/)
[![Python](https://img.shields.io/pypi/pyversions/orderflow-metrics.svg?logo=python&logoColor=white)](https://pypi.org/project/orderflow-metrics/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Microstructure **order-flow metrics** in dependency-free TypeScript and Python:
Order Flow Imbalance (OFI), VPIN, information-driven bars, transaction-cost /
price-impact metrics, trade-sign classification, limit-order-book reconstruction
and execution scheduling. The npm package ships as compiled ESM with type
declarations (Node ≥ 18) and has zero runtime dependencies; the TypeScript
source is also vendorable directly (Node 22+ type-stripping, no build step).

## Metrics

- **Order flow & imbalance** — [Order Flow Imbalance](#order-flow-imbalance) · [Multi-level OFI](#multi-level-ofi-deep-book) · [Imbalance](#imbalance) · [VPIN](#vpin) · [Trade-sign classification](#trade-sign-classification) · [Order-flow entropy](#order-flow-entropy)
- **Bars & sampling** — [Information-driven bars](#information-driven-bars)
- **Fair value & spreads** — [Fair value](#fair-value) · [Spread estimators (OHLC)](#spread-estimators-from-ohlc)
- **Execution & impact** — [Execution cost & price impact](#execution-cost--price-impact) · [Market impact](#market-impact) · [Adverse selection (markout profiles)](#adverse-selection-markout-profiles) · [Implementation shortfall](#implementation-shortfall) · [Execution scheduling](#execution-scheduling)
- **Order book** — [Order book](#order-book)
- **Volatility & risk** — [Volatility](#volatility) · [Range-based volatility (OHLC)](#range-based-volatility-from-ohlc) · [Realized moments](#realized-moments) · [Jumps & bipower variation](#jumps--bipower-variation) · [Realized semivariance](#realized-semivariance)
- **Market efficiency** — [Market efficiency](#market-efficiency) · [Hurst exponent](#hurst-exponent) · [Mean reversion (half-life & z-score)](#mean-reversion-half-life--z-score)
- **Liquidity** — [Liquidity](#liquidity)
- **Streaming** — [Online / streaming estimators](#online--streaming-estimators)
- **Cross-asset** — [Realized covariance, correlation & beta](#realized-covariance-correlation--beta)

Runnable quickstarts live in [`examples/`](examples/).

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

## Examples

Runnable, dependency-free quickstarts that tour the library end-to-end on
deterministic synthetic data live in [`examples/`](examples/):

```bash
node --experimental-strip-types examples/quickstart.ts   # TypeScript
python examples/quickstart.py                            # Python
```

Both use the same seeded data and print the same numbers — a quick check that
the two ports agree.

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

## Multi-level OFI (deep-book)

Top-of-book OFI flickers in fragmented books. `mlofi` applies the same
event-flow logic at each of the top `K` levels and returns the per-level OFI
vector (Cont, Cucuringu & Zhang, 2023), then collapses it with geometric
depth-decay weights:

```ts
import { multiLevelOFI, depthWeightedOFI, type BookSnapshot } from "orderflow-metrics";

const prev: BookSnapshot = {
  bids: [{ price: 100.0, size: 200 }, { price: 99.9, size: 150 }, { price: 99.8, size: 120 }],
  asks: [{ price: 100.1, size: 180 }, { price: 100.2, size: 160 }, { price: 100.3, size: 140 }],
};
const curr: BookSnapshot = {
  bids: [{ price: 100.0, size: 260 }, { price: 99.9, size: 150 }, { price: 99.8, size: 90 }],
  asks: [{ price: 100.1, size: 120 }, { price: 100.2, size: 160 }, { price: 100.3, size: 140 }],
};

multiLevelOFI(prev, curr, 3);        // [120, 0, -30] — OFI per level
depthWeightedOFI(prev, curr, 3, 0.5); // 64.29 — near touch weighted up
```

- `multiLevelOFI(prev, curr, levels)` — the OFI vector across the top `levels`
- `multiLevelOFISeries(snapshots, levels)` — per-step vectors for a sequence
- `depthWeightedOFI(prev, curr, levels, decay)` — geometric depth-decay scalar (`decay` in (0,1]; 1 = equal weights)

Levels beyond the depth present in either snapshot contribute 0. Sides are
best-first: bids by descending price, asks by ascending price.

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

### Execution quality (vs the quote)

Measure a fill against the quote it faced — the SEC Rule 605 / TCA view:

```ts
import { quotedSpread, priceImprovement, effectiveToQuotedRatio } from "orderflow-metrics";

quotedSpread(99.98, 100.02);                     // 0.04 — width of the market
priceImprovement(100.01, 99.98, 100.02, "buy");  // 0.01 — filled inside the ask
effectiveToQuotedRatio(0.02, 0.04);              // 0.5  — traded at half the quoted spread
```

- `quotedSpread` / `quotedHalfSpread` — width of the market
- `priceImprovement` — how far inside the quote a fill landed (signed by side)
- `effectiveToQuotedRatio` — effective ÷ quoted; <1 = price improvement, >1 = walked the book

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

### Book-depth liquidity

Read liquidity off a book snapshot — near-touch depth, how steeply the book
thickens away from mid, and the round-trip cost of a given size. Take plain
`Level[]` arrays sorted best-first (bids high→low, asks low→high):

```ts
import { depthWithin, orderBookSlope, costOfRoundTrip } from "orderflow-metrics";

const bids = [{ price: 99.95, size: 6 }, { price: 99.9, size: 10 }];
const asks = [{ price: 100.0, size: 5 }, { price: 100.05, size: 8 }];

depthWithin(bids, asks, 10);     // { bidDepth, askDepth, total } within ±10 bps of mid
orderBookSlope(asks, 99.975);    // cumulative size per unit of relative price move
costOfRoundTrip(bids, asks, 15); // { roundTripBps, avgBuyPrice, avgSellPrice, filledSize }
```

- `depthWithin` — resting size within ±bps of mid, split by side
- `orderBookSlope` — (Σ size) / (relative distance to the outermost level)
- `costOfRoundTrip` — basis-point liquidity tax of buying then selling `size`

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

## Adverse selection (markout profiles)

Toxicity has a *shape*: an informed fill keeps drifting against you, a benign one
snaps back. The markout profile is the signed post-fill move across horizons — the
standard TCA adverse-selection lens:

```ts
import { markoutProfile, adverseSelectionScore } from "orderflow-metrics";

// taker buys at mid 100.00; mids at +1s / +5s / +30s
markoutProfile("buy", 100.0, [100.02, 100.05, 100.04]); // [0.02, 0.05, 0.04]

// the 1s move in half-spread units (spread 0.02 → half 0.01)
adverseSelectionScore("buy", 100.0, 100.02, 0.02);      // 2 — toxic beyond the spread
```

- `markoutProfile(side, midAtTrade, midsAfter)` — signed markout at each horizon
- `adverseSelectionScore(side, midAtTrade, midAfter, spread)` — markout in half-spread units (>1 = toxic beyond the quoted spread)
- `averageMarkoutProfile(observations)` — the aggregate markout curve across many fills

Sign is the taker's (buy → up is positive); flip it for the liquidity provider's
toxicity. Extends the single-horizon `markout`.

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

## Mean reversion (half-life & z-score)

Quantify *how fast* a spread or pair residual reverts and *how far* from home it
sits right now — the Ornstein–Uhlenbeck timescale a pairs / stat-arb strategy
trades on:

```ts
import { meanReversionSpeed, halfLife, zScore } from "orderflow-metrics";

const spread = [10.0, 10.6, 10.1, 9.7, 10.2, 9.8, 10.3, 9.9];

meanReversionSpeed(spread); // κ ≈ 1.393 per step (>0 reverting · <0 trending)
halfLife(spread);           // ≈ 0.498 steps to decay halfway (Infinity if κ ≤ 0)
zScore(spread);             // ≈ -0.642 — latest point sits below the mean
```

- `meanReversionSpeed` — OU reversion speed `κ`, the negated OLS slope of the
  change `Δyₜ` on the lagged level `yₜ₋₁`
- `halfLife` — `ln 2 / κ`, the number of steps a deviation takes to revert
  halfway; `Infinity` when the series does not mean-revert
- `zScore` — the latest observation as a standardized deviation from the sample
  mean (population σ), the raw entry/exit signal

Operates on a **level / spread** series (not returns), complementing the
`varianceRatio` and `hurstExponent` regime diagnostics above.

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

## Jumps & bipower variation

Split realized variance into its continuous (diffusive) part and its jump part
(Barndorff-Nielsen & Shephard, 2004). Bipower variation is jump-robust because
multiplying adjacent absolute returns damps a lone spike:

```ts
import { bipowerVariation, jumpVariation, relativeJumpVariation } from "orderflow-metrics";

bipowerVariation(returns);       // (π/2)·Σ|rᵢ₋₁||rᵢ| — continuous variance
jumpVariation(returns);          // max(RV − BV, 0)    — variance from jumps
relativeJumpVariation(returns);  // jump share of RV, in [0, 1]
```

- `bipowerVariation` — jump-robust estimate of continuous variance
- `jumpVariation` — the realized-variance contribution of discrete jumps
- `relativeJumpVariation` — that jump contribution as a fraction of RV

All three return 0 for fewer than two returns (and a jumpless series gives a jump
variation of 0).

## Realized semivariance

Realized variance treats an up-move and a down-move of equal size as identical
risk. Realized semivariance splits it by the *sign* of each return, isolating
downside ("bad") from upside ("good") volatility — Barndorff-Nielsen,
Kinnebrock & Shephard (2010) and Patton & Shephard (2015):

```ts
import {
  realizedSemivariance,
  downsideVarianceRatio,
  signedJumpVariation,
} from "orderflow-metrics";

realizedSemivariance(returns); // { upside: Σr²·1{r>0}, downside: Σr²·1{r<0} }
downsideVarianceRatio(returns); // RS⁻ / (RS⁺ + RS⁻), in [0, 1]
signedJumpVariation(returns);   // RS⁺ − RS⁻ — keeps the direction of jump risk
```

- `realizedSemivariance` — upside/downside split (their sum is realized variance)
- `downsideVarianceRatio` — the negative-return share of RV; > 0.5 is downside-heavy
- `signedJumpVariation` — RS⁺ − RS⁻; positive when upside dominates, negative when downside does

Zero returns contribute to neither half, and an empty series returns zeros.

## Order-flow entropy

Shannon entropy of order flow measures how *predictable* a stream of trades or
returns is. One-sided flow (nearly all buys, or a series that only ticks up)
carries little surprise — low entropy — and is easier to anticipate; balanced,
unpredictable flow sits at maximum entropy. Persistently low flow entropy is a
signature of directional, potentially informed activity. Reported in bits:

```ts
import { shannonEntropy, normalizedEntropy, signEntropy } from "orderflow-metrics";

shannonEntropy([3, 1]);         // 0.811… bits  — H of a count/probability vector
normalizedEntropy([2, 1, 1]);   // 0.946        — H / log₂(k), in [0, 1]
signEntropy(returns);           // up/down balance of a series, in [0, 1] bits
```

- `shannonEntropy` — H = −Σ pᵢ log₂ pᵢ over positive weights; two equal outcomes = 1 bit
- `normalizedEntropy` — that entropy scaled by log₂(k) so distributions of different sizes compare
- `signEntropy` — 1 bit is perfectly balanced two-sided flow, near 0 is one-sided and predictable

Zero and negative weights are ignored, and fewer than two live categories returns 0.

## Online / streaming estimators

Batch metrics rescan the whole history on every tick. In a live pipeline you
want estimators that update in **O(1) time and memory** as each observation
streams in. These are stateful classes — `push` one value at a time and read the
current estimate — and they are numerically stable (Welford / West, not the
naive Σx² − (Σx)²/n form that loses precision when the mean dwarfs the variance):

```ts
import { Welford, Ewma, EwmaVariance, RollingWindow } from "orderflow-metrics";

const w = new Welford();
for (const r of returns) w.push(r);
w.mean; w.variance; w.std;          // running, exact, updated in O(1)

const vol = new EwmaVariance(0.94); // RiskMetrics daily λ
for (const r of returns) vol.push(r);
vol.std;                            // current EWMA volatility

const win = new RollingWindow(20);  // trailing 20-observation window
for (const r of returns) win.push(r);
win.mean; win.variance;             // O(1) add + evict (West 1979)
```

- `Welford` — running mean & variance over all data (`variance` sample, `populationVariance`, `std`, `count`)
- `Ewma` — exponentially weighted moving average of a level; `lambda` in (0, 1) is the decay
- `EwmaVariance` — RiskMetrics-style EWMA variance/volatility; assumes ~zero-mean returns
- `RollingWindow` — mean & variance over the last `size` values, with O(1) add/remove

`Welford` and `RollingWindow` are verified in the test suite to equal a batch
recomputation at every step; the EWMA classes seed on their first value.

## Realized covariance, correlation & beta

Single-asset volatility says how much one instrument moved; risk lives in how
instruments move *together*. Summing products of contemporaneous returns gives
the model-free, high-frequency analogue of covariance, correlation, and beta:

```ts
import { realizedCovariance, realizedCorrelation, realizedBeta } from "orderflow-metrics";

realizedCovariance(x, y);   // Σ xᵢyᵢ
realizedCorrelation(x, y);  // Σxy / (√Σx²·√Σy²) — in [−1, 1]
realizedBeta(asset, market); // Σa·m / Σm² — sensitivity of asset to market
```

- `realizedCovariance` — Σ xᵢyᵢ (symmetric)
- `realizedCorrelation` — scale-free co-movement in [−1, 1]
- `realizedBeta` — an asset's realized covariance with a market over the market's realized variance

The two series are paired element-wise over their common length, so align them to
the same sampling grid first; empty or zero-variance inputs return 0.

### Realized semicovariance

Split realized covariance by the sign of each pair of returns — the cross-asset
analogue of realized semivariance (Bollerslev, Li, Patton &amp; Quaedvlieg 2020):

```ts
import { realizedSemicovariance } from "orderflow-metrics";

realizedSemicovariance(x, y);
// { positive, negative, mixed }  — sum to realizedCovariance(x, y)
```

- `positive` — both up: Σ max(x,0)·max(y,0) (≥ 0)
- `negative` — both down: Σ min(x,0)·min(y,0) (≥ 0) — joint downside / crash covariance
- `mixed` — opposite signs (≤ 0); the three sum to the realized covariance

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
