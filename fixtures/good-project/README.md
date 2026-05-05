# quickstat

A zero-config CLI that generates real-time statistics summaries for JSON datasets. Feed it a file, get instant insights.

![demo screenshot](./assets/demo.png)

## Features

- Parse JSON arrays of any shape automatically
- Compute count, min, max, mean, median, and standard deviation
- Detect outliers using the IQR method
- Export results as CSV, JSON, or plain text
- Works with stdin for pipe-friendly workflows

## Why quickstat?

When you're exploring a new dataset you don't always want to spin up a Jupyter notebook or import pandas. quickstat gives you the 80% answer in 5 seconds from the terminal.

## Quick Start

```bash
npx quickstat data.json
```

Or install globally:

```bash
npm install -g quickstat
```

## Usage

```bash
# Basic summary
quickstat data.json

# Pipe from stdin
cat data.json | quickstat

# Export as CSV
quickstat data.json --output csv > summary.csv

# Focus on specific fields
quickstat data.json --fields price,quantity
```

## Example Output

```text
quickstat v0.1.0 — data.json (1,240 rows)

Field     Count   Min     Max     Mean    Median  Std Dev
--------- ------- ------- ------- ------- ------- -------
price     1240    1.99    499.00  42.18   29.99   58.34
quantity  1240    1       500     23.4    12      41.2
rating    1238    1.0     5.0     3.87    4.0     0.94

Outliers detected: price (3), quantity (8)
```

## Installation

```bash
npm install -g quickstat
# or
npx quickstat
```

## Limitations

- Only supports flat JSON arrays (no nested objects)
- Numeric fields only for statistics (string fields are counted)
- Files larger than 500MB may be slow
- No support for CSV input yet (planned in v0.2.0)

## Roadmap

- v0.2.0: CSV input support
- v0.2.0: Histogram visualization in terminal
- v0.3.0: Streaming support for very large files
- v0.4.0: Correlation matrix

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to set up the development environment and submit pull requests.

## License

MIT — see [LICENSE](./LICENSE)
