import json

import pytest

from uploader.transport import Response


class FakeClock:
    """A monotonic clock that only moves when a test or the fake Depot moves it."""

    def __init__(self):
        self.now_s = 1000.0
        self.sleeps_s = []

    def __call__(self):
        return self.now_s

    def sleep(self, duration_s):
        self.sleeps_s.append(duration_s)
        self.now_s += duration_s


class FakeDepot:
    """Stands in for HttpTransport: answers like Depot and records every request."""

    def __init__(self, clock):
        self.clock = clock
        self.request_ms = 0
        self.requests = []
        self.chunk_answers = {}
        self.uploads = 0

    def fail_chunk(self, index, *statuses):
        """Answer the next requests for chunk `index` with these statuses, then 200."""
        self.chunk_answers[index] = list(statuses)

    def request(self, method, path, body, timeout_s, headers=None):
        self.clock.now_s += self.request_ms / 1000
        self.requests.append({"method": method, "path": path, "body": body, "headers": headers or {}})
        if method == "POST" and path.startswith("/uploads?"):
            self.uploads += 1
            return Response(201, json.dumps({"upload_id": f"u{self.uploads}"}).encode())
        if method == "PUT" and "/chunks/" in path:
            answers = self.chunk_answers.get(int(path.rsplit("/", 1)[1]))
            if answers:
                return Response(answers.pop(0), b"")
            return Response(200, b"")
        if method == "POST" and path.endswith("/complete"):
            return Response(200, b"")
        return Response(404, b"no such route")

    def chunk_puts(self):
        return [r for r in self.requests if r["method"] == "PUT"]


@pytest.fixture
def clock():
    return FakeClock()


@pytest.fixture
def depot(clock):
    return FakeDepot(clock)


@pytest.fixture
def make_file(tmp_path):
    def make(name, size_bytes):
        path = tmp_path / name
        path.write_bytes(b"x" * size_bytes)
        return path

    return make
