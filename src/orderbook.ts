/**
 * Limit order book reconstruction from incremental level updates.
 *
 * Feed it level updates (price + new size per side); it maintains both sides
 * and answers the usual top-of-book and depth questions. A size of 0 removes
 * the level. Prices are the level keys, so re-sending a price overwrites it.
 */

export type BookSide = "bid" | "ask";

export interface Level {
  price: number;
  size: number;
}

export class OrderBook {
  private readonly bids = new Map<number, number>();
  private readonly asks = new Map<number, number>();

  /** Apply a level update. ``size <= 0`` removes the price level. */
  update(side: BookSide, price: number, size: number): void {
    const book = side === "bid" ? this.bids : this.asks;
    if (size <= 0) book.delete(price);
    else book.set(price, size);
  }

  bestBid(): Level | null {
    let best: Level | null = null;
    for (const [price, size] of this.bids) {
      if (best === null || price > best.price) best = { price, size };
    }
    return best;
  }

  bestAsk(): Level | null {
    let best: Level | null = null;
    for (const [price, size] of this.asks) {
      if (best === null || price < best.price) best = { price, size };
    }
    return best;
  }

  mid(): number | null {
    const b = this.bestBid();
    const a = this.bestAsk();
    return b && a ? (b.price + a.price) / 2 : null;
  }

  spread(): number | null {
    const b = this.bestBid();
    const a = this.bestAsk();
    return b && a ? a.price - b.price : null;
  }

  /** Top ``n`` levels of a side, best price first. */
  depth(side: BookSide, n: number): Level[] {
    const book = side === "bid" ? this.bids : this.asks;
    const levels: Level[] = [...book.entries()].map(([price, size]) => ({
      price,
      size,
    }));
    levels.sort((x, y) => (side === "bid" ? y.price - x.price : x.price - y.price));
    return levels.slice(0, n);
  }

  /**
   * Book imbalance over the top ``n`` levels:
   * (bidVolume − askVolume) / (bidVolume + askVolume), in [-1, 1].
   */
  imbalance(n = 1): number {
    const bidVol = this.depth("bid", n).reduce((s, l) => s + l.size, 0);
    const askVol = this.depth("ask", n).reduce((s, l) => s + l.size, 0);
    const denom = bidVol + askVol;
    return denom === 0 ? 0 : (bidVol - askVol) / denom;
  }
}
