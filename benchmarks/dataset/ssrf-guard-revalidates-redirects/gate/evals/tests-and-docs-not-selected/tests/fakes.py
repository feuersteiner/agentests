"""Fake websites for the tests, served by a local HTTP server so that no test touches the network.

The `web` fixture in conftest.py starts one and points name lookups and connections for its
hosts at it. Pages are served over plain HTTP, so register http:// URLs.
"""

import http.server
import ipaddress
import socket
import threading
import urllib.parse
from dataclasses import dataclass, field

_real_getaddrinfo = socket.getaddrinfo
_real_create_connection = socket.create_connection


@dataclass
class Received:
    method: str
    url: str
    headers: dict
    body: bytes


@dataclass
class _Reply:
    status: int
    body: bytes
    headers: dict = field(default_factory=dict)


class FakeWeb:
    def __init__(self):
        self.requests = []  # every request the server received, as Received
        self._replies = {}  # (host, path and query) -> _Reply
        self._addresses = {}  # host -> the address it resolves to
        self._lock = threading.Lock()
        fake = self

        class Handler(http.server.BaseHTTPRequestHandler):
            def _answer(self):
                length = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(length) if length else b""
                host = (self.headers.get("Host") or "").split(":")[0].lower()
                with fake._lock:
                    fake.requests.append(
                        Received(self.command, f"http://{host}{self.path}", dict(self.headers), body)
                    )
                    reply = fake._replies.get((host, self.path), _Reply(404, b"not found"))
                self.send_response(reply.status)
                for name, value in reply.headers.items():
                    self.send_header(name, value)
                self.send_header("Content-Length", str(len(reply.body)))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(reply.body)

            do_GET = do_POST = do_PUT = do_HEAD = _answer

            def log_message(self, *args):
                pass

        self._server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self._thread = threading.Thread(
            target=self._server.serve_forever, args=(0.05,), daemon=True
        )
        self._thread.start()

    def close(self):
        self._server.shutdown()
        self._server.server_close()

    def host(self, name, address):
        """Make `name` resolve to `address`, for example a private address such as 10.0.0.7."""
        self._addresses[name.lower()] = address

    def page(self, url, body="", status=200, content_type="text/html; charset=utf-8", headers=None):
        """Answer requests for `url` with this status, body and any extra headers."""
        parts = urllib.parse.urlsplit(url)
        host = parts.hostname
        if host not in self._addresses:
            self.host(host, f"93.184.215.{len(self._addresses) + 10}")
        target = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
        data = body.encode() if isinstance(body, str) else body
        self._replies[(host, target)] = _Reply(
            status, data, {"Content-Type": content_type, **(headers or {})}
        )

    def requests_to(self, host):
        """The requests the server received for `host`."""
        return [r for r in self.requests if urllib.parse.urlsplit(r.url).hostname == host]

    # The two functions below replace socket.getaddrinfo and socket.create_connection in tests.

    def getaddrinfo(self, host, port, *args, **kwargs):
        name = host.decode() if isinstance(host, bytes) else host
        if name and name.lower() in self._addresses:
            address = self._addresses[name.lower()]
            family = socket.AF_INET6 if ":" in address else socket.AF_INET
            return [(family, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", (address, port or 0))]
        if name in (None, "localhost") or _is_address(name):
            return _real_getaddrinfo(host, port, *args, **kwargs)
        raise socket.gaierror(socket.EAI_NONAME, f"{name} is not a host of the fake web")

    def create_connection(self, address, timeout=socket._GLOBAL_DEFAULT_TIMEOUT, *args, **kwargs):
        host, port = address[0], address[1]
        name = host.lower()
        if name in self._addresses:
            peer = self._addresses[name]
        elif host in self._addresses.values():
            peer = host
        else:
            raise ConnectionRefusedError(f"the tests have no network: cannot reach {host}")
        sock = _real_create_connection(self._server.server_address, timeout)
        return _Connected(sock, (peer, port))


class _Connected:
    """A connection to the fake server that reports the fake site's address as its peer."""

    def __init__(self, sock, peer):
        self._sock = sock
        self._peer = peer

    def getpeername(self):
        return self._peer

    def __getattr__(self, name):
        return getattr(self._sock, name)


def _is_address(value):
    try:
        ipaddress.ip_address(value)
    except ValueError:
        return False
    return True
