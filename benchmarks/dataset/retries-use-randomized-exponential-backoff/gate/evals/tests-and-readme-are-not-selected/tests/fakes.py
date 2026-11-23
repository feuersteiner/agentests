"""Stand-ins for the billing API, a webhook receiver, the Postgres driver and the Redis client."""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class FakeHttpServer:
    """An HTTP server on localhost that records every request.

    `fail_next(n, status)` answers the next n requests with that status instead, and
    `drop_next(n)` closes the next n connections without answering.
    """

    def __init__(self):
        self.requests = []
        self._failures = []
        server = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                server._handle(self)

            def do_POST(self):
                server._handle(self)

            def log_message(self, *args):
                pass

        self._httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self._httpd.server_port}"
        threading.Thread(target=self._httpd.serve_forever, args=(0.05,), daemon=True).start()

    def close(self):
        self._httpd.shutdown()
        self._httpd.server_close()

    def fail_next(self, count, status=503):
        self._failures.extend([status] * count)

    def drop_next(self, count):
        self._failures.extend([None] * count)

    def _handle(self, handler):
        length = int(handler.headers.get("Content-Length") or 0)
        raw = handler.rfile.read(length) if length else b""
        self.requests.append(
            {
                "method": handler.command,
                "path": handler.path,
                "headers": dict(handler.headers),
                "body": json.loads(raw) if raw else None,
                "raw": raw,
            }
        )
        if self._failures:
            status = self._failures.pop(0)
            if status is None:
                handler.close_connection = True
                return
            self._reply(handler, status, {"error": "unavailable"})
            return
        status, body = self.answer(handler.command, handler.path, self.requests[-1]["body"])
        self._reply(handler, status, body)

    def _reply(self, handler, status, body):
        content = b"" if body is None else json.dumps(body).encode()
        handler.send_response(status)
        handler.send_header("Content-Type", "application/json")
        handler.send_header("Content-Length", str(len(content)))
        handler.end_headers()
        handler.wfile.write(content)

    def answer(self, method, path, body):
        return 204, None


class FakeBillingApi(FakeHttpServer):
    """POST /invoices creates an invoice, once per idempotency key; GET /invoices/<id> reads one."""

    def __init__(self):
        self.invoices = {}
        self._by_key = {}
        super().__init__()

    def answer(self, method, path, body):
        if method == "POST" and path == "/invoices":
            if not body or body.get("amount_cents", 0) <= 0:
                return 400, {"error": "amount_cents must be positive"}
            key = body["idempotency_key"]
            if key not in self._by_key:
                invoice = {
                    "id": f"inv_{len(self.invoices) + 1}",
                    "customer": body["customer"],
                    "amount_cents": body["amount_cents"],
                    "status": "open",
                }
                self.invoices[invoice["id"]] = invoice
                self._by_key[key] = invoice
            return 201, self._by_key[key]
        if method == "GET" and path.startswith("/invoices/"):
            invoice = self.invoices.get(path.removeprefix("/invoices/"))
            return (200, invoice) if invoice else (404, {"error": "not found"})
        return 404, {"error": "not found"}


class FakeWebhookReceiver(FakeHttpServer):
    """Accepts every POST with 204 No Content."""


class FakeConnection:
    def __init__(self):
        self.executed = []
        self.commits = 0
        self.closed = False

    def execute(self, sql, params=()):
        self.executed.append((sql, params))

    def commit(self):
        self.commits += 1

    def close(self):
        self.closed = True


class FakeDriver:
    """Looks like psycopg. Refuses the first `refusals` connections with OperationalError."""

    class OperationalError(Exception):
        pass

    def __init__(self, refusals=0):
        self.refusals = refusals
        self.calls = []
        self.connections = []

    def connect(self, dsn, connect_timeout=None):
        self.calls.append((dsn, connect_timeout))
        if self.refusals > 0:
            self.refusals -= 1
            raise self.OperationalError("connection refused")
        connection = FakeConnection()
        self.connections.append(connection)
        return connection


class FakeRedis:
    """Looks like a redis client holding one list. After `drops_after` pops it raises ConnectionError."""

    def __init__(self, jobs=(), drops_after=None):
        self.items = [json.dumps(job) for job in jobs]
        self.drops_after = drops_after
        self.pops = 0

    def push(self, job):
        self.items.append(json.dumps(job))

    def brpop(self, keys, timeout=0):
        if self.drops_after is not None and self.pops >= self.drops_after:
            raise ConnectionError("Connection reset by peer")
        self.pops += 1
        if not self.items:
            return None
        return keys[0], self.items.pop(0)
