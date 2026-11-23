"""Keeps the upstreams' smoothed RTTs across restarts.

The server saves them to a JSON file when it stops and loads them when it
starts, so a restarted forwarder still knows which upstream is fastest. The
older the file, the more the saved RTTs fade back toward INITIAL_RTT_S.
"""

import json
import time
from collections.abc import Iterable

from .upstreams import Upstream

INITIAL_RTT_S = 0.050
HALF_LIFE_S = 600.0  # a saved RTT counts half as much after ten minutes


def save(path: str, upstreams: Iterable[Upstream]) -> None:
    data = {
        "saved_at": time.time(),  # Unix time: the file outlives this process
        "srtt_s": {u.label: u.srtt_s for u in upstreams if u.srtt_s is not None},
    }
    with open(path, "w", encoding="utf-8") as out:
        json.dump(data, out)


def load(path: str, upstreams: Iterable[Upstream]) -> None:
    with open(path, encoding="utf-8") as src:
        data = json.load(src)
    # The wall clock may have stepped back since the file was written.
    age_s = max(0.0, time.time() - data["saved_at"])
    keep = 0.5 ** (age_s / HALF_LIFE_S)
    for upstream in upstreams:
        saved_s = data["srtt_s"].get(upstream.label)
        if saved_s is not None:
            upstream.srtt_s = INITIAL_RTT_S + (saved_s - INITIAL_RTT_S) * keep
