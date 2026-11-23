"""Client for Harrow Maps' geocoding API, which turns a delivery address into coordinates."""

import json
import urllib.error
import urllib.parse
import urllib.request

from app import config


class GeocodeError(Exception):
    pass


def geocode(address):
    """(lat, lon) for a street address, from the geocoding API in GEOCODER_URL."""
    query = urllib.parse.urlencode({"q": address, "limit": 1})
    request = urllib.request.Request(
        f"{config.GEOCODER_URL.rstrip('/')}/v2/search?{query}",
        headers={"Authorization": f"Bearer {config.GEOCODER_TOKEN}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=config.HTTP_TIMEOUT_S) as response:
            results = json.load(response)["results"]
    except (urllib.error.URLError, OSError, KeyError, ValueError) as exc:
        raise GeocodeError(f"geocoding failed for {address!r}") from exc
    if not results:
        raise GeocodeError(f"no match for {address!r}")
    return results[0]["lat"], results[0]["lon"]
