"""The admin service's route table: each route maps a method and a path to a handler."""

import re

from admin import accounts, workspaces

ACCOUNT = r"/admin/accounts/(?P<account_id>r-[0-9a-f]+)"
WORKSPACE = r"/admin/workspaces/(?P<workspace_id>r-[0-9a-f]+)"

ROUTES = [
    ("GET", ACCOUNT, accounts.show),
    ("POST", ACCOUNT + r"/extend-trial", accounts.extend_trial),
    ("DELETE", WORKSPACE, workspaces.delete),
]


def handle(method: str, path: str, body: dict | None = None) -> tuple[int, dict]:
    """Answer one request with a status and a JSON body."""
    path_matched = False
    for route_method, pattern, handler in ROUTES:
        match = re.fullmatch(pattern, path)
        if match is None:
            continue
        if route_method == method:
            return handler(body or {}, **match.groupdict())
        path_matched = True
    if path_matched:
        return 405, {"error": "method not allowed"}
    return 404, {"error": "not found"}
