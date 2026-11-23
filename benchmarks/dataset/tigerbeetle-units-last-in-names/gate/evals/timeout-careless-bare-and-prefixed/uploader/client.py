"""Sends files to Depot in chunks, retrying a chunk when Depot answers with a 5xx."""

import json
import time
from pathlib import Path

from uploader.config import Config
from uploader.report import FileResult, Summary


class UploadError(Exception):
    """An upload that Depot did not accept."""


class UploadClient:
    def __init__(self, transport, config: Config = Config(), clock=time.monotonic, sleep=time.sleep):
        self.transport = transport
        self.config = config
        self.clock = clock
        self.sleep = sleep

    def upload_files(self, paths) -> Summary:
        started_s = self.clock()
        results = [self.upload_file(Path(path)) for path in paths]
        return Summary(files=results, duration_s=self.clock() - started_s)

    def upload_file(self, path: Path) -> FileResult:
        file_bytes = path.stat().st_size
        if file_bytes > self.config.max_file_size:
            raise UploadError(f"{path.name}: file is larger than 5 GB")
        start = self.clock()
        response = self._request(path.name, "POST", f"/uploads?name={path.name}", b"")
        upload_id = json.loads(response.body)["upload_id"]
        chunks = 0
        retries = 0
        with path.open("rb") as file:
            for index, chunk in enumerate(iter(lambda: file.read(self.config.chunk_bytes), b"")):
                elapsed = self.clock() - start
                if elapsed > self.config.upload_timeout:
                    raise UploadError(f"{path.name}: upload took longer than 2 minutes")
                retries += self._put_chunk(path.name, upload_id, index, chunk)
                chunks += 1
        # Depot only assembles the file once it is told no more chunks are coming.
        self._request(path.name, "POST", f"/uploads/{upload_id}/complete", b"")
        return FileResult(name=path.name, file_bytes=file_bytes, chunks=chunks, retries=retries)

    def _put_chunk(self, name: str, upload_id: str, index: int, chunk: bytes) -> int:
        """Sends one chunk and returns how many retries it needed."""
        delay_ms = 250
        for attempt in range(self.config.retries_max + 1):
            response = self.transport.request(
                "PUT", f"/uploads/{upload_id}/chunks/{index}", chunk, self.config.request_timeout_s
            )
            if response.status < 500 or attempt == self.config.retries_max:
                break
            self.sleep(delay_ms / 1000)
            delay_ms = min(delay_ms * 2, self.config.retry_delay_ms_max)
        if response.status >= 300:
            raise UploadError(f"{name}: chunk upload failed with HTTP {response.status}")
        return attempt

    def _request(self, name: str, method: str, path: str, body: bytes):
        response = self.transport.request(method, path, body, self.config.request_timeout_s)
        if response.status >= 300:
            raise UploadError(f"{name}: upload failed with HTTP {response.status}")
        return response
