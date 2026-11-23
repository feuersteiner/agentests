"""The admin service's route table: each route maps a method and a path to a handler."""

import re

from admin import accounts, workspaces
from admin_api.http import NotFound

ACCOUNT = r"/admin/accounts/(?P<account_id>r-[0-9a-f]+)"
WORKSPACE = r"/admin/workspaces/(?P<workspace_id>r-[0-9a-f]+)"

ROUTES = [
    ("GET", ACCOUNT, accounts.show),
    ("POST", ACCOUNT + r"/extend-trial", accounts.extend_trial),
    ("DELETE", WORKSPACE, workspaces.delete),
]


def handle(method: str, path: str, body: dict | None = None) -> tuple[int, dict]:
    """Answer one request with a status and a JSON body; a resource the admin API lacks is a 404."""
    allowed = []
    for route_method, pattern, handler in ROUTES:
        match = re.fullmatch(pattern, path)
        if match is None:
            continue
        if route_method != method:
            allowed.append(route_method)
            continue
        try:
            return handler(body or {}, **match.groupdict())
        except NotFound:
            return 404, {"error": "not found"}
    if allowed:
        return 405, {"error": "method not allowed"}
    return 404, {"error": "not found"}
