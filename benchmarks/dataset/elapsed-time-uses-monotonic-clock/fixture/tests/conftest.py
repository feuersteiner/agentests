import io

import pytest

from resolver.forwarder import Forwarder
from resolver.querylog import QueryLog
from resolver.ratelimit import RateLimiter
from resolver.upstreams import UpstreamPool
from tests.fakes import FakeTransport

UPSTREAMS = ["192.0.2.53", "198.51.100.53"]


@pytest.fixture
def transport():
    return FakeTransport()


@pytest.fixture
def pool():
    return UpstreamPool(UPSTREAMS)


@pytest.fixture
def log_buffer():
    return io.StringIO()


@pytest.fixture
def forwarder(transport, log_buffer):
    pool = UpstreamPool(UPSTREAMS[:1])
    return Forwarder(pool, transport, RateLimiter(50.0, 100), QueryLog(log_buffer), timeout_s=2.0)
