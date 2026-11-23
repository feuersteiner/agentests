"""The enactor's loop: apply the newest plan, then wait for the next interval."""

import logging
import time

from enactor import apply

log = logging.getLogger("enactor")


def run_once() -> int | None:
    """Apply the newest plan once and return its generation."""
    gen = apply.apply_latest_plan()
    if gen is None:
        log.info("no plan to apply yet")
    else:
        log.info("applied plan %s", gen)
    return gen


def run_forever(interval_seconds: float) -> None:
    """Apply the newest plan every `interval_seconds` until the process is stopped."""
    while True:
        try:
            run_once()
        except Exception:
            log.exception("applying the newest plan failed")
        time.sleep(interval_seconds)
