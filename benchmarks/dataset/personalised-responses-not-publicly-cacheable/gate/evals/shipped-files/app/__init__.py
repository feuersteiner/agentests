"""The Ashgrove Games store."""

from __future__ import annotations

import os

from app import middleware
from app.cache import cache
from app.routes import account, store
from app.web import App, Request, Response


def healthz(request: Request) -> Response:
    return Response("ok", headers={"Content-Type": "text/plain"})


def create_app() -> App:
    app = App()
    middleware.register(app)
    store.register(app)
    account.register(app)
    app.route("/healthz")(healthz)
    if os.environ.get("REDIS_URL"):
        import redis

        cache.backend = redis.Redis.from_url(os.environ["REDIS_URL"], decode_responses=True)
    return app
