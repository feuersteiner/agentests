"""Posts operational alerts to the team's Slack channel through its incoming webhook."""

import json
import logging
import urllib.request

from app import config

log = logging.getLogger(__name__)


def alert(text):
    """Send `text` to the #ops-alerts channel. Failures are logged, never raised."""
    if not config.SLACK_ALERTS_WEBHOOK_URL:
        return
    request = urllib.request.Request(
        config.SLACK_ALERTS_WEBHOOK_URL,
        data=json.dumps({"text": text}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            response.read()
    except OSError:
        log.warning("could not send the alert to Slack", exc_info=True)
