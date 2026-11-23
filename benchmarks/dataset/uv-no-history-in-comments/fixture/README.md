# csvtool

A small command-line tool the Larkfield operations team uses to clean the CSV exports of the
billing system and the CRM before they are loaded into the warehouse.

## Install

csvtool needs Python 3.9 or later and has no dependencies. Run it from a checkout:

```sh
python -m csvtool clean data/sample.csv cleaned.csv --key-column id --date-column created
```

## What `clean` does

1. Reads the input file. Short rows are padded to the width of the header.
2. Checks every non-empty cell of the date column and writes it back as `YYYY-MM-DD`.
3. Drops repeated rows: of the rows that share a key, the last one is kept.
4. Writes the result to the output file.

| Option          | Meaning                                    | Default |
| --------------- | ------------------------------------------ | ------- |
| `--key`         | the column that identifies a row           | `id`    |
| `--date-column` | a column of dates to check and normalise   | none    |

## Development

```sh
make test
```

The tests use pytest. Changes are listed in [CHANGELOG.md](CHANGELOG.md).
