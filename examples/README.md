# Examples

Self-contained, runnable tours of the library. Each script generates a small
**deterministic** synthetic dataset (a seeded MINSTD stream — no external data,
no dependencies) and runs a spread of metrics across the library, from order
flow to realized moments.

## Run

TypeScript / Node 22+:

```bash
node --experimental-strip-types examples/quickstart.ts
```

Python 3.9+ (after `pip install orderflow-metrics`, or `pip install -e python`
from a clone):

```bash
python examples/quickstart.py
```

## Expected output

Both scripts use the same seeded stream, so they print the **same numbers** —
a quick demonstration that the TypeScript and Python ports agree:

```
OFI:                   9
Trade imbalance:       -0.0323
VPIN (flow toxicity):  0.5378
Corwin-Schultz spread: 0.00442
Abdi-Ranaldo spread:   0.00223
Parkinson vol:         0.00730
Yang-Zhang vol:        0.00800
Realized vol:          0.03278
Realized skewness:     -0.0153
Realized kurtosis:     1.8886
Variance ratio (q=4):  0.7549
Hurst exponent:        0.2899
```

What the tour touches, by family:

- **Order flow** — `ofi`, `tradeImbalance`, `vpin` (via `bucketByVolume`)
- **Spread (from OHLC)** — `corwinSchultz`, `abdiRanaldo`
- **Volatility & risk** — `parkinsonVolatility`, `yangZhangVolatility`, `realizedVolatility`, `realizedSkewness`, `realizedKurtosis`
- **Market efficiency** — `varianceRatio`, `hurstExponent`

See the [main README](../README.md) for the full metric catalogue.
