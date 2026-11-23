import asyncio

import pytest

from cache.connection import Connection, ProtocolError, ReplyError, encode_command


def test_encode_command_ascii():
    assert encode_command("GET", "profile:7") == b"*2\r\n$3\r\nGET\r\n$9\r\nprofile:7\r\n"


def test_encode_command_bytes_and_ints():
    assert encode_command("SET", "k", b"v1", "EX", 600) == (
        b"*5\r\n$3\r\nSET\r\n$1\r\nk\r\n$2\r\nv1\r\n$2\r\nEX\r\n$3\r\n600\r\n"
    )


class _Writer:
    def __init__(self) -> None:
        self.written = b""
        self._closing = False

    def write(self, data: bytes) -> None:
        self.written += data

    async def drain(self) -> None:
        pass

    def is_closing(self) -> bool:
        return self._closing

    def close(self) -> None:
        self._closing = True

    async def wait_closed(self) -> None:
        pass


def _connection(server_bytes: bytes) -> tuple[Connection, _Writer]:
    reader = asyncio.StreamReader()
    reader.feed_data(server_bytes)
    reader.feed_eof()
    writer = _Writer()
    return Connection(reader, writer), writer


def _replies(server_bytes: bytes, count: int) -> list:
    async def main():
        conn, _ = _connection(server_bytes)
        return [await conn.read_reply() for _ in range(count)]

    return asyncio.run(main())


def test_reads_each_kind_of_reply():
    data = b"+OK\r\n:3\r\n$5\r\nhello\r\n$-1\r\n"
    assert _replies(data, 4) == ["OK", 3, b"hello", None]


def test_error_reply_raises_reply_error():
    with pytest.raises(ReplyError, match="WRONGTYPE"):
        _replies(b"-WRONGTYPE wrong kind of value\r\n", 1)


def test_unknown_reply_type_raises_protocol_error():
    with pytest.raises(ProtocolError):
        _replies(b"?what\r\n", 1)


def test_closed_by_server_raises_connection_error():
    with pytest.raises(ConnectionError):
        _replies(b"", 1)


def test_send_writes_the_encoded_command():
    async def main():
        conn, writer = _connection(b"")
        await conn.send("DEL", "profile:7")
        return writer.written

    assert asyncio.run(main()) == b"*2\r\n$3\r\nDEL\r\n$9\r\nprofile:7\r\n"
