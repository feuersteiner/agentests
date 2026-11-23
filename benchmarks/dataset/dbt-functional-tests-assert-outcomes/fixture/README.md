# minietl

The Tidewater data team's loader. It copies new rows from a raw table into a reporting table in
the same SQLite database, a little at a time: each run picks up the source rows that changed since
the last one.

```sh
python3 -m minietl run orders --db warehouse.db
python3 -m minietl run page_views --db warehouse.db --strategy append
```

## Usage

`minietl run MODEL --db PATH [--strategy STRATEGY] [-v]`

- `MODEL`: a model from `minietl/models.py`, such as `orders`.
- `--db PATH`: the SQLite database that holds the raw table and the reporting table.
- `--strategy STRATEGY`: how new rows reach the reporting table, see below.
- `-v`: log each SQL statement as it runs.

From Python:

```python
import sqlite3
from minietl.runner import run

db = sqlite3.connect("warehouse.db")
run(db, "orders")
```

## Strategies

- `append`, the default: inserts the source rows newer than the newest row in the reporting table.
- `delete+insert`: deletes the reporting rows whose key has newer source rows, then inserts those
  source rows.

[docs/strategies.md](docs/strategies.md) describes each one, and [CHANGELOG.md](CHANGELOG.md)
lists what changed in each release.

## Layout

- `minietl/models.py`: the models, each a reporting table and the raw table it loads from.
- `minietl/sqlgen.py`: builds the SQL of each strategy.
- `minietl/runner.py`: runs a model against a database.
- `minietl/cli.py`: the command line.
- `tests/unit/`: tests of the SQL builder and the models, without a database.
- `tests/functional/`: tests that run models against a temporary SQLite database.

## Tests

```sh
python3 -m pytest
```
