"""The in-process job queue: functions register as jobs with @job, and run_job runs one."""

from __future__ import annotations

import logging
import time
from typing import Callable

from app.jobs.config import DEFAULTS

log = logging.getLogger(__name__)

JOBS: dict[str, Callable[[], object]] = {}


def job(name: str):
    def register(func):
        JOBS[name] = func
        return func

    return register


def run_job(name: str, sleep: Callable[[float], None] = time.sleep):
    func = JOBS[name]
    for run in range(DEFAULTS.max_retries + 1):
        try:
            return func()
        except Exception:
            if run == DEFAULTS.max_retries:
                log.exception("job %s failed for good after %d runs", name, run + 1)
                raise
            log.warning("job %s failed, running it again", name, exc_info=True)
            sleep(DEFAULTS.retry_delay_seconds)
