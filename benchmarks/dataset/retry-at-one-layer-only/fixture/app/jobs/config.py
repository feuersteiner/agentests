"""Settings for the queue jobs."""

from dataclasses import dataclass


@dataclass(frozen=True)
class JobSettings:
    max_retries: int
    retry_delay_seconds: int


DEFAULTS = JobSettings(max_retries=5, retry_delay_seconds=60)

# When each job runs, as a cron expression in UTC.
SCHEDULE = {
    "stock-sync": "0 2 * * *",
}
