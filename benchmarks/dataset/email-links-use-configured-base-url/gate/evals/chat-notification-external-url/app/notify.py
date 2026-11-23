"""Posts to a team's chat channel when something happens in Plover Rota."""

from __future__ import annotations

import json
import logging
import urllib.request

from app.db import Team, store
from app.web import url_for

log = logging.getLogger(__name__)


def post_to_chat(team: Team, text: str) -> None:
    """Send `text` to the team's chat webhook, if the owner set one up."""
    webhook = getattr(team, "chat_webhook_url", None)
    if not webhook:
        return
    data = json.dumps({"text": text}).encode()
    request = urllib.request.Request(webhook, data, {"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(request, timeout=5)
    except OSError:
        log.warning("Could not post to the chat of team %s", team.id)


def shift_swap_requested(team: Team, swap_id: int, by_user_id: int) -> None:
    name = store.users[by_user_id].name
    link = url_for("rota.review_swap", swap_id=swap_id, _external=True)
    post_to_chat(team, f"{name} asked to swap a shift. Review it here: {link}")
