"""An in-memory cache server and connections to it, so the tests need no network."""

import asyncio
from collections import deque

from cache import CacheClient, Pool, ReplyError


class FakeCache:
    def __init__(self) -> None:
        self.data: dict[str, bytes] = {}
        self.ttls: dict[str, int] = {}
        # Keys whose GET is answered with an error reply, as when a key holds a list.
        self.wrong_type: set[str] = set()
        # Seconds the server takes to answer a GET of the key.
        self.delays: dict[str, float] = {}
        self.connections: list["FakeConnection"] = []

    async def connect(self) -> "FakeConnection":
        conn = FakeConnection(self)
        self.connections.append(conn)
        return conn

    def execute(self, args: tuple) -> tuple[float, object]:
        """The delay and the reply of one command."""
        command, *rest = [a.decode() if isinstance(a, bytes) else str(a) for a in args]
        if command == "GET":
            (key,) = rest
            if key in self.wrong_type:
                return 0.0, ReplyError("WRONGTYPE Operation against a key holding the wrong kind of value")
            return self.delays.get(key, 0.0), self.data.get(key)
        if command == "SET":
            key, value, *options = rest
            self.data[key] = value.encode()
            if options[:1] == ["EX"]:
                self.ttls[key] = int(options[1])
            return 0.0, "OK"
        if command == "DEL":
            (key,) = rest
            return 0.0, int(self.data.pop(key, None) is not None)
        return 0.0, ReplyError(f"ERR unknown command '{command}'")


class FakeConnection:
    def __init__(self, cache: FakeCache) -> None:
        self.cache = cache
        self.closed = False
        self.sent: list[tuple] = []
        self._replies: deque[tuple[float, object]] = deque()

    async def send(self, *args) -> None:
        if self.closed:
            raise ConnectionError("connection is closed")
        self.sent.append(args)
        delay, reply = self.cache.execute(args)
        self._replies.append((asyncio.get_running_loop().time() + delay, reply))

    async def read_reply(self):
        if self.closed:
            raise ConnectionError("connection is closed")
        if not self._replies:
            raise AssertionError("read_reply() called with no reply on the way")
        arrives_at, reply = self._replies[0]
        wait = arrives_at - asyncio.get_running_loop().time()
        if wait > 0:
            await asyncio.sleep(wait)
        self._replies.popleft()
        if isinstance(reply, ReplyError):
            raise reply
        return reply

    async def close(self) -> None:
        self.closed = True


def make_client(cache: FakeCache, max_size: int = 4) -> tuple[CacheClient, Pool]:
    pool = Pool(cache.connect, max_size=max_size)
    return CacheClient(pool), pool
