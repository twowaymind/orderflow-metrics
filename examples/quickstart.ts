/**
 * orderflow-metrics — quickstart (TypeScript / Node)
 *
 * A self-contained tour: deterministic synthetic market data in, a spread of
 * microstructure metrics out. No external data, no dependencies.
 *
 *   node --experimental-strip-types examples/quickstart.ts
 */
import {
  ofi,
  tradeImbalance,
  bucketByVolume,
  vpin,
  corwinSchultz,
  abdiRanaldo,
  parkinsonVolatility,
  yangZhangVolatility,
  realizedVolatility,
  realizedSkewness,
  realizedKurtosis,
  varianceRatio,
  hurstExponent,
  type L1Quote,
  type Trade,
  type Candle,
} from "orderflow-metrics";

// Deterministic pseudo-random stream (MINSTD) so the numbers reproduce exactly.
let seed = 1;
const rand = () => (seed = (48271 * seed) % 2147483647) / 2147483647;

// 1) Best-quote updates -> Order Flow Imbalance
const quotes: L1Quote[] = [
  { bidPrice: 100, bidSize: 5, askPrice: 101, askSize: 4 },
  { bidPrice: 100, bidSize: 8, askPrice: 101, askSize: 2 },
  { bidPrice: 100.5, bidSize: 3, askPrice: 101, askSize: 1 },
];
console.log("OFI:                  ", ofi(quotes));

// 2) Trades -> trade imbalance + VPIN (flow toxicity)
const trades: Trade[] = Array.from({ length: 400 }, () => {
  const r = rand();
  return {
    price: 100 + (r - 0.5),
    size: 1 + Math.floor(rand() * 5),
    side: r > 0.5 ? "buy" : "sell",
  } as Trade;
});
console.log("Trade imbalance:      ", tradeImbalance(trades).toFixed(4));
console.log("VPIN (flow toxicity): ", vpin(bucketByVolume(trades, 200), { window: 10 }).toFixed(4));

// 3) Daily OHLC candles -> spread estimators + range-based volatility
const candles: Candle[] = [];
let px = 100;
for (let i = 0; i < 60; i++) {
  const open = px;
  const close = open + (rand() - 0.5) * 1.5;
  const high = Math.max(open, close) + rand() * 0.8;
  const low = Math.min(open, close) - rand() * 0.8;
  candles.push({ open, high, low, close });
  px = close;
}
console.log("Corwin-Schultz spread:", corwinSchultz(candles).toFixed(5));
console.log("Abdi-Ranaldo spread:  ", abdiRanaldo(candles).toFixed(5));
console.log("Parkinson vol:        ", parkinsonVolatility(candles).toFixed(5));
console.log("Yang-Zhang vol:       ", yangZhangVolatility(candles).toFixed(5));

// 4) Return series -> realized measures, higher moments, efficiency, long memory
const returns = candles.slice(1).map((c, i) => Math.log(c.close / candles[i].close));
console.log("Realized vol:         ", realizedVolatility(returns).toFixed(5));
console.log("Realized skewness:    ", realizedSkewness(returns).toFixed(4));
console.log("Realized kurtosis:    ", realizedKurtosis(returns).toFixed(4));
console.log("Variance ratio (q=4): ", varianceRatio(returns, 4).toFixed(4));
console.log("Hurst exponent:       ", hurstExponent(returns).toFixed(4));
