"""The HTTP session the service clients share, built on urllib from the standard library."""

from __future__ import annotations

import json
import random
import time
import urllib.error
import urllib.request
from dataclasses import dataclass


class HTTPError(Exception):
    """The service answered with a status of 400 or more."""

    def __init__(self, status: int, url: str) -> None:
        super().__init__(f"{status} from {url}")
        self.status = status
        self.url = url


class TransportError(Exception):
    """No answer came back: the connection failed or timed out."""


@dataclass
class Response:
    status: int
    body: bytes

    def json(self):
        return json.loads(self.body)


@dataclass(frozen=True)
class Retry:
    """When a session sends a request again, after urllib3's Retry."""

    total: int = 3
    backoff_factor: float = 0.5
    backoff_max: float = 10.0
    status_forcelist: tuple[int, ...] = (502, 503, 504)

    def delay(self, retry_number: int) -> float:
        """A random wait up to the backoff, which doubles each time up to backoff_max."""
        return random.uniform(0, min(self.backoff_max, self.backoff_factor * 2 ** (retry_number - 1)))


def urllib_transport(method: str, url: str, timeout: float) -> Response:
    request = urllib.request.Request(url, method=method, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as reply:
            return Response(reply.status, reply.read())
    except urllib.error.HTTPError as exc:
        return Response(exc.code, exc.read())
    except (urllib.error.URLError, TimeoutError) as exc:
        raise TransportError(str(exc)) from exc


class Session:
    def __init__(self, retry: Retry | None = None, timeout: float = 2.0) -> None:
        self.retry = retry
        self.timeout = timeout
        self.transport = urllib_transport
        self.sleep = time.sleep

    def get(self, url: str) -> Response:
        retries = self.retry.total if self.retry else 0
        for retry_number in range(retries + 1):
            out_of_retries = retry_number == retries
            try:
                response = self.transport("GET", url, self.timeout)
            except TransportError:
                if out_of_retries:
                    raise
            else:
                if response.status < 400:
                    return response
                if out_of_retries or response.status not in self.retry.status_forcelist:
                    raise HTTPError(response.status, url)
            self.sleep(self.retry.delay(retry_number + 1))
        raise AssertionError("unreachable")


SESSION = Session(retry=Retry(total=3, backoff_factor=0.5, status_forcelist=(502, 503, 504)))
