"""The admin service's route table: each route maps a method and a path to a handler."""

import re

from admin import accounts

ACCOUNT = r"/admin/accounts/(?P<account_id>r-[0-9a-f]+)"

ROUTES = [
    ("GET", ACCOUNT, accounts.show),
    ("POST", ACCOUNT + r"/extend-trial", accounts.extend_trial),
]


def handle(method: str, path: str, body: dict | None = None) -> tuple[int, dict]:
    """Answer one request with a status and a JSON body."""
    for route_method, pattern, handler in ROUTES:
        match = re.fullmatch(pattern, path)
        if match and route_method == method:
            return handler(body or {}, **match.groupdict())
    return 404, {"error": "not found"}
