"""One TCP connection to the cache server, speaking its line protocol (a subset of RESP2)."""

import asyncio
import contextlib


class CacheError(Exception):
    """Base class of the errors this package raises."""


class ReplyError(CacheError):
    """The server answered a command with an error, such as WRONGTYPE."""


class ProtocolError(CacheError):
    """The server sent something that is not a valid reply."""


def encode_command(*args: str | bytes | int) -> bytes:
    """Encode one command as a RESP array of bulk strings."""
    parts = [f"*{len(args)}\r\n".encode()]
    for arg in args:
        if isinstance(arg, bytes):
            parts.append(b"$%d\r\n%s\r\n" % (len(arg), arg))
        else:
            data = str(arg).encode()
            parts.append(b"$%d\r\n%s\r\n" % (len(data), data))
    return b"".join(parts)


class Connection:
    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        self._reader = reader
        self._writer = writer

    @classmethod
    async def open(cls, host: str, port: int) -> "Connection":
        reader, writer = await asyncio.open_connection(host, port)
        return cls(reader, writer)

    @property
    def closed(self) -> bool:
        return self._writer.is_closing()

    async def send(self, *args: str | bytes | int) -> None:
        self._writer.write(encode_command(*args))
        await self._writer.drain()

    async def read_reply(self) -> str | int | bytes | None:
        """Read one reply: a status string, an integer, a bulk string, or None for a nil bulk string."""
        line = await self._reader.readline()
        if not line.endswith(b"\r\n"):
            raise ConnectionError("the cache server closed the connection")
        kind, rest = line[:1], line[1:-2]
        if kind == b"+":
            return rest.decode()
        if kind == b"-":
            raise ReplyError(rest.decode())
        if kind == b":":
            return int(rest)
        if kind == b"$":
            length = int(rest)
            if length == -1:
                return None
            data = await self._reader.readexactly(length + 2)
            return data[:-2]
        raise ProtocolError(f"unexpected reply type {kind!r}")

    async def close(self) -> None:
        self._writer.close()
        with contextlib.suppress(ConnectionError):
            await self._writer.wait_closed()
