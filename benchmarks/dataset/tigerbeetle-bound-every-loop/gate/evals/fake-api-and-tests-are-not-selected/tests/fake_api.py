"""A fake Brindle Metrics API on a local port, for the tests."""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse


class FakeApi:
    """Serves /events, /exports and /files from the attributes set on it.

    events: the event items /events pages through.
    export_file: the bytes of the file an export produces.
    polls_until_done: how many times /exports/<id> answers "running" before "done".
    export_fails: when True, the export ends as "failed" instead of "done".
    requests: every request received, as (method, path).
    """

    def __init__(self):
        self.events = []
        self.export_file = b"id,kind\n"
        self.polls_until_done = 0
        self.export_fails = False
        self.requests = []
        self._failures = []
        self._polls = 0
        self._server = ThreadingHTTPServer(("127.0.0.1", 0), self._handler())
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)

    @property
    def url(self):
        return f"http://127.0.0.1:{self._server.server_port}"

    def start(self):
        self._thread.start()

    def stop(self):
        self._server.shutdown()
        self._server.server_close()

    def fail_next(self, count, status=503):
        """Answer the next `count` requests with `status` instead of serving them."""
        self._failures = [status] * count

    def _handler(api):
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def _send(self, status, payload):
                body = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
                self.send_response(status)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def _serve(self, method):
                url = urlparse(self.path)
                api.requests.append((method, url.path))
                length = int(self.headers.get("Content-Length") or 0)
                if length:
                    self.rfile.read(length)
                if api._failures:
                    return self._send(api._failures.pop(), {"error": "unavailable"})
                if method == "GET" and url.path == "/events":
                    return self._send(200, api._page(parse_qs(url.query)))
                if method == "POST" and url.path == "/exports":
                    api._polls = 0
                    return self._send(202, {"id": "exp-1"})
                if method == "GET" and url.path == "/exports/exp-1":
                    return self._send(200, api._status())
                if method == "GET" and url.path == "/files/exp-1.csv":
                    return self._send(200, api.export_file)
                return self._send(404, {"error": "not found"})

            def do_GET(self):
                self._serve("GET")

            def do_POST(self):
                self._serve("POST")

        return Handler

    def _page(self, query):
        start = int(query.get("cursor", ["0"])[0])
        end = start + int(query.get("limit", ["100"])[0])
        return {
            "events": self.events[start:end],
            "next": str(end) if end < len(self.events) else None,
        }

    def _status(self):
        self._polls += 1
        if self._polls <= self.polls_until_done:
            return {"status": "running"}
        if self.export_fails:
            return {"status": "failed"}
        return {"status": "done", "file": "/files/exp-1.csv"}
