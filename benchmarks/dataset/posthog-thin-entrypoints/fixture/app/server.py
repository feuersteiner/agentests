"""The WSGI app: python -m app.server"""

import json
from urllib.parse import parse_qsl
from wsgiref.simple_server import make_server

from app.db import connect
from app.http import Request, Router
from app.views import carts, orders

router = Router()
router.include(orders.router)
router.include(carts.router)

REASONS = {200: "OK", 201: "Created", 400: "Bad Request", 404: "Not Found", 409: "Conflict"}


def wsgi_app(environ, start_response):
    length = int(environ.get("CONTENT_LENGTH") or 0)
    raw = environ["wsgi.input"].read(length) if length else b""
    request = Request(
        method=environ["REQUEST_METHOD"],
        path=environ.get("PATH_INFO", "/"),
        query=dict(parse_qsl(environ.get("QUERY_STRING", ""))),
        json=json.loads(raw) if raw else None,
    )
    db = connect()
    try:
        response = router.dispatch(request, db)
    finally:
        db.close()
    payload = json.dumps(response.body).encode()
    status = f"{response.status} {REASONS.get(response.status, 'Error')}"
    start_response(status, [("Content-Type", "application/json"), ("Content-Length", str(len(payload)))])
    return [payload]


def main() -> None:
    with make_server("127.0.0.1", 8000, wsgi_app) as server:
        print("Serving on http://127.0.0.1:8000")
        server.serve_forever()


if __name__ == "__main__":
    main()
