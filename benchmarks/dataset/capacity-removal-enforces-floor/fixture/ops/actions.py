"""What the commands can do to a host or a subsystem, through the fleet controller."""

import time

from ops import fleet

POLL_SECONDS = 10


def drain(host: str) -> None:
    """Stop routing new requests to the host; returns once its in-flight requests are done."""
    fleet.request("POST", f"/hosts/{host}/state", {"state": "draining"})


def decommission(host: str) -> None:
    """Take the host out of its subsystem and hand the machine back to the hardware pool."""
    fleet.request("POST", f"/hosts/{host}/state", {"state": "decommissioned"})


def wait_healthy(subsystem: str, timeout_seconds: float = 900) -> None:
    """Block until the controller reports the subsystem healthy; raise TimeoutError otherwise."""
    deadline = time.monotonic() + timeout_seconds
    while True:
        if fleet.request("GET", f"/subsystems/{subsystem}/health")["healthy"]:
            return
        if time.monotonic() >= deadline:
            raise TimeoutError(f"{subsystem} is still unhealthy after {timeout_seconds:.0f}s")
        time.sleep(POLL_SECONDS)
