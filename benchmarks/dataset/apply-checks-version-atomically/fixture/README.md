# zone-enactor

The enactor of Fernhill's DNS management. The planner, which lives in another repository, writes a
new plan for Fernhill's public endpoints into the plan database every few minutes. The enactor
applies the newest plan to the endpoints: it records which plan each endpoint serves and pushes the
endpoint's addresses to the DNS provider.

It is plain Python 3 on SQLite, with no dependencies outside the standard library.

## Layout

- `enactor/store.py`: the plan database: the schema, `transaction()` and the read queries.
  - `plans`: one row per plan. `gen` is its generation, one higher than the plan before it, and
    `records` maps each endpoint's name to its addresses, as JSON.
  - `endpoints`: one row per endpoint. `plan_gen` is the generation of the plan whose addresses it
    serves, 0 before its first plan.
- `enactor/apply.py`: applying the newest plan, `apply_latest_plan()`. Not written yet.
- `enactor/dns.py`: pushing an endpoint's addresses to the DNS provider, with retries.
- `enactor/loop.py`: the loop that applies the newest plan once per interval.
- `enactor/config.py`: the settings, read from the environment.
- `enactor/__main__.py`: the command line.
- `tests/`: the pytest suite. Each test gets a fresh in-memory database with three endpoints and a
  fake DNS provider, from `tests/conftest.py`.

## Running

```sh
ENACTOR_DNS_URL=https://dns.internal.fernhill.example/v2 ENACTOR_DNS_TOKEN=... python -m enactor.main
```

`--once` applies the newest plan once and exits.

| Variable            | Default           | Meaning                                    |
| ------------------- | ----------------- | ------------------------------------------ |
| `ENACTOR_DB`        | `enactor.sqlite3` | The plan database's file                   |
| `ENACTOR_DNS_URL`   | required          | The DNS provider's API                     |
| `ENACTOR_DNS_TOKEN` | required          | The token the enactor sends to the provider |

## Tests

```sh
python3 -m pytest
```
