# brindle-ingest

The ingest worker of the Brindle data team. It copies events from the Brindle Metrics API into our
own store, stores the row files that customers upload, and starts export jobs on the API.

It needs Python 3.9 or later and nothing outside the standard library.

## Layout

- `ingest/config.py`: settings.
- `ingest/client.py`: `ApiClient`, the HTTP client for the Metrics API.
- `ingest/models.py`: the `Event` record.
- `ingest/store.py`: `Store`, a small SQLite store.
- `ingest/worker.py`: `Worker`, which does the work: syncing events, storing uploads, exports.
- `ingest/web.py`: the handler behind `POST /uploads`.
- `ingest/util.py`: small helpers.

## Usage

```python
from ingest.client import ApiClient
from ingest.store import Store
from ingest.worker import Worker

worker = Worker(ApiClient(token="..."), Store("ingest.db"))
```

## Tests

The tests run against a fake Metrics API, `tests/fake_api.py`, served on a local port.

```sh
python3 -m pytest
```
