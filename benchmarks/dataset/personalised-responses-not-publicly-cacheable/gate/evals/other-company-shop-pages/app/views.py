"""Fernway Bikes: the public pages of our physical shops and the price list for dealers' sites.
Every page here is the same for every visitor, in English only."""

from __future__ import annotations

import json

from app.http import Request, Response, route
from app.shops import SHOPS, price_list

ONE_HOUR = 3600


@route("/stores")
def stores(request: Request) -> Response:
    rows = "".join(f"<li><a href='/stores/{s.slug}'>{s.city}</a></li>" for s in SHOPS.values())
    response = Response(f"<h1>Our shops</h1><ul>{rows}</ul>")
    response.headers["Cache-Control"] = f"public, max-age={ONE_HOUR}"
    return response


@route("/stores/<slug>")
def store(request: Request, slug: str) -> Response:
    shop = SHOPS[slug]
    response = Response(f"<h1>{shop.city}</h1><p>{shop.address}</p><p>Open {shop.hours}</p>")
    response.headers["Cache-Control"] = f"public, max-age={ONE_HOUR}"
    return response


@route("/api/prices")
def prices(request: Request) -> Response:
    response = Response(json.dumps(price_list()), headers={"Content-Type": "application/json"})
    response.headers["Cache-Control"] = "public, max-age=600"
    return response
