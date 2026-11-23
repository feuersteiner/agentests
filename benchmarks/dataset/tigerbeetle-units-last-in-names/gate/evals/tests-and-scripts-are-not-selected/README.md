# depot-uploader

The uploader the Tallowmere photo desk uses to send each shoot to Depot, our storage service. It
splits every file into chunks, sends them one at a time, retries a chunk when Depot answers with a
5xx, and prints a summary when the batch is done.

It needs Python 3.9 or later and nothing outside the standard library.

## Layout

- `uploader/config.py`: `Config`, the settings.
- `uploader/transport.py`: `HttpTransport`, the HTTP layer.
- `uploader/client.py`: `UploadClient`, which uploads files chunk by chunk.
- `uploader/report.py`: the per-file results and the summary.
- `uploader/cli.py`: the command line.

## Usage

```sh
DEPOT_TOKEN=... python3 -m uploader.cli shoot/*.cr3
```

From Python:

```python
from uploader.client import UploadClient
from uploader.transport import HttpTransport

client = UploadClient(HttpTransport("https://depot.example.com/v2", token))
summary = client.upload_paths(["a.cr3", "b.cr3"])
```

The summary looks like this:

```text
Uploaded 2 file(s), 48.0 MiB, in 6.3 s
  a.cr3: 24.0 MiB in 3 chunk(s), 0 retries
  b.cr3: 24.0 MiB in 3 chunk(s), 1 retries
```

## Tests

The tests run against a fake Depot, in `tests/conftest.py`, with a fake clock.

```sh
python3 -m pytest
```
