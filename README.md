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

## Tests

```bash
node --experimental-strip-types --test
```

## License

MIT © RATE LTD (TwoWayMind). See [LICENSE](LICENSE).

---

Part of [TwoWayMind](https://twowaymind.com)'s open microstructure tooling.
Educational and technical material only — not investment advice.
