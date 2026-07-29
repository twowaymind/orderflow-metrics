/**
 * VPIN — Volume-Synchronized Probability of Informed Trading.
 *
 * Easley, López de Prado & O'Hara (2012), "Flow Toxicity and Liquidity in a
 * High-Frequency World". Trades are grouped into equal-volume buckets; each
 * bucket is split into buy/sell volume by Bulk Volume Classification (BVC)
 * using the standardized close-to-close price change; VPIN is the average
 * absolute order imbalance across a rolling window of buckets.
 *
 *   V_buy  = V · Φ(ΔP / σ)
 *   V_sell = V · (1 − Φ(ΔP / σ))
 *   VPIN   = Σ |V_buy − V_sell| / Σ V     over the window
 */

export interface VolumeBucket {
  /** close-to-close price change over the bucket */
  priceChange: number;
  /** total traded volume in the bucket */
  volume: number;
}

// Abramowitz & Stegun 7.1.26 — max error ≈ 1.5e-7.
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/** Standard normal CDF Φ(x). */
export function standardNormalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/** BVC buy-volume fraction for a bucket, given its price change and σ. */
export function bvcBuyFraction(priceChange: number, sigma: number): number {
  if (!(sigma > 0)) return 0.5;
  return standardNormalCdf(priceChange / sigma);
}

/** Aggregate a trade stream into equal-volume buckets (splitting trades). */
export function bucketByVolume(
  trades: readonly { price: number; size: number }[],
  bucketSize: number,
): VolumeBucket[] {
  if (bucketSize <= 0) throw new Error("bucketSize must be positive");
  const buckets: VolumeBucket[] = [];
  let filled = 0;
  let prevClose = trades.length ? trades[0].price : 0;

  for (const t of trades) {
    let remaining = t.size;
    while (filled + remaining >= bucketSize) {
      remaining -= bucketSize - filled;
      buckets.push({ priceChange: t.price - prevClose, volume: bucketSize });
      prevClose = t.price;
      filled = 0;
    }
    filled += remaining;
  }
  return buckets;
}

function populationStd(xs: number[]): number {
  if (xs.length === 0) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

/**
 * VPIN over the last `window` buckets (default: all of them).
 * σ for BVC defaults to the std dev of the window's price changes.
 * Returns a value in [0, 1].
 */
export function vpin(
  buckets: VolumeBucket[],
  opts: { window?: number; sigma?: number } = {},
): number {
  if (buckets.length === 0) return 0;
  const window = opts.window ?? buckets.length;
  const slice = buckets.slice(-window);
  const sigma = opts.sigma ?? populationStd(slice.map((b) => b.priceChange));

  let imbalance = 0;
  let volume = 0;
  for (const b of slice) {
    const buyFrac = bvcBuyFraction(b.priceChange, sigma);
    imbalance += b.volume * Math.abs(2 * buyFrac - 1);
    volume += b.volume;
  }
  return volume === 0 ? 0 : imbalance / volume;
}
